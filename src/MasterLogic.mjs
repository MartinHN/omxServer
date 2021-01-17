import {NodeInstance,APIBase} from './API.mjs' 
//////////////
// API

const api = new APIBase("masterLogic")

api.addMember('onTime','f',{default:1,minimum:0,maximum:60})
api.addMember('offTime','f',{default:1,minimum:0,maximum:60})
api.addStream('smoothPres','b')


const conf = api.memberGetter();

const masterInstance= new NodeInstance()
masterInstance.setAPI(api);

let changePresenceTimeOut;
let hadPresence = false;
let rootNode;

masterInstance.instanceName = "masterLogic"
function setNewPresence(b){
    hadPresence = b;
    if(rootNode){
        const players = rootNode.getChildsWithAPIType("player");
        for(const p of Object.values(players)){
            p.setAnyValue(hadPresence?"play":"stop",[],masterInstance);
        }
        const lights = rootNode.getChildsWithAPIType("light");
        for(const p of Object.values(lights)){
            p.setAnyValue("switch",hadPresence?1:0,masterInstance);
        }
        console.log("has playersLights num ",players.length,lights.length)
        masterInstance.setAnyValue('smoothPres',hadPresence,masterInstance)
    }
    console.log('-->new presence ',b,!!rootNode);
}


masterInstance.setup = (r)=>{
    rootNode = r;
    rootNode.evts.on("stateChanged",msg=>{
        // console.log('master logic',msg.address)
        const sAddr = "/"+msg.address.join('/');
        if(sAddr == "/eye/presence"){
            const  hasPresence = !!msg.args && msg.args[0]!=0
            console.log("master rcvd presence",hasPresence,msg.args)
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
