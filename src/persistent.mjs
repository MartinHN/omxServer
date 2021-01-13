import path from 'path'
import { execSync, execFileSync } from "child_process"
import {readFileSync, writeFileSync} from 'fs'

let basePath = '/home/pi/omxPlayer'
let pPath=basePath+"playerConf.json"
export function setBaseDir(d){
    basePath = d;
    pPath=basePath+"/playerConf.json"
}


function saveWhenPerm(conf){
    const jsonContent = JSON.stringify(conf);
    console.log(jsonContent);
    
    writeFileSync(pPath, jsonContent, 'utf8');
}

export function loadConf(){
    try {
        const rawdata = readFileSync(pPath);
        return JSON.parse(rawdata);
        
    } catch (error) {
        
    }
    return {}
}


export  function saveConf(conf){
    let out;
    try{
        out = execSync("mount | grep 'type ext4' | grep rw")
        
    }catch(e){
        
    }
    if(out){
        console.log("already in rw mode")
        saveWhenPerm(conf)
        return;
    }
    console.log('continuing')
    out =  execFileSync(basePath+"rw.sh",["rw"])
    if(out)console.log("out",out);
    
    saveWhenPerm(conf)
    
    out =  execFileSync(basePath+"rw.sh",["ro"])
    
}
