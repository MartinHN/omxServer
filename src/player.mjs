import { NodeInstance, APIBase } from './API.mjs'
import { loadConf, saveConf, isPi, thisPath } from "./persistent.mjs"
import fs from 'fs'
//////////////
// API

const uniqueMediaName = 'mediaFile'
const defaultUniqueMediaFolder = isPi ? '/home/pi/raspestrio/omxServer/public/uploads/' : '/Users/tinmarbook/Dev/momo/raspestrio/omxServer/public/uploads/';
const defaultUniqueMediaPath = defaultUniqueMediaFolder + uniqueMediaName
const api = new APIBase("player")


function savePlayerConf() {
    const nConf = playerServer.getState()
    saveConf(nConf, 'player.json');
}

api.addFunction('save', savePlayerConf, [], undefined)

api.addFunction("loop", () => { stopDefault(true); playDefault(true) }, [], undefined)
api.addFunction("play", () => { stopDefault(true); playDefault() }, [], undefined)
api.addFunction("stop", () => { stopDefault(true) }, [], undefined)
api.addStream("isPlaying", 'b', { default: false })

api.addMember('volume', 'f', { default: 1, minimum: 0, maximum: 1 })
api.addFunction('toggleTestSound', () => { toggleTestSound(true) }, [], undefined)
api.addStream("isTesting", 'b', { default: false })
api.addFile(uniqueMediaName, 'video', 'video.mov')
api.addMember(uniqueMediaName + "Name", 's', { default: 'no File', readonly: true })
api.addMember('volumeBoost', 'f', { default: 0, minimum: 0, maximum: 1 })
api.addMember('compress', 'b', { default: false })
api.addMember('blackScreenOnBoot', 'b', { default: true })
// api.addMember('useHDMI', 'b', { default: false })
// api.addMember('path', 's', { default: defaultUniqueMediaPath })




const playerServer = new NodeInstance()
playerServer.setAPI(api);
playerServer.instanceName = "playerScript"
export default playerServer;

const pconf = loadConf('player.json');
playerServer.restoreState(pconf)

//////////
// logic


const conf = api.memberGetter();

import { exec, execSync } from 'child_process'
import { VlcPlayer } from './vlc.mjs'
let vlc = new VlcPlayer(true)

export async function setup() {
    if (conf.blackScreenOnBoot)
        setBlackBackground();
    await vlc.open({ audio: { compress: conf.compress } });
}


export function setBlackBackground() {
    if (!isPi) { console.warn("would have set black bg"); return; }
    ///////////////
    // set black background on headless pi4
    try {
        execSync("tvservice -p")
    } catch (e) {
        console.error('not on a rasp????????', e)
    }
}


playerServer.onValueChanged = (cname, args, from) => {
    if (cname == "volume") {
        setVolumePct(parseFloat(args), conf.volumeBoost);
    }
    else if (cname == "volumeBoost") {
        setVolumePct(conf.volume, parseFloat(args));
    }
    else if (cname == uniqueMediaName + "Name") {
        savePlayerConf();
    }
    else if (cname == 'compress') {
        vlc.close().then(() => setup()).catch(console.error).then(() => playDefault(lastLoopValue)).catch(console.error);
    }
    else if (cname == 'file_will_upload') { // stop when uploading new
        stopDefault();   
    }
}

const audioTestPath = thisPath + "/media/drumStereo.wav"

let lastLoopValue = false;
async function playDefault(loop) {
    lastLoopValue = loop;
    if (!vlc || !vlc.isAlive()) {
        console.error('force vlc res')
        vlc = new VlcPlayer(true)
        vlc.open();
    }
    setVolumePct(conf.volume, conf.volumeBoost);

    const trueAudioPath = conf.isTesting ? audioTestPath : defaultUniqueMediaPath;
    if (!fs.existsSync(trueAudioPath)) {
        console.error("audio file do not exists", trueAudioPath)
    }
    playerServer.setAnyValue('isPlaying', true, playerServer)
    console.log("willPlay ", trueAudioPath);
    await vlc.play(trueAudioPath);
    await vlc.repeat(loop);

}

function stopDefault(force) {
    console.log('stopping')
    playerServer.setAnyValue('isPlaying', false, playerServer)
    vlc.stop();

}


function setVolumePct(v, boost) {

    console.log("should set live vol pct to", v, boost);
    if (isPi) {
        const alsa0dB = .86; // more than 86% is over 0dB and may incur distorted sounds
        const pctV = Math.min(alsa0dB, parseFloat(v) * alsa0dB);
        const bostHeadroom = 1. - alsa0dB;
        const boostV = Math.min(bostHeadroom, parseFloat(boost) * bostHeadroom);
        const alsaFinalV = Math.round(100 * (pctV + boostV));
        console.log("setting vol", alsaFinalV, 'from ', pctV * 100, boostV * 100)
        const cmd = "amixer -q -M sset PCM " + alsaFinalV + "%"
        exec(cmd, (err) => {
            if (err) {
                console.err("err while setting volume : ", err)
                return;
            }
            // const actualVol = parseInt(getVolumePct());
            // if (actualVol != alsaFinalV) {
            //     console.error("volume not set properly : wanted", alsaFinalV, "but got ", actualVol);
            // }

        });
    }
    getVolumePct();
}

function getVolumePct() {
    try {
        let cmdRes = ""
        if (isPi) {
            const cmd = "amixer -M sget PCM"
            cmdRes = execSync(cmd).toString();
            // console.log("vol returned ", cmdRes);
        }
        else {
            // for tests on non rpi platforms
            cmdRes = "Simple mixer control 'PCM',0  \n Capabilities: pvolume pvolume - joined pswitch pswitch - joined \n Playback channels: Mono \n Limits: Playback - 10239 - 400 \n Mono: Playback - 804[63%][-8.04dB][on] \n "
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
    playerServer.setAnyValue('isTesting', !conf.isTesting, playerServer);
    stopDefault(true); playDefault();
}
