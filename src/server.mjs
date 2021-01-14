import {loadConf,saveConf,setBaseDir} from "./persistent.mjs"
import {runOSCServer,regRootNode} from './OSCAPIBinder.mjs'
import {createInstanceFromSchema} from './API.mjs'
import * as Sensor from './Sensor.mjs'
import rootNode from './rootNode.mjs'
import http from 'http'
import {readFileSync} from 'fs'
import { execSync } from "child_process"

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
   const eye =  createInstanceFromSchema(s)
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
    res.writeHead(404);
    res.end();
};

const port = 8000;
for(const host of ['0.0.0.0']){//getIPs()){
    const server = http.createServer(requestListener);
    server.listen(port, host, () => {
        console.log(`Server is running on http://${host}:${port}`);
    });
}
