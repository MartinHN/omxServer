function createOneEl(html){
    const template = document.createElement('template');
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild;
}

function createToggle(name,changeCB){
    const  el = document.createElement("input");
    el.setAttribute("type", "button");
    el.setAttribute("value",name);
    el.setValue = (v)=>{
        if(v.length)v=v[0];
        v = v && parseInt(v)!=0;
        el.checked = v
        const onBg="black"
        const offBg="white"
        el.setAttribute("style",`background:${v?onBg:offBg};color:${v?offBg:onBg}`);
        // el.setAttribute("color",v?offBg:onBg);
    }
    el.onclick = ()=>{el.setValue(!el.checked);if(changeCB )changeCB(el.checked?1:0)}
    
    return el
}

function createSlider(name,changeCB,integer,min,max){
    const el = document.createElement("div");
    const vl = document.createElement("div");
    el.appendChild(vl)
    const sl = document.createElement("input");
    const hasMin = min!==undefined
    const hasMax = max!==undefined
    sl.setAttribute("type", (hasMin && hasMax)?"range":"number");
    if(hasMin){sl.setAttribute("min",min);}
    if(hasMax){sl.setAttribute("max",max);}
    if(hasMin && hasMax){
        sl.setAttribute("style","width:100%");
        const step = integer?1:(max -min)/255 
        sl.setAttribute("step",step)
    }
    el.setValue = v=>{
        console.log("set v",v)
        sl.valueAsNumber = v;
        vl.innerHTML = ""+sl.valueAsNumber
    }
    sl.oninput = ()=>{
        if(changeCB){changeCB(sl.valueAsNumber)}
        vl.innerHTML = ""+sl.valueAsNumber
    }
    el.appendChild(sl)
    return el
}

function createImage(name,pxW,pxH,domW,domH){
    const div = document.createElement("div");
    const ctl = document.createElement("div");
    ctl.setAttribute('style','display:flex;flex-direction:row');
    
    const contrastEl = createToggle("contrast")
    ctl.appendChild(contrastEl);
    const normalizeEl = createToggle("normalize")
    ctl.appendChild(normalizeEl);
    normalizeEl.setValue(true);
    const logEl = createToggle("log");
    ctl.appendChild(logEl);
    div.appendChild(ctl)
    const  el = document.createElement("canvas");
    const ctx = el.getContext('2d');
    
    ctx.canvas.width = pxW;
    ctx.canvas.height = pxH;
    el.setAttribute("style", `
    width:${domW}px;
    height:${domH}px;
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;`);
    const imData = ctx.createImageData(pxW,pxH);
    ctx.imageSmoothingEnabled = false;
    console.log('pixel Update',ctx)
    const setValue = v=>{
        if(logEl.checked) console.log('data',v);
        if(normalizeEl.checked){
            for(let i = 0 ;i < v.length ; i++){
                v[i] =v[i]*255
            }
            // console.log(v)
        }
        if(contrastEl.checked){
            let min = 255;
            let max = 0;
            for(const vv of v){
                if(vv < min)min = vv
                if(vv>max)max =vv
            }    
            if(max>min){
                const scaleF = 255/(max-min);
                for(let i = 0 ;i < v.length ; i++){
                    v[i] = (v[i]-min)*scaleF
                }
            }
        }
        
        const pW = 4;
        for(let i = 0 ;i < v.length ; i++){
            const hot = v[i] > 255;
            const cold = v[i] < 1;
            
            imData.data[i*pW] = hot?255:v[i]
            imData.data[i*pW+1] = (hot || cold) ? 0:v[i]
            imData.data[i*pW+2] = cold? 255:hot?0:v[i]
            imData.data[i*pW+3] = 255
        }
        // Update the canvas with the new data
        ctx.putImageData(imData, 0, 0);
    };
    div.appendChild(el)
    div.setValue = setValue;
    return div;
    
}


function futch(url, opts={}, onProgress) {
    return new Promise( (res, rej)=>{
        var xhr = new XMLHttpRequest();
        xhr.open(opts.method || 'post', url);
        for (var k in opts.headers||{})
        xhr.setRequestHeader(k, opts.headers[k]);
        xhr.onload = e => res(e.target.responseText);
        xhr.onerror = rej;
        if (xhr.upload && onProgress)
        xhr.upload.onprogress = onProgress; // event.loaded / event.total * 100 ; //event.lengthComputable
        xhr.send(opts.body);
    });
}

function createFile(name,type){
    const vidContainer = document.createElement('div');
    const input =  createOneEl(`<input type="file" name="${name}" />`);
    const progress = document.createElement('div');
    vidContainer.appendChild(progress)
    progress.hidden = true;
    let vidPlayer;
    function setProgress(p){
        if(p>=1){
            if(!progress.hidden){
                if(vidPlayer){
                    vidPlayer.reload()
                    vidPlayer.hidden = false;
                }
                progress.hidden = true;
            }
        }
        else{
            if(progress.hidden){
                if(vidPlayer){
                    vidPlayer.pause();
                    vidPlayer.hidden = true;
                }
                progress.hidden = false;
            }
            progress.innerHTML='uploading : '+Math.floor(p*100)+"%"
        }
    }
    let upload = (file) => {
        const uploadURL = window.location.href+'upload/'+name
        setProgress(0);
        futch(uploadURL, { // Your POST endpoint
            method: 'POST',
            headers: {
                // Content-Type may need to be completely **omitted**
                // or you may need something
                // "Content-Type": "You will perhaps need to define a content-type here"
            },
            body: file // This is your file object
        },p=>{
            setProgress(p.loaded/p.total);
        })
        .then(response => {console.log("upl resp");console.log(response);setProgress(1);})
        .catch(error => {console.log("upl err",error);setProgress(1);});
    };
    // Event handler executed when a file is selected
    input.addEventListener('change', () => upload(input.files[0]), false);
    vidContainer.appendChild(input)
    if(type=="video"){
        console.log("adding video file")
        const dstSrc = `${window.location.href}video/${name}`;
        const vCtlId = `videoPlayer_${name}`;
        vidPlayer =createOneEl(`
        <video id="${vCtlId}"  style="max-height: 320px;"   controls>
        <source src="${dstSrc}" type="video/mp4">
        </video>
        `)
        vidPlayer.reload = ()=>{
            vidPlayer.pause();
            vidPlayer.currentTime = 0
            vidPlayer.src=dstSrc+"?rd="+Math.floor(Math.random()*1000)
            vidPlayer.load();
        }
        
        vidContainer.appendChild(vidPlayer)
        
    }
    return vidContainer
}
