import {NodeInstance,APIBase} from './API.mjs' 
//////////////
// API

const api = new APIBase()

api.addMember('onTime','f',{default:1,minimum:0,maximum:3})
api.addMember('offTime','f',{default:1,minimum:0,maximum:3})
api.addStream('smoothPres','b')


const conf = api.memberGetter();

const masterInstance= new NodeInstance()
masterInstance.setAPI(api);
let lastPlayStart = 0;
let lastPlayStop = 0;

let changePresenceTimeOut;
let hadPresence = false;
let rootNode;
function setNewPresence(b){
    hadPresence = b;
    if(rootNode){
        rootNode.processMsgFromListener(masterInstance,["player",hadPresence?"play":"stop"],[]);
        rootNode.processMsgFromListener(masterInstance,["light","light","switch"],hadPresence?1:0);
    }
    console.log('-->new presence ',b,!!rootNode);
}
masterInstance.setup = (r)=>{
    rootNode = r;
    rootNode.evts.on("stateChanged",msg=>{
        // console.log('master logic',msg.address)
        const sAddr = "/"+msg.address.join('/');
        if(sAddr == "/eye/presence"){
            const  hasPresence = msg.args[0]!=0
            console.log("master rcvd presence",hasPresence)
            const now = millis()
            if(changePresenceTimeOut){
                clearTimeout(changePresenceTimeOut);
            }
            
            if(hadPresence != hasPresence){
                const target = hasPresence
                const to = 1000*(hasPresence?conf.onTime:conf.offTime);
                console.log('setting ',target, 'in',to)
                changePresenceTimeOut = setTimeout(()=>{
                    setNewPresence(target)},to)
                }
                
            }
            else if(sAddr == "/player/isPlaying"){
                const isPlaying = msg.args;
                console.log("master rcvd play",isPlaying)
                if(isPlaying){
                    lastPlayStart = millis()
                }
                else{
                    lastPlayStop = millis()
                }
            }
        })
    }
    
    function millis(){
        return new Date();
    }
    
    export default masterInstance ;
