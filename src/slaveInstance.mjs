
import * as OSCAPIClient from'./OSCAPIClient.mjs'
import * as HTTPServer from'./HTTPServer.mjs'
import playerInst from './player.mjs'
import {execSync} from 'child_process'


const rootNode = playerInst;
rootNode.setRoot()

OSCAPIClient.setup(rootNode)
HTTPServer.setup(rootNode)
