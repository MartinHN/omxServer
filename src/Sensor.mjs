import {OSCServerModule} from "./OSCServerModule.mjs"
import EventEmitter from "events"

const multicastIp = "230.1.1.1"
const sensorPort = 4000;
const toSensorPort = 3000;



const therm = []
therm.length = 64

const evts = new EventEmitter();

const srv = new OSCServerModule(function (msg) {
    // console.log('msg',msg);
    if(msg.address == "/mat"){
        for(let i = 0 ; i < 64 ; i++){
            therm[i] = msg.args[i+1]
        }
        evts.emit("therm",therm);
        console.log("mat rcvd",therm);
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
