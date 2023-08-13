import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import { isPi } from "./persistent.mjs";

const vlcBin = isPi ? 'cvlc' : '/Applications/VLC.app/Contents/MacOS/VLC';

// TODO : 
// [ ] crop video out
// [ ] audio compress with --audio-filter compressor
/**
 * A wrapper over the remote control interface of VLC.
 */
export class VlcPlayer {

    /**
     * Create a new instance of the player.
     * 
     * @param {boolean=false} verbose - Tell if the VLC error stream should be relayed to the current process error stream.
     */
    constructor(verbose = false) {
        this._verbose = verbose;
        this._playlist = new Map();
        this._playlistIndex = -1;
    }

    /**
     * Open the VLC media player with an empty playlist. VLC will not take
     * over the display until the first media is added to the playlist.
     */
    async open(opts) {
        if (this.isAlive()) {
            console.error("!!! trying to reopen VLC before close")
            await this.forceKill();
        }
        else {
            console.log("opening vlc")
        }
        return new Promise((resolve, reject) => {
            let options = [
                "-f",
                "--no-playlist-autostart",
                "--no-video-title-show",
                "-I", "rc"
            ];
            if (opts) {
                if (opts.audio) {
                    if (opts.audio.compress) {
                        options.push("--audio-filter", "compressor");
                    }
                }
            }
            try {
                this._vlc = spawn(vlcBin, options);
            }
            catch (err) {
                return reject(err);
            }
            if (this._verbose) {
                this._vlc.stderr.on("data", data => process.stderr.write(data));
            }
            return resolve();
        });
    }

    /**
     * Start playing after being paused or enqueue the given file at the end
     * of the playlist. If the file is already in the playlist, jump to that
     * media position in the playlist instead.
     * 
     * @param {string=} mediaPath - If unspecified, resumes the running video. If a valid media path is specified, start playing that media.
     */
    async play(mediaPath) {
        if (!mediaPath) {
            await this.exec("play");
        }
        else {
            if (!this._playlist.has(mediaPath)) {
                await this.add(mediaPath);
            }
            let index = this._playlist.get(mediaPath);
            await this.exec(`goto ${index}`);
        }
    }

    /**
     * Pause the current media.
     */
    async pause() {
        await this.exec("pause");
    }

    /**
     * Add the specified media at the end of the playlist.
     * 
     * @param {string} mediaPath The path of the media to play.
    */
    async add(mediaPath) {
        if (!fs.existsSync(mediaPath)) {
            throw new Error(`Media '${mediaPath}' not found.`);
        }
        if (this._playlist.has(mediaPath)) {
            throw new Error(`Media '${mediaPath}' already in the playlist.`);
        }
        this._playlist.set(mediaPath, this._playlistIndex);
        this._playlistIndex++;
        await this.exec(`enqueue ${mediaPath}`);
    }

    /**
     * Turns the repeat mode on or off. Loop over the current media until turned off.
     * 
     * @param {string|boolean} [value=true] - Set the repeat mode on or off. Accepts true, false, 'on', 'off'.
     */
    async repeat(value = true) {
        let mode = _onoff(value);
        await this.exec(`repeat ${mode}`);
    }

    async stop() {
        await this.exec(`stop`);
    }

    /**
     * Turns the loop mode on or off. Loop over the whole playlist in order.
     * 
     * @param {string|boolean} [value=true] - Set the loop mode on or off. Accepts true, false, 'on', 'off'.
     */
    async loop(value = true) {
        let mode = _onoff(value);
        await this.exec(`loop ${mode}`);
    }

    /**
     * Terminate the VLC process.
     */
    async close() {
        await this.exec("quit").catch(e => {
            console.error('could not close : ', e);
        }).finally(() => {
            console.log("close ended")
            this._vlc = undefined;
            this._playlist = new Map();
            this._playlistIndex = -1;
        });
    }

    /**
     * Execute any command that the rc (lua) console interface can accept.
     * 
     * @param {string} command - The command to execute.
     */
    exec(command) {
        return new Promise((resolve, reject) => {
            if (!command) {
                return reject("The command parameter must be provided.");
            }
            if (!this._vlc) {
                return reject(`vlc not yet opened but want cmd ${command}`)
            }
            this._vlc.stdin.write(`${command}\n`, err => {
                if (err) reject(err);
                return resolve();
            });
        });
    }


    isAlive() {
        const processIsAlive = () => {
            const cmd = `pgrep ${vlcBin}; echo $?;`;
            const res = execSync(cmd).toString()
            // console.log('isAlive', cmd, res)
            return res == "0"
        }
        return (this._vlc) || processIsAlive()
    }

    async forceKill() {
        console.error("force killlllll")
        await this.close();
        execSync(`killAll ${vlcBin}; echo $?;`)
    }

}

function _onoff(value) {
    if ((value || value === undefined) && value !== "off") {
        return "on";
    }
    return "off";
}
