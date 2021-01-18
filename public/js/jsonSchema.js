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
    else if(t=="file"){
        
        el = createFile(name,typeObj.fileType)
        // const wsync = new widgSync(el,addr,v=>{el.setValue(v)});
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
        
        
        if(schema.files && Object.keys(schema.files).length){
            for(const [k,v] of Object.entries( schema.files)){
                const nAddr = rootAddr?[...rootAddr,k]:[k]
                this.widgs[k] = addWidget(c,{type:"file",fileType:v.type},k,nAddr)
            }
        }
        
        if(schema.childs && Object.keys(schema.childs).length){
            // sort them
            for(const k of Object.keys( schema.childs).sort()){
                const v = schema.childs[k]
                const nAddr = rootAddr?[...rootAddr,k]:[k]
                const nd = new DOMSchemaContainer()
                nd.parse(v,c,nAddr)
                this.conts[k] = nd
                
            }
        }
        base.appendChild(c)
    }
    parseState(state,addr){
        console.log("parsing state",addr)
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
