import {OSCServerModule} from'./OSCServerModule.mjs'
import osc from 'osc'

const multicastIp = "230.1.1.1"
const announcePort = 4000;
const announceTimeSecond = 5; 


// announcing Socket
const oscAnnounce = new OSCServerModule();
oscAnnounce.connect("0.0.0.0");


function startSendAnnounce(udpPort){
    const sendAnnounce = ()=>{
        const an = {type:"player",id:"slave",port:udpPort}
        oscAnnounce.send("/announce",JSON.stringify(an),multicastIp,announcePort)
    }
    setInterval(()=>{
        sendAnnounce()
    },announceTimeSecond*1000)
    sendAnnounce();
}
const oscRcv = new osc.UDPPort({
    // socket,
    localAddress:"0.0.0.0",
    localPort:0,
    metadata: false
});
oscRcv.open()


let fromIp ;
let fromPort;

function sendResp (address ,args){
    const m = {address,args};
    console.log("sending ::::  ",m,'to' ,fromIp,fromPort)
    oscRcv.send(m,fromIp,fromPort);
}

oscRcv.on('ready',e=>{
    const address = oscRcv.socket.address();
    const udpPort=address.port;
    console.log(`socket listening ${address.address}:${address.port}`);
    startSendAnnounce(udpPort)
})
oscRcv.on("message",  (msg,time,info)=> {
    fromIp = info.address;
    fromPort = info.port;
    console.log("cli recievd",info);
    if(msg.address=="/getState"){
        const s = JSON.stringify(rootNode.getState());
        sendResp("/getState",s)
    }
    else if(msg.address=="/schema"){
        const s = JSON.stringify(rootNode.getJSONSchema());
        sendResp("/schema",s)
    }else{
        console.log('msg',msg)
        const p = msg.address.substr(1)
        const addrSpl = p.split('/')
        rootNode.processMsgFromListener(oscRcv,addrSpl,msg.args)
    }
})

oscRcv.on('error',e=>{
    console.error('osc err',e)
})

let rootNode;
export function setup(r){
    oscRcv.open()
    rootNode = r;
    rootNode.setRoot()
    rootNode.evts.on("stateChanged",msg=>{
        if(msg.from==oscRcv)return;
        const sAddr ='/'+ msg.address.join('/') 
        sendResp(sAddr,msg.args);
    })
}
