// class MyEventEmitter {
//     constructor() {
//         this.target = new EventTarget();
//     }
//     on(eventName, listener) {
//         return this.target.addEventListener(eventName, listener);
//     }
//     once(eventName, listener) {
//         return this.target.addEventListener(eventName, listener, { once: true });
//     }
//     off(eventName, listener) {
//         return this.target.removeEventListener(eventName, listener);
//     }
//     emit(eventName, detail) {
//         return this.target.dispatchEvent(new CustomEvent(eventName, { detail, cancelable: true }));
//     }
// };


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
    const el = document.createElement("input");
    const hasMin = min!==undefined
    const hasMax = max!==undefined
    el.setAttribute("type", (hasMin && hasMax)?"range":"number");
    if(hasMin){el.setAttribute("min",min);}
    if(hasMax){el.setAttribute("max",max);}
    if(hasMin && hasMax){
        el.setAttribute("style","width:100%");
        const step = integer?1:(max -min)/255 
        el.setAttribute("step",step)
    }
    el.setValue = v=>{
        el.valueAsNumber = v;
    }
    el.oninput = ()=>{
        if(changeCB){changeCB(el.valueAsNumber)}
        
    }
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
// in osc.js
const syncObj = new EventEmitter();

class widgSync{
    constructor(el,addr,cb){
        this.el = el
        this.addr  ="/"+addr.join('/');
        syncObj.on("fromServer",msg=>{
            // console.log("from Server",msg)
            const saddr = msg.address
            if(this.addr==saddr){
                // console.log("fromServer to local cb",saddr,msg.args)
                cb(msg.args)
            }
        })
    }
    
    send(args){
        syncObj.emit("toServer",{address:this.addr,args})
    }
};

function addWidget(domP,typeObj,name,addr){
    const t = typeObj.type
    let el;
    
    
    const wcont =  document.createElement("div");
    if(t=="f" || t=="number" || t =="i" || t == "integer"){
        el = createSlider(name,v=>{wsync.send(v)},(t=="i" || t=="integer"),typeObj.minimum,typeObj.maximum)
        const wsync = new widgSync(el,addr,v=>{el.setValue(v)});
    }
    else if(t=='b' || t=="boolean"){
        el = createToggle(name,v=>{wsync.send(v)})
        const wsync = new widgSync(el,addr,v=>{el.setValue(v)});
        name = ""
    }
    else if(t=='s' || t=="string"){
        el = document.createElement("input");
        el.setAttribute("type", "text");
        const wsync = new widgSync(el,addr,v=>{el.value = v});
        el.onchange = ()=>{wsync.send(el.value);}
    }
    else if(t=='t' || t=="trigger"){
        console.log('trig',name)
        el = document.createElement("input");
        el.setAttribute("type", "button");
        el.setAttribute("value",name);
        name = ""
        const wsync = new widgSync(el,addr,v=>{});
        el.onclick = ()=>{wsync.send();}
    }
    else if(t=="pixels"){
        name=""
        el = createImage(name,typeObj.width,typeObj.height,300,300)
        const wsync = new widgSync(el,addr,v=>{el.setValue(v)});
    }
    
    if(!el){
        console.error("no type found for ",t)
    }
    
    if(el){
        wcont.innerHTML = name;
        wcont.appendChild(el);
        domP.appendChild(wcont);
    }
    return el;
    
    
    
}


class DOMSchemaContainer{
    conts = {}
    widgs  ={}
    parse(schema,base,rootAddr){
        this.conts = {}
        this.widgs = {}
        const subH = document.createElement("h3");
        subH.innerHTML = rootAddr?rootAddr.join('/'):'root'
        base.appendChild(subH)
        const c = document.createElement("div");
        c.setAttribute('style',"display: flex;flex-direction: column");
        
        if(schema.members && Object.keys(schema.members).length){
            for(const [k,v] of Object.entries( schema.members)){
                const nAddr = rootAddr?[...rootAddr,k]:[k]
                if("type" in v){
                    this.widgs[k] = addWidget(c,v,k,nAddr)
                    
                }
            }
        }
        if(schema.streams && Object.keys(schema.streams).length){
            for(const [k,v] of Object.entries( schema.streams)){
                const nAddr = rootAddr?[...rootAddr,k]:[k]
                if("type" in v){
                    this.widgs[k] = addWidget(c,v,k,nAddr)
                    
                }
            }
        }
        if(schema.functions && Object.keys(schema.functions).length){
            for(const [k,v] of Object.entries( schema.functions)){
                const cc = document.createElement("span");
                cc.setAttribute('style','display:flex')
                const nAddr = rootAddr?[...rootAddr,k]:[k]
                if(v.retType && v.retType!="void" && v.retType!="v"){
                    this.widgs[k] = addWidget(cc,{type:v.retType},"",nAddr);
                }
                
                const fname = document.createElement("div");
                fname.innerHTML = "";
                cc.appendChild(fname)
                const funIn ={}
                funIn[k] = addWidget(cc,{type:'t'},k,nAddr);
                if("argTypes" in v){
                    for(let t of Object.values(v.argTypes)){
                        funIn[t] = addWidget(cc,{type:t},"",[])
                    }
                }
                
                
                c.appendChild(cc);
            }
        }
        
        
        if(schema.childs && Object.keys(schema.childs).length){
            for(const [k,v] of Object.entries( schema.childs)){
                
                const nAddr = rootAddr?[...rootAddr,k]:[k]
                const nd = new DOMSchemaContainer()
                nd.parse(v,c,nAddr)
                this.conts[k] = nd
                
            }
        }
        base.appendChild(c)
    }
    parseState(state,addr){
        addr = addr || []
        for(const [k,v] of Object.entries(state))
        {
            // console.log('parse',k,(Object.keys(this.widgs)),Object.keys(this.conts))
            if(k in this.widgs)
            syncObj.emit("fromServer",{address:'/'+[...addr,k].join('/'),args:v})
            else if (k in this.conts)
            this.conts[k].parseState(v,[...addr,k])
        }
    }
}
