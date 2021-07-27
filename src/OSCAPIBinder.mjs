import osc from "osc"
import {OSCServerModule} from "./OSCServerModule.mjs"
import {oscPortNum} from "./conf.mjs"


const multicastIp = "230.1.1.1"
const announcePort = 4004;
const announceTimeSecond = 5; 
// Create an osc.js UDP Port listening on port udPPort.
const oscRcv = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: oscPortNum,
    metadata: true
});

oscRcv.instanceName = "externOSC"


oscRcv.on("message",  (msg)=> {
    console.log('msg',msg)
    const p = msg.address.substr(1)
    // if(p in rootNode.api.__functions){
    //     rootNode.api.__functions[p].fun();
    // }
    const addrSpl = p.split('/')
    rootNode.processMsgFromListener(oscRcv,addrSpl,msg.args)
})

oscRcv.on('ready', () => {
    console.log("listening on port",oscPortNum)
    
})


let rootNode;
/// start app
export function runOSCServer(r,isMaster){
    rootNode = r;
    oscRcv.open();
    
 
    
}
