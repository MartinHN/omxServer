import {NodeInstance,APIBase} from './API.mjs'
import playerInst from './player.mjs'

const inst = new NodeInstance()
const rootApi = new APIBase("serverRoot")
rootApi.addMember('autoLoad','b',{default:false})
inst.setAPI(rootApi)
inst.setRoot();


inst.addChild('player',playerInst)
// no nested members for now

export  default  inst
