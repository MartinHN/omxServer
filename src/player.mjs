import {NodeInstance,APIBase} from './API.mjs' 
//////////////
// API

const api = new APIBase()
api.addFunction("play",()=>{playDefault()},[],undefined)
api.addFunction("stop",()=>{if(player.running)player.quit()},[],undefined)
api.addStream("isPlaying",'b',{default:false})
api.addMember('path','s',{default:'/home/pi/tst264.mp4'})
api.addMember('volume','f',{default:1,minimum:0,maximum:3})

//////////
// logic


const conf =  api.memberGetter();

import Omx from 'node-omxplayer'
import {execSync} from 'child_process'
///////////////
// set black background on headless pi4
try{
    execSync("tvservice -p")
}catch(e){
    console.log('not on a rasp????????',e)
}

// Create an instance of the player with the source.
var player = Omx();
player.on('close',e=>{
    console.log("player ended")
    playerInstance.setAnyValue('isPlaying',false)
})
player.on('error',e=>{
    console.log("player error")
    playerInstance.setAnyValue('isPlaying',false)
})

function playDefault(){
    playerInstance.setAnyValue('isPlaying',true)
    player.newSource(conf.path,'local',false,conf.volume);
    
}

const playerInstance= new NodeInstance()
playerInstance.setAPI(api);

export default playerInstance ;
