class EventEmitter {
    constructor() {
        this.target = new EventTarget();
    }
    on(eventName, listener) {
        return this.target.addEventListener(eventName, listener);
    }
    once(eventName, listener) {
        return this.target.addEventListener(eventName, listener, { once: true });
    }
    off(eventName, listener) {
        return this.target.removeEventListener(eventName, listener);
    }
    emit(eventName, detail) {
        return this.target.dispatchEvent(new CustomEvent(eventName, { detail, cancelable: true }));
    }
};

const syncObj = new EventEmitter();

class widgSync{
    constructor(addr,cb){
        this.addr  =addr;
        syncObj.on("fromServer",args=>{
            console.log("fromServer",args)
            const saddr = args[0]
            if(addr===saddr){
               cb(args[1])
            }
        })
    }

    send(v){
        syncObj.emit("set",addr,this.value)
    }
};

function addWidget(domP,typeObj,name,addr){
    const t = typeObj.type
    let el;

   const wcont =  document.createElement("div");
    if(t=="f" || t=="number"){
        el = document.createElement("input");
        el.setAttribute("type", "min" in typeObj?"range":"number");
        const wsync = new widgSync(addr,v=>{el.value = v});
        el.onchange = ()=>{
            wsync.send(this.value);
        }
        
    }
    else if(t=="boolean"){
        el = document.createElement("button");
        const wsync = new widgSync(addr,v=>{el.value = v});
        el.onchange = ()=>{wsync.send(this.value);}
    }
    else if(t=="string"){
        el = document.createElement("input");
        el.setAttribute("type", "text");
        const wsync = new widgSync(addr,v=>{el.value = v});
        el.onchange = ()=>{wsync.send(this.value);}
    }
    else if(t=="boolean"){
        el = document.createElement("button");
        const wsync = new widgSync(addr,v=>{el.value = v});
        el.onchange = ()=>{wsync.send(this.value);}
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
    
    parse(schema,base,rootAddr){
        var c = document.createElement("div");
        for(const [k,v] of Object.entries( schema)){
            const nAddr = rootAddr?[...rootAddr,k]:[k]
            if("type" in v){
                addWidget(c,v,k,nAddr)
                
            }
            else{
                const nd = new DOMSchemaContainer()
                nd.parse(v,c,nAddr)
            }
        }
        base.appendChild(c)
    }
}
