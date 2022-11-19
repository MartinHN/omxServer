import { loadConf, saveConf } from "./persistent.mjs"
import { runOSCServer } from './OSCAPIBinder.mjs'
import { createRemoteInstanceFromSchema } from './API.mjs'
// import * as Sensor from './Sensor.mjs'
import EndpointWatcher from './EndpointWatcher.mjs'
import rootNode from './rootNode.mjs'

import { readFileSync } from 'fs'
import { execSync } from "child_process"

import masterLogic from './MasterLogic.mjs'
import * as httpServer from "./HTTPServer.mjs"
import { setBlackBackground } from "./player.mjs"


EndpointWatcher.on("added", ep => {
    console.log("endpoint added", ep.name)
    ep.instanceName = 'ep_' + ep.name// to track listener loops
})

EndpointWatcher.on("removed", ep => {
    console.error("endpoint removed", ep.name)
    rootNode.removeChild(ep.name)
    httpServer.broadcastToWebClis("/schema", JSON.stringify(rootNode.getJSONSchema()));
    httpServer.broadcastToWebClis("/state", JSON.stringify(rootNode.getState()));
})

EndpointWatcher.on("schema", e => {

    console.log("auto adding schema", e.ep.name)
    const nI = createRemoteInstanceFromSchema(e.ep.type, e.schema, true, msg => {
        if (msg.from !== e.ep) {
            const fromName = msg.from ? msg.from.instanceName : "not specified"
            console.log('sending back to ep ', e.ep.name, msg.address, "from", fromName);
            e.ep.send('/' + msg.address.join('/'), msg.args)
        }
    })

    if (e.ep.type == "eye") {
        // hack for min max
        // console.log(nI.childs.g.api.__members)
        // nI.childs.g.api.__members.scaleMin.opts.minimum = 10;
        // nI.childs.g.api.__members.scaleMax.opts.minimum = 10;
        // nI.api.__members.scaleMax.opts.minimum = 10;
        //
        nI.api.addStream("mat", "pixels", { width: 8, height: 8 })
        nI.api.addStream("presence", "b")
        nI.api.addStream("presenceSize", "i")

    }
    else if (e.ep.type == "light") {
        e.ep.send('/switch', 1)
    }
    e.ep.on("message", msg => {
        if (msg.fromMulticast) { msg.args.shift() }// remove uuid
        rootNode.processMsgFromListener(e.ep, [e.ep.name, ...msg.address], msg.args);

    })
    rootNode.addChild(e.ep.name, nI);
    httpServer.broadcastToWebClis("/schema", JSON.stringify(rootNode.getJSONSchema()));
})

EndpointWatcher.on("state", e => {
    console.log('rcvd state', e.ep.name, e.state)
    const s = e.state;
    const eI = rootNode.childs[e.ep.name]
    if (eI) {
        eI.restoreState(s)
    }
    else {
        console.error("no node for state", e.ep.name)
    }
    httpServer.broadcastToWebClis("/state", JSON.stringify(rootNode.getState()));
})

EndpointWatcher.setup()

// if endpoint has not thrown error
setBlackBackground();


// OSC
runOSCServer(rootNode);


// http
httpServer.setup(rootNode)


// mainLogic
masterLogic.setup(rootNode);
rootNode.addChild('logic', masterLogic)



// finally reload last state
const lastConf = loadConf();
rootNode.restoreState(lastConf)
