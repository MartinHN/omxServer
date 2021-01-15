import {loadConf,saveConf,setBaseDir} from "./persistent.mjs"
import {runOSCServer,regRootNode} from './OSCAPIBinder.mjs'
import {createRemoteInstanceFromSchema} from './API.mjs'
import * as Sensor from './Sensor.mjs'
import rootNode from './rootNode.mjs'
import http from 'http'
import {readFileSync} from 'fs'
import { execSync } from "child_process"
import WebSocket  from "ws";
import osc from 'osc'

const proc =  execSync("uname -a").toString()
const isPi = proc.includes("armv7")
const thisPath = isPi?"/home/pi/omxServer":"/home/tinmar/Work/mili/omxServer" 
setBaseDir(thisPath)
Sensor.setup();
Sensor.events.on("connected",c=>{
    console.log("connected",c)
})

Sensor.events.on('schema',s=>{
    console.log('schema',JSON.stringify(s,undefined,"   "))
    
    const eye =  createRemoteInstanceFromSchema(s,true,msg=>{
        Sensor.send('/'+msg.address.join('/'),msg.args)
    })
    
    rootNode.addChild('eye',eye)
    console.log('global Schema',JSON.stringify(rootNode.getJSONSchema(),undefined,"  "));
    
})

Sensor.events.on('state',s=>{
    console.log('state',JSON.stringify(s,undefined,"   "))
    const eI = rootNode.childs['eye']
    if(eI){
        eI.restoreState(s)
    }
    console.log('global State',rootNode.getState());
})

// const conf  = loadConf();
// conf.volume=1
// console.log('conf',conf);
// rootNode.restoreState(conf)
const nConf = rootNode.getState()
console.log('new', nConf)
saveConf(nConf);

// OSC
regRootNode(rootNode);
runOSCServer();


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
    else if(req.url == ("/jsSchema")){
        res.writeHead(200);
        const jsS = JSON.stringify({
            schema:rootNode.getJSONSchema(),
            state:rootNode.getState(),
        })
        res.end(`const jsSchema =${jsS}`)
    }
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
    console.log("wss connected")
    
  
    const socketPort = new osc.WebSocketPort({
        socket
    });
    const listenerInstance = {uuid:socketPort}
    socketPort.on('message',msg=>{
        console.log("new msg",msg)
        rootNode.processMsgFromListener(listenerInstance,msg.address.substr(1).split('/'),msg.args)
    })
    const cb = msg=>{
        // console.log('WSSS state changed',msg)
        if(!msg.from || (msg.from.uuid!=listenerInstance.uuid)){
            console.log('WSSS sending back to client',msg)
            socketPort.send({address:'/'+msg.address.join('/'),args:msg.args})
        }
    }
    rootNode.evts.on("stateChanged",cb)

    socket.on("close",e=>{
        console.error("closed")
        rootNode.evts.off("stateChanged",cb)
    })
})


wss.on("close",e=>{
    console.log("wss closeed")
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
