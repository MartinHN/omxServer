import path from 'path'
import { execSync, execFileSync } from "child_process"
import { readFileSync, writeFileSync } from 'fs'
const proc = execSync("uname -a").toString()
export const isPi = proc.includes("armv")
export const thisPath = isPi ? "/home/pi/raspestrio/omxServer" : "/home/tinmar/Dev/raspestrio/omxServer"
const confBasePath = thisPath + "/public/"
const defaultConf = 'app.conf'

export function loadConf(fName) {
    const confPath = confBasePath + (fName || defaultConf)
    try {
        const rawdata = readFileSync(confPath);
        const conf = JSON.parse(rawdata);
        console.log('loaded', conf, 'from', confPath);
        return conf

    } catch (error) {

    }
    return {}
}


export function saveConf(conf, fName) {
    const confPath = confBasePath + (fName || defaultConf)
    setRW(true)
    const jsonContent = JSON.stringify(conf);
    console.log('saving', jsonContent, 'in', confPath);

    writeFileSync(confPath, jsonContent, 'utf8');

    setRW(false)

}

export function isRW() {
    try {
        const out = execSync("mount | grep 'type ext4' | grep rw")
        if (out) { return true }
    } catch (e) {

    }
    return false
}

export const bootedInRW = isRW()

export function setRW(isRW) {
    if (bootedInRW) {
        console.log('ignoring rw as it was booted rw')
        return;
    }
    const out = execFileSync(thisPath + "/src/rw.sh", [isRW ? "rw" : "ro"])
    if (out) console.log("rw out", out.toString());
}
