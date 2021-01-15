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
    oscAnnounce.connect("0.0.0.0");
    const sendAnnounce = ()=>{
        const an = {port:udpPort}
        oscAnnounce.send("/announce",JSON.stringify(an),multicastIp,announcePort)
    }
    setInterval(()=>{
       sendAnnounce()
    },announceTimeSecond*1000)
    sendAnnounce();
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
            else{
                console.log('new announce',announce)
                const nS = new OSCServerModule();
                nS.connect("0.0.0.0",announce.port)
                nS.port = announce.port;
                nS.ip = announce.ip;
                slaves[announce.uid] = nS;
            }
            lastAnnounces[announce.uid] = setTimeout(
                ()=>{
                    delete slaves[announce.uid];
                }
                ,3*1000*announceTimeSecond);
            
            
            
        }
        });

        rootNode.evts.on("stateChanged",msg=>{
            if(msg.isStream)return;
            if(msg.from==oscRcv)return;
            const sAddr = '/'+msg.address.join('/')
            for(const [k,s] of Object.entries(slaves)){
                console.log('sending to slave',k,sAddr,msg.args)
                s.send(sAddr,msg.args,s.ip,s.port)
            }
        })
        
        announceListener.connect(multicastIp,announcePort)
    }
