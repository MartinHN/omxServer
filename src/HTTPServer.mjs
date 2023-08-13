import http from 'http'
import path from 'path'
import fs from 'fs'
import pump from 'pump'
import { readFileSync } from 'fs'
import WebSocket from "ws";
import osc from 'osc'
import { setRW, thisPath } from './persistent.mjs'
import { httpPort } from './conf.mjs'


const httpHost = '0.0.0.0'
const publicPath = thisPath + "/public"
const uploadPath = publicPath + '/uploads';
if (!fs.existsSync(uploadPath))
    fs.mkdirSync(uploadPath)

// fileHandling



const requestListener = function (req, res) {
    // console.log("!!!!! req",req)
    res.send = s => {
        res.writeHead(200);
        res.end(s)
    }
    if (req.method == 'POST' && req.url.startsWith('/upload/')) {
        // console.log('upload file ',req)
        const localName = req.url.replace('/upload/', '')//req.body.file.or
        const absPath = uploadPath + '/' + localName
        console.log(absPath)
        if (rootNode)
            rootNode.onValueChanged('file_will_upload', localName);// hack to notify others that may use this file  
        setRW(true)
        var dest = fs.createWriteStream(absPath)
        dest.on('close', e => {
            console.log('upload stream closed')
            setRW(false)
        })

        pump(req, dest, err => {
            if (err) {
                console.log("error uploading file", err)
                res.send('' + err);
            } else {
                console.log("uploaded file", localName)
                res.send("success")
            }
        });

    }
    else if (req.url.startsWith('/video/')) {
        const localName = req.url.replace('/video/', '').split('?')[0]
        const absPath = uploadPath + '/' + localName
        if (!fs.existsSync(absPath)) {
            res.writeHead(404)
            res.end();
            return;
        }
        const stat = fs.statSync(absPath)
        const fileSize = stat.size
        const range = req.headers.range
        console.log('streaming video from', absPath, fileSize)
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-")
            const start = Math.min(fileSize - 1, parseInt(parts[0], 10))
            const end = parts[1]
                ? parseInt(parts[1], 10)
                : fileSize - 1
            if ((start >= end) || (start < 0) || (end < 0)) {
                console.log('invalid request')
                res.writeHead(404)
                res.end();
                return
            }
            console.log("range req", start, end);
            const chunksize = (end - start) + 1
            const file = fs.createReadStream(absPath, { start, end })
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            }
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            }
            res.writeHead(200, head)
            fs.createReadStream(absPath).pipe(res)
        }

    }
    else if (req.url == "/") {
        res.writeHead(200);
        res.end(readFileSync(publicPath + "/index.html").toString())
    }
    else if (req.url.startsWith("/js/")) {
        res.writeHead(200);
        const jsLib = readFileSync(publicPath + req.url).toString()
        // console.log(jsLib)
        res.end(jsLib)
    }
    // else if(req.url == ("/jsSchema")){
    //     res.writeHead(200);
    //     const jsS = JSON.stringify({
    //         schema:rootNode.getJSONSchema(),
    //         state:rootNode.getState(),
    //     })
    //     res.end(`const jsSchema =${jsS}`)
    // }
    else if (req.url == ("/wsConf")) {
        res.writeHead(200);
        const jsS = JSON.stringify({
            ip: "rpi.local",
            port: httpPort,
        })
        res.end(`const wsConf =${jsS}`)
    }
    else {
        res.writeHead(404);
        res.end();
    }
};

export const httpServer = http.createServer(requestListener);

// WS

const wss = new WebSocket.Server({
    server: httpServer
});

wss.on("connection", socket => {
    console.log("new wss connected")
    const socketPort = new osc.WebSocketPort({
        socket
    });
    socketPort.instanceName = "ws" + socket.host
    socketPort.on('message', msg => {
        console.log("new msg", msg)
        rootNode.processMsgFromListener(socketPort, msg.address.substr(1).split('/'), msg.args)
    })
    const cb = msg => {
        // console.log('WSSS state changed',msg.address,msg.from.instanceName)
        if (msg.from != socketPort) {
            // console.log('WSSS sending back to client',msg.args)
            socketPort.send({ address: '/' + msg.address.join('/'), args: msg.args })
        }
    }
    socketPort.sendUnpacked = function (address, args) {
        socketPort.send({ address, args })
    }
    rootNode.evts.on("stateChanged", cb)

    socket.on("close", e => {
        console.log("client ws closed")
        wsClis.delete(socketPort);
        rootNode.evts.off("stateChanged", cb)
    })
    wsClis.add(socketPort);

    socketPort.sendUnpacked('/schema', JSON.stringify(rootNode.getJSONSchema()))
    socketPort.sendUnpacked('/state', JSON.stringify(rootNode.getState()))
})

const wsClis = new Set()
export function broadcastToWebClis(address, args) {
    // console.log('broadcasting to wss',address,wsClis.size)
    if (wsClis.size === 0) { return; }
    wsClis.forEach(ws => {
        // console.log('broadcasting to wss',ws);
        ws.send({ address, args });
    })
}

wss.on("close", e => {
    console.log("wss closeed", e)
})

wss.on("error", e => {
    console.log("wss errored")
})
wss.on("listen", e => {
    console.log("wss listen")
})

wss.on("message", e => {
    console.log(e)
})




let rootNode;


export function setup(root) {

    rootNode = root

    httpServer.listen(httpPort, httpHost, () => {
        console.log(`HTTP Server is running on http://${httpHost}:${httpPort}`);
    });
}
