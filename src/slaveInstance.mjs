
import * as OSCAPIClient from'./OSCAPIClient.mjs'
import playerInst from './player.mjs'

const rootNode = playerInst;
rootNode.setRoot()

OSCAPIClient.setup(rootNode)
