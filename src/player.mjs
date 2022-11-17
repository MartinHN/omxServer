import { NodeInstance, APIBase } from './API.mjs'
import { loadConf, saveConf, isPi } from "./persistent.mjs"
import fs from 'fs'
//////////////
// API

const useAplay = true; // omx is deprecated...
const api = new APIBase("player")

api.addFunction('save', () => {
    const nConf = playerInstance.getState()
    saveConf(nConf, 'player.json');
}, [], undefined)

api.addFunction("loop", () => { stopDefault(true); playDefault(true) }, [], undefined)
api.addFunction("play", () => { stopDefault(true); playDefault() }, [], undefined)
api.addFunction("stop", () => { stopDefault(true) }, [], undefined)
api.addStream("isPlaying", 'b', { default: false })

api.addMember('volume', 'f', { default: 1, minimum: 0, maximum: 1.2 })

api.addFile('videoFile', 'video', 'video.mov')
api.addMember('videoFileName', 's', { default: 'no File', readonly: true })
api.addMember('useHDMI', 'b', { default: false })
api.addMember('path', 's', { default: isPi ? '/home/pi/raspestrio/omxServer/public/uploads/videoFile' : '/Users/tinmarbook/Dev/momo/raspestrio/omxServer/public/uploads/videoFile' })




const playerInstance = new NodeInstance()
playerInstance.setAPI(api);
playerInstance.instanceName = "playerScript"
export default playerInstance;

const pconf = loadConf('player.json');
playerInstance.restoreState(pconf)

//////////
// logic


const conf = api.memberGetter();

import Omx from './OMXPlayerCustom.js'
import { exec, execSync } from 'child_process'

export function setup() {
    setBlackBackground();
}
export function setBlackBackground() {
    if (!isPi) { console.warn("would have set black bg"); return; }
    ///////////////
    // set black background on headless pi4
    try {
        execSync("tvservice -p")
    } catch (e) {
        console.log('not on a rasp????????', e)
    }
}
// Create an instance of the player with the source.
var player = Omx();
player.on('close', e => {
    console.log("player ended")
    playerInstance.setAnyValue('isPlaying', false, playerInstance)
})
player.on('error', e => {
    console.log("player error")
    playerInstance.setAnyValue('isPlaying', false, playerInstance)
})


let loopEx;

const aplayBin = isPi ? "aplay" : 'afplay'
function playDefault(loop) {
    if (!fs.existsSync(conf.path)) {
        console.error("audio file do not exists", conf.path)
    }
    playerInstance.setAnyValue('isPlaying', true, playerInstance)
    const milibelVolume = Math.round((conf.volume - 1) * 4000)
    console.log("volume", milibelVolume)
    if (!useAplay) {
        player.newSource(conf.path, conf.useHDMI ? 'hdmi' : 'local', !!loop, milibelVolume);
    }
    else {
        const cmd = aplayBin + ' ' + conf.path;
        console.log("executiong ", cmd);
        const startLoop = () => {
            if (loopEx) {
                stopDefault(true);
            }
            loopEx = exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return;
                }

                console.log("end of aplay", stdout);
                console.error("err", stderr);
                if (loop) {
                    startLoop();
                }
            });

        }
        loopEx = startLoop();


    }
}


function stopDefault(force) {
    console.log('stopping')
    if (!useAplay) {
        if (player) {
            if (force) {
                player.kill()
            }
            else {
                player.quit();
            }
        }
    }
    else {
        try {
            execSync('killall ' + aplayBin)
        }
        catch (e) {
            console.log(" error killing aplay", e)
        }
    }
}
