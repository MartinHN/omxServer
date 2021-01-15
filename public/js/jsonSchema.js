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

// in osc
const syncObj = new EventEmitter();

class widgSync{
    constructor(el,addr,cb){
        this.el = el
        this.addr  ="/"+addr.join('/');
        syncObj.on("fromServer",msg=>{
            // console.log(msg)
            const saddr = msg.address
            if(this.addr==saddr){
                console.log("fromServer",saddr,msg.args)
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
    if(t=="f" || t=="number"){
        el = document.createElement("input");
        const hasMin = typeObj.minimum!==undefined
        const hasMax = typeObj.maximum!==undefined
        
        el.setAttribute("type", (hasMin && hasMax)?"range":"number");
        if(hasMin){el.setAttribute("min",typeObj.minimum);}
        if(hasMax){el.setAttribute("max",typeObj.maximum);}
        if(hasMin && hasMax){
            el.setAttribute("step",(typeObj.maximum -typeObj.minimum)/255 )
        }
        const wsync = new widgSync(el,addr,v=>{el.value = v});
        el.onchange = ()=>{
            wsync.send(el.valueAsNumber);
        }
        
    }
    else if(t=='b' || t=="boolean"){
        el = document.createElement("input");
        el.setAttribute("type", "checkbox");
        const wsync = new widgSync(el,addr,v=>{el.checked = v});
        el.onchange = ()=>{wsync.send(el.checked?1:0);}
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
        const wsync = new widgSync(el,addr,v=>{});
        el.onclick = ()=>{wsync.send();}
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
        if(schema.members && Object.keys(schema.members).length){
            for(const [k,v] of Object.entries( schema.members)){
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
                if(v.retType && v.retType!="void"){
                    this.widgs[k] = addWidget(cc,{type:v.retType},"",nAddr);
                }

                const fname = document.createElement("div");
                fname.innerHTML = k;
                cc.appendChild(fname)
                const funIn ={}
                if("argTypes" in v){
                    for(let t of Object.values(v.argTypes)){
                        funIn[t] = addWidget(cc,{type:t},"",[])
                    }
                }
                else{
                    funIn[k] = addWidget(cc,{type:'t'},"",nAddr);
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
