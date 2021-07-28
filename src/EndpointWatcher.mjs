import {OSCServerModule} from "./OSCServerModule.mjs"
import {EventEmitter} from 'events'

const multicastIp = "230.1.1.1"
const announcePort = 4000;
const announceTimeSecond = 3; 

class Endpoint extends EventEmitter{
    constructor(announce,globalEvts){
        super();
        this.globalEvts = globalEvts;
        
        this.remotePort = announce.port;
        this.remoteIp = announce.ip;
        this.epid = announce.epid;
        this.type = announce.type;
        this.id = announce.id;
        this.name = this.type;
        if(this.id){
            this.name+="_"+this.id;
        }
        this.epOSC= new OSCServerModule((msg,time,info)=>{
            this.handleMsg(msg,time,info)
        });
        
        
        this.epOSC.connect("0.0.0.0",0)// randomPort
        
        this.epOSC.udpPort.on('ready',()=>{
            this.sendFirstQueries();
        })
        
        
    }
    
    close(){
        this.epOSC.close();
    }
    
    sendFirstQueries(){
        this.send("/schema",[])
        // setTimeout(()=>{
        this.send("/getState",['call'])
        //},1000);
    }
    send(addr,args){
        this.epOSC.send(addr,args===undefined?[]:args,this.remoteIp,this.remotePort);
    }
    
    handleMsg(msg,time,info){
        // console.log("new msg endpoint",msg);
        if(msg.address == "/ping"){
            const dt = parseInt(msg.args[0]) || 3000;
            remotePort = parseInt(msg.args[1]) || 3000; 
            updatePing(dt*2);
        }
        else if(msg.address == "/schema"){
            let schema;
            try{
                schema = JSON.parse(msg.args[0])
            }
            catch(e){
                console.error("schema not parsed",msg.args[0],e);
            }
            if(schema){
                this.globalEvts.emit("schema",{ep:this,schema})
                this.emit("schema",schema);
            }
        }
        else if(msg.address == "/getState"){
            let state;
            try{
                state = JSON.parse(msg.args[0])
            }
            catch(e){
                console.error("state not parsed",e)
            }
            if(state){
                this.globalEvts.emit("state",{ep:this,state})
                this.emit("state",state);
            }
        }
        else{
            console.log("message from endpoint",msg.address)
            const nMsg = {...msg}
            nMsg.address =msg.address.substr(1).split('/');
            console.log("addrSpl",nMsg.address)
            this.emit("message",nMsg);
        }
    }
}


class EndpointWatcher extends EventEmitter{
    endpoints={};
    
    setup(){
        
        this.osc = new OSCServerModule((msg,time,info)=>
        {this.multicastHandler(msg,time,info)});
        this.osc.connect(multicastIp,announcePort)
    }
    
    multicastHandler(msg,time,info){
        if(msg.address=="/announce"){
            const rcvdAnnounce = JSON.parse(msg.args[0]);
            const announce = {type:rcvdAnnounce.type,id:rcvdAnnounce.id,port:rcvdAnnounce.port};
            const epUUID = info.address+":"+announce.port;
            announce.ip = this.osc.lastMsgInfo.address;
            announce.epid = epUUID;
            let curEp= this.endpoints[epUUID];
            if(curEp){
                clearTimeout(curEp.timeout);
            }
            else{
                console.log('new announce',announce);
                curEp = new Endpoint(announce,this);
                this.endpoints[epUUID] = curEp;
                this.emit("added",this.endpoints[epUUID]);
            }
            curEp.timeout = setTimeout(
                ()=>{
                    this.emit("removed",curEp );
                    this.endpoints[epUUID].close();
                    delete this.endpoints[epUUID];
                }, 3*1000*announceTimeSecond
                );
        }
        else if(msg.address=="/ping"){
            //TODO
        }
        else{
            // TODO try to parse msg to look for uid
            // for now we doesnt differenciate them
            const epMulticastingList =  Object.values(this.endpoints).filter(e=>e.remoteIp==info.address);
            if(epMulticastingList.length){
                const nMsg = {...msg}
                nMsg.address =msg.address.substr(1).split('/');
                nMsg.fromMulticast=true;
                // console.log("multicast rcvd",msg.address);
                for(const epMulticasting of epMulticastingList){
                    epMulticasting.emit("message",nMsg)
                    this.emit("endpointMsg",{ep:epMulticasting,nMsg})
                }
            }
            
            else{
                console.error('unknown endpoint multicasting',info,msg.address);
            }
            
        }
    }
}









export default new EndpointWatcher();  
