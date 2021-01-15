import osc from "osc"
import {OSCServerModule} from "./OSCServerModule.mjs"
const udpPort=9009;

const multicastIp = "230.1.1.1"
const announcePort = 4004;
const announceTimeSecond = 5; 
// Create an osc.js UDP Port listening on port udPPort.
const oscRcv = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: udpPort,
    metadata: true
});


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
    console.log("listening on port",udpPort)
    
})


let rootNode;
/// start app
export function runOSCServer(r,isMaster){
    rootNode = r;
    oscRcv.open();
    
    if(isMaster){
        initMaster();
    }else{
        initSlave();
    }
    
}


function initSlave(){
    const oscAnnounce = new OSCServerModule();
    oscAnnounce.connect("0.0.0.0",announcePort);
    
    setInterval(()=>{
        const an = {port:udpPort}
        oscAnnounce.send("/announce",JSON.stringify(an),multicastIp,announcePort)
    },announceTimeSecond*1000)
}


function initMaster(){
    const lastAnnounces = {}
    let slaves={};
    const announceListener = new OSCServerModule(msg=>{
        if(msg.address=="/announce"){
            const announce = JSON.parse(msg.args[0]);
            announce.ip = announceListener.lastMsgInfo.address;
            announce.uid = announce.ip;
            const last= lastAnnounces[announce.uid];
            if(last){clearTimeout(last);}
            lastAnnounces[announce.uid] = setTimeout(
                ()=>{
                    delete slaves[announce.uid];
                }
                ,3*1000*announceTimeSecond);
            }
            
            const nS = new OSCServerModule();
            slaves[announce.uid] = nS;
        });

        rootNode.evts.on("stateChanged",msg=>{
            if(msg.isStream)return;
            const sAddr = '/'+msg.address.join('/')
            for(const s of Object.values(slaves)){
                s.send(sAddr,msg.args)
            }
        })
        
        announceListener.connect(multicastIp,announcePort)
    }
