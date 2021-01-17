import {NodeInstance,APIBase} from './API.mjs'
import playerInst from './player.mjs'
import {loadConf,saveConf} from "./persistent.mjs"

const rootNode = new NodeInstance()
const rootApi = new APIBase("serverRoot")
rootApi.addMember('autoLoad','b',{default:false})

rootNode.setAPI(rootApi)
rootNode.setRoot();


rootNode.addChild('player',playerInst)
// no nested members for now

export  default  rootNode
