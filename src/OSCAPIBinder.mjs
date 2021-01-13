import osc from "osc"

const udpPort=9009;

// Create an osc.js UDP Port listening on port 57121.
var oscRcv = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: udpPort,
    metadata: true
});


oscRcv.on("message", function (oscMsg) {
console.log('msg',oscMsg)
const p = oscMsg.address.substr(1)
if(p in rootNode.api.__functions){
    rootNode.api.__functions[p].fun();
}
}
)

oscRcv.on('ready', () => {
    console.log("listening on port",udpPort)
  
})

let rootNode;
export function regRootNode(r){
    rootNode = r;
    // for(const v of Object.values(r.api.__functions)){
    //     console.log('reg fun', v.name)
    //     osc.on('/'+v.name,v.fun.bind(v));
    // }
}


/// start app
export function runOSCServer(){

    // socket.bind(udpPort,'0.0.0.0',()=>{
    //     console.log('rcvd')
    // })
    oscRcv.open();
    // osc.open({ port: udpPort })
}
