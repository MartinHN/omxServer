import osc from "osc"
import EventEmitter from "EventEmitter"

const multicastIp = "230.1.1.1"
const sensorPort = 4000;
const toSensorPort = 3000;

// Create an osc.js UDP Port 
var oscRcv = new osc.UDPPort({
    localAddress: multicastIp,
    localPort: sensorPort,
    remotePort : toSensorPort,
    metadata: true
});

const therm = []
therm.length = 64

const evts = new EventEmitter();

oscRcv.on("message", function (msg) {
    console.log('msg',msg);
    if(msg.address == "/mat"){
        for(const i = 0 ; i < 64 ; i++){
            therm[i] = msg.args[i].value
        }
        evts.emit("therm",therm);

    }
    
})

oscRcv.on('ready', () => {
    console.log("listening on port",udpPort)
    
})



/// start app
export function runOSCServer(){
    
    // socket.bind(udpPort,'0.0.0.0',()=>{
    //     console.log('rcvd')
    // })
    oscRcv.open();
    // osc.open({ port: udpPort })
}
