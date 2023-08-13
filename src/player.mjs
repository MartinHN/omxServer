import { NodeInstance, APIBase } from './API.mjs'
import { loadConf, saveConf, isPi, thisPath } from "./persistent.mjs"
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

api.addMember('volume', 'f', { default: 1, minimum: 0, maximum: 1 })
api.addFunction('toggleTestSound', () => { toggleTestSound(true) }, [], undefined)
api.addStream("isTesting", 'b', { default: false })
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


playerInstance.onValueChanged = (cname, args, from) => {
    if (cname == "volume") {
        setVolumePct(parseFloat(args) * 100);
    }
}

let loopEx;
const aplayBin = isPi ? "aplay" : 'afplay'
const audioTestPath = thisPath + "/media/drumLoop.wav"
function playDefault(loop) {
    setVolumePct(conf.volume * 100);

    const trueAudioPath = conf.isTesting ? audioTestPath : conf.path;
    if (!fs.existsSync(trueAudioPath)) {
        console.error("audio file do not exists", trueAudioPath)
    }
    playerInstance.setAnyValue('isPlaying', true, playerInstance)
    const milibelVolume = Math.round((conf.volume - 1) * 4000)
    console.log("volume", milibelVolume)
    if (!useAplay) {
        player.newSource(trueAudioPath, conf.useHDMI ? 'hdmi' : 'local', !!loop, milibelVolume);
    }
    else {
        const cmd = aplayBin + ' ' + trueAudioPath;
        console.log("executiong ", cmd);
        const startLoop = () => {
            if (loopEx) {
                stopDefault(true);
            }
            playerInstance.setAnyValue('isPlaying', true, playerInstance)
            loopEx = exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return;
                }

                console.log("end of aplay", stdout);
                console.error("err", stderr);
                if (loop && !!conf.isPlaying) {
                    startLoop();
                } else {
                    playerInstance.setAnyValue('isPlaying', false, playerInstance)
                }
            });

        }
        startLoop();


    }
}

function stopDefault(force) {
    console.log('stopping')
    playerInstance.setAnyValue('isPlaying', false, playerInstance)
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
            console.log(" not killing aplay ")
        }
    }
}


function setVolumePct(v) {
    console.log("should set live vol pct to", v);
    if (isPi) {
        const pctV = parseFloat(v);
        const cmd = "amixer -q -M sset Headphone " + pctV + "%"
        exec(cmd, (err) => {
            if (err) {
                console.err("err while setting volume : ", e)
                return;
            }
            const actualVol = parseInt(getVolumePct());
            if (actualVol != parseInt(pctV)) {
                console.error("volume not set properly : wanted", pctV, "but got ", actualVol);
            }

        });
    }
    getVolumePct();
}

function getVolumePct() {
    try {
        let cmdRes = ""
        if (isPi) {
            const cmd = "amixer -M sget Headphone"
            cmdRes = execSync(cmd).toString();
            // console.log("vol returned ", cmdRes);
        }
        else {
            cmdRes = "Simple mixer control 'Headphone',0  \n Capabilities: pvolume pvolume - joined pswitch pswitch - joined \n Playback channels: Mono \n Limits: Playback - 10239 - 400 \n Mono: Playback - 804[63%][-8.04dB][on] \n "
        }
        const re = /\[(\d+)%/s
        const res = re.exec(cmdRes);
        if (res && res.length) {
            const vs = res[0].replace("[", "");
            const num = parseFloat(vs);
            return num;
        }
        else {
            console.log("unmatch re", res)
        }

    } catch (e) {
        console.error("err while setting volume : ", e)
    }
    return 1;
}

function toggleTestSound() {
    playerInstance.setAnyValue('isTesting', !conf.isTesting, playerInstance);
    stopDefault(true); playDefault();
}
