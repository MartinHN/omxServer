import {APIBase} from './API.mjs' 
//////////////
// API

const api = new APIBase()
api.addFunction("play",()=>{playDefault()},[],undefined)
api.addFunction("stop",()=>{if(player.running)player.quit()},[],undefined)
api.addMember('path','s','/home/pi/tst264.mp4')
api.addMember('volume','f',1)

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
    console.log("ended")
})

function playDefault(){
    player.newSource(conf.path,'local',false,conf.volume);
}



export function getAPI(){
    
    return api
}
