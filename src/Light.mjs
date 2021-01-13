import osc from "osc"


// Create an osc.js UDP Port 
var oscRcv = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: undefined,
    remotePort : remote,
    metadata: true
});
