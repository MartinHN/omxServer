import {OSCServerModule} from "./OSCServerModule.mjs"
import EventEmitter from "events"

const multicastIp = "230.1.1.1"
const sensorPort = 4000;
const toSensorPort = 3000;

export const events = new EventEmitter();


const therm = []
therm.length = 64

let connected = false;
let pingTimeOut;
let remotePort;
function updatePing(timeBeforeNext = 3000){
    if(pingTimeOut){
        clearTimeout(pingTimeOut);
    }
    if(!connected){
        connected = true;
        events.emit("connected",true);
        send("/schema",[])
        send("/getState",['call'])
    }
    pingTimeOut = setTimeout(()=>{
        connected = false;
        events.emit("connected",false);
    },timeBeforeNext)
}

const srv = new OSCServerModule(function (msg) {
    // console.log('msg',msg);
    if(msg.address == "/mat"){
        for(let i = 0 ; i < 64 ; i++){
            therm[i] = msg.args[i+1]
        }
        events.emit("therm",therm);
        console.log("mat rcvd",therm);
    }
    else if(msg.address == "/ping"){
        const dt = parseInt(msg.args[0]) || 3000;
        remotePort = parseInt(msg.args[1]) || 3000; 
        updatePing(dt*2);
    }
    else if(msg.address == "/schema"){
        events.emit("schema",JSON.parse(msg.args[0]))
    }
    else if(msg.address == "/getState"){
        events.emit("state",JSON.parse(msg.args[0]))
    }
    else{
        console.log(' received msg',msg)
    }
    
})



/// start app
export function setup(){
    
    // socket.bind(udpPort,'0.0.0.0',()=>{
    //     console.log('rcvd')
    // })
    srv.connect(multicastIp,sensorPort);

    
    // osc.open({ port: udpPort })
}


export function send(addr,args){
    srv.send(addr,args,srv.lastMsgInfo.address,remotePort)
}
