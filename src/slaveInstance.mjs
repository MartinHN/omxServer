
import * as OSCAPIClient from './OSCAPIClient.mjs'
import * as HTTPServer from './HTTPServer.mjs'
import playerInst, { setup as playerSetup } from './player.mjs'
import { runOSCServer } from './OSCAPIBinder.mjs'

const rootNode = playerInst;
rootNode.setRoot()
playerSetup();

OSCAPIClient.setup(rootNode)
HTTPServer.setup(rootNode)
try {
    runOSCServer(rootNode);
}
catch (e) {
    console("OSCSlave err", e)
}
