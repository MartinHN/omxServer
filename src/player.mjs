import {NodeInstance,APIBase} from './API.mjs' 
import {loadConf,saveConf} from "./persistent.mjs"
//////////////
// API

const api = new APIBase("player")
api.addFunction("play",()=>{playDefault()},[],undefined)
api.addFunction("stop",()=>{if(player.running)player.quit()},[],undefined)
api.addStream("isPlaying",'b',{default:false})
api.addMember('path','s',{default:'/home/pi/raspestrio/omxServer/public/uploads/videoFile'})
api.addMember('volume','f',{default:1,minimum:0,maximum:2})
api.addMember('useHDMI','b',{default:false})
api.addFile('videoFile','video','video.mov')
api.addFunction('save',()=>{
    const nConf = playerInstance.getState()
    saveConf(nConf,'player.json');
},[],undefined)



const playerInstance= new NodeInstance()
playerInstance.setAPI(api);
playerInstance.instanceName = "playerScript"
export default playerInstance ;

const pconf = loadConf('player.json');
playerInstance.restoreState(pconf)

//////////
// logic


const conf =  api.memberGetter();

import Omx from 'node-omxplayer'
import {execSync} from 'child_process'

export function setup(){
    setBlackBackground();
}
export function setBlackBackground(){
    ///////////////
    // set black background on headless pi4
    try{
        execSync("tvservice -p")
    }catch(e){
        console.log('not on a rasp????????',e)
    }
}
// Create an instance of the player with the source.
var player = Omx();
player.on('close',e=>{
    console.log("player ended")
    playerInstance.setAnyValue('isPlaying',false,playerInstance)
})
player.on('error',e=>{
    console.log("player error")
    playerInstance.setAnyValue('isPlaying',false,playerInstance)
})

function playDefault(){
    playerInstance.setAnyValue('isPlaying',true,playerInstance)
    const milibelVolume = Math.round((conf.volume - 1) * 4000)
    console.log("volume",milibelVolume)
    
    player.newSource(conf.path,conf.useHDMI?'hdmi':'local',false,milibelVolume);
    
    
}
