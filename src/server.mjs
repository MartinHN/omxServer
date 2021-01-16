import {loadConf,saveConf,setBaseDir} from "./persistent.mjs"
import {runOSCServer} from './OSCAPIBinder.mjs'
import {createRemoteInstanceFromSchema} from './API.mjs'
// import * as Sensor from './Sensor.mjs'
import rootNode from './rootNode.mjs'
import http from 'http'
import {readFileSync,existsSync} from 'fs'
import { execSync } from "child_process"
import WebSocket  from "ws";
import osc from 'osc'
import EndpointWatcher from './EndpointWatcher.mjs'
import masterLogic from './MasterLogic.mjs'

const proc =  execSync("uname -a").toString()
const isPi = proc.includes("armv7")
const thisPath = isPi?"/home/pi/omxServer":"/home/tinmar/Work/mili/omxServer" 
setBaseDir(thisPath)
const isMaster = isPi ?existsSync("/boot/isMaster"):false
console.log('starting as ',isMaster?'master':'slave')
EndpointWatcher.on("added",ep=>{
    // ep.on("message",msg=>{
    //     const newAddr = [ep.name,...msg.address]
    //     console.log('newAddr',newAddr)
    //     rootNode.processMsgFromListener(ep,newAddr,msg.args)
    // })
    ep.instanceName = 'ep_'+ep.name// to trach listener loops
})

EndpointWatcher.on("removed",ep=>{
    console.error("endpoint removed",ep.name)
    delete rootNode[ep.name]
    broadcastToWebClis("/schema",JSON.stringify(rootNode.getJSONSchema()));
    broadcastToWebClis("/state",JSON.stringify(rootNode.getState()));
})

EndpointWatcher.on("schema",e=>{
    if(isMaster){
        console.log("auto adding schema",e.ep.name)
        const nI= createRemoteInstanceFromSchema(e.ep.type,e.schema,true,msg=>{
            if(msg.from!=e.ep){
                console.log('sending back to ep ',e.ep.name,msg.address)
                e.ep.send('/'+msg.address.join('/'),msg.args)}
            })
            
            if(e.ep.type=="eye"){
                nI.api.addStream("mat","pixels",{width:8,height:8})
                nI.api.addStream("presence","b")
                nI.api.addStream("presenceSize","i")
                
            }
            e.ep.on("message" , msg=>{
                if(msg.fromMulticast)
                msg.args.shift()// remove uuid
                rootNode.processMsgFromListener(e.ep,[e.ep.name,...msg.address],msg.args);
                
            })
            rootNode.addChild(e.ep.name,nI);
        }
        broadcastToWebClis("/schema",JSON.stringify(rootNode.getJSONSchema()));
    })
    EndpointWatcher.on("state",e=>{
        console.log('rcvd state',e.ep.name,e.state)
        const s = e.state;
        const eI = rootNode.childs[e.ep.name]
        if(eI){
            eI.restoreState(s)
        }
        else{
            console.error("no node for state",e.ep.name)
        }
        broadcastToWebClis("/state",JSON.stringify(rootNode.getState()));
    })
    EndpointWatcher.on("endpointMsg",e=>{
        // if(!e.ep.name)return;
        //     const strName = msg.address.substr(1);
        //     if(strName in eyeAPI.api.__streams){
        //         msg.args.shift()// remove uuid
        //         // if(msg.address!="/mat")
        //         // console.log("passing stream",msg.address,msg.args)
        //         rootNode.evts.emit('stateChanged',{address:['eye',strName],args:msg.args,isStream:true})
        //     }
        //     else
        //     console.log("Sensor unknown osc",msg)
    })
    EndpointWatcher.setup()
    
    
    /// Sensor specifiv
    
    const lastConf  = loadConf();
    
    // conf.volume=1
    // console.log('conf',conf);
    rootNode.restoreState(lastConf)
    const nConf = rootNode.getState()
    // console.log('new conf', nConf)
    // saveConf(nConf);
    
    // OSC
    
    runOSCServer(rootNode,isMaster);
    
    
    // http
    
    const publicPath  = thisPath+"/public"
    const requestListener = function (req, res) {
        
        if(req.url == "/"){
            res.writeHead(200);
            res.end(readFileSync(publicPath+"/index.html").toString())
        }
        else if(req.url.startsWith("/js/")){
            res.writeHead(200);
            const jsLib = readFileSync(publicPath+req.url).toString()
            // console.log(jsLib)
            res.end(jsLib)
        }
        // else if(req.url == ("/jsSchema")){
        //     res.writeHead(200);
        //     const jsS = JSON.stringify({
        //         schema:rootNode.getJSONSchema(),
        //         state:rootNode.getState(),
        //     })
        //     res.end(`const jsSchema =${jsS}`)
        // }
        else if(req.url == ("/wsConf")){
            res.writeHead(200);
            const jsS = JSON.stringify({
                ip:"rpi.local",
                port:httpPort,
            })
            res.end(`const wsConf =${jsS}`)
        }
        res.writeHead(404);
        res.end();
    };
    
    const httpPort = 8000;
    const httpHost = '0.0.0.0'
    // for(const host of ['0.0.0.0']){//getIPs()){
    const server = http.createServer(requestListener);
    server.listen(httpPort, httpHost, () => {
        console.log(`Server is running on http://${httpHost}:${httpPort}`);
    });
    // }
    
    
    /////
    
    // WS
    
    const wss = new WebSocket.Server({
        server: server
    });
    
    wss.on("connection",socket=>{
        console.log("new wss connected")
        const socketPort = new osc.WebSocketPort({
            socket
        });
        socketPort.instanceName = "ws"+socket.host
        socketPort.on('message',msg=>{
            console.log("new msg",msg)
            rootNode.processMsgFromListener(socketPort,msg.address.substr(1).split('/'),msg.args)
        })
        const cb = msg=>{
            // console.log('WSSS state changed',msg.address,msg.from.instanceName)
            if(msg.from!=socketPort){
                // console.log('WSSS sending back to client',msg.args)
                socketPort.send({address:'/'+msg.address.join('/'),args:msg.args})
            }
        }
        socketPort.sendUnpacked = function(address,args){
            socketPort.send({address,args})
        }
        rootNode.evts.on("stateChanged",cb)
        
        socket.on("close",e=>{
            console.log("client ws closed")
            wsClis.delete(socketPort);
            rootNode.evts.off("stateChanged",cb)
        })
        wsClis.add(socketPort);
        
        socketPort.sendUnpacked('/schema',JSON.stringify(rootNode.getJSONSchema()))
        socketPort.sendUnpacked('/state',JSON.stringify(rootNode.getState()))
    })
    
    const wsClis = new Set()
    function broadcastToWebClis(address,args){
        // console.log('broadcasting to wss',address,wsClis.size)
        if(wsClis.size===0){return;}
        wsClis.forEach(ws=>{
            // console.log('broadcasting to wss',ws);
            ws.send({address,args});
        })
    }
    
    wss.on("close",e=>{
        console.log("wss closeed",e)
    })
    
    wss.on("error",e=>{
        console.log("wss errored")
    })
    wss.on("listen",e=>{
        console.log("wss listen")
    })
    
    wss.on("message",e=>{
        console.log(e)
    })
    
    
    // mainLogic
    if(isMaster){
        
        masterLogic.setup(rootNode);
        rootNode.addChild('logic',masterLogic)
    }
    else{
        
    }
