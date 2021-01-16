class WSServerConnection{
    constructor(){
        
    }
    
    connect(ip,port){
        
        this.oscPort = new osc.WebSocketPort({
            url: `ws://${ip}:${port}`
        });
        
        this.oscPort.on('open',()=>{
            console.log('ws open')
        })
        this.oscPort.on('error',()=>{
            console.log('ws error')
        })
        this.oscPort.on('close',()=>{
            console.log('ws close')
        })
        
        this.oscPort.on('message',msg=>{
            if(msg.address=="/schema"){
                syncObj.emit("newSchema",JSON.parse(msg.args[0]));
            }
            else if(msg.address=="/state"){
                syncObj.emit("newState",JSON.parse(msg.args[0]));
            }
            else{
                syncObj.emit("fromServer",msg)
            }
        })
        
        this.oscPort.open();
        
    }
    
    send(address,args){
        console.log('sending ',address,args)
        this.oscPort.send({address,args})
    }
}
