import {NodeInstance} from './API.mjs'
import {getAPI} from './player.mjs'

const inst = new NodeInstance()
inst.setAPI(getAPI())
inst.setRoot();
// no nested members for now

export  default  inst
