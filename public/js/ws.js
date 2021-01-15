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
            console.log('ws message',msg)
        })

        this.oscPort.open();

    }

     send(address,args){
         console.log('sending ',address,args)
        this.oscPort.send({address,args})
    }
}
