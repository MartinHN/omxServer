import {NodeInstance,APIBase} from './API.mjs'
import {OSCServerModule} from'./OSCServerModule.mjs'
import osc from 'osc'
import dgram from 'dgram'
import {runOSCServer} from './OSCAPIBinder.mjs'
import playerInst from './player.mjs'

const multicastIp = "230.1.1.1"
const announcePort = 4004;
const announceTimeSecond = 5; 


const oscAnnounce = new OSCServerModule();
oscAnnounce.connect("0.0.0.0");


const socket = dgram.createSocket("udp4");

socket.on("error", function (error) {
    console.error("error", error);
    socket.close()
});


// server.on('message', (msg, rinfo) => {
//   console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
// });

socket.on('listening', () => {
  const address = socket.address();
  const udpPort=address.port;
  console.log(`socket listening ${address.address}:${address.port}`);
  const sendAnnounce = ()=>{
    const an = {type:"player",id:"slave",port:udpPort}
    oscAnnounce.send("/announce",JSON.stringify(an),multicastIp,announcePort)
}
setInterval(()=>{
   sendAnnounce()
},announceTimeSecond*1000)
sendAnnounce();
});

socket.bind(0);
const oscRcv = new osc.UDPPort({
    socket,
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
    console.log("slave Ready",JSON.stringify(oscRcv.socket))
    const udpPort  = 7000

    
})

oscRcv.open()
