import {NodeInstance,APIBase} from './API.mjs'
import playerInst from './player.mjs'
import {loadConf,saveConf} from "./persistent.mjs"

const rootNode = new NodeInstance()
const rootApi = new APIBase("serverRoot")
rootApi.instanceName = "root"
rootApi.addFunction('save',()=>{
    const localState = rootNode.getState(true);
    saveConf(localState);
    const savableRemotes = rootNode.getChildsIfPredicate(c=>{
       return c.api.isRemoteRoot && ('saveCurrentState' in c.api.__functions || 'save' in c.api.__functions) 
    })
    for(const r of Object.values(savableRemotes)){
        if('saveCurrentState' in r.api.__functions){
            r.setAnyValue('saveCurrentState',undefined,rootApi)
        }
        else {
            r.setAnyValue('save',undefined,rootApi)
        }
        
    }
},[],undefined)

rootNode.setAPI(rootApi)
rootNode.setRoot();


rootNode.addChild('player',playerInst)
// no nested members for now

export  default  rootNode
