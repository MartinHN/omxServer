
function typeToJSONType(v){
    if(v=='s')return'string'
    if(v=='f')return'number'
    // if(v=='s')return'string'
    
    return v
}
export class APIBase{
    __functions = {}
    __members = {}
    addFunction(name, fun, args,retType){
        this.__functions[name] ={fun,args,retType}
    }
    
    addMember(name,type,defaultValue){
        this.__members[name] = {type,value:defaultValue,defaultValue};
        Object.defineProperty(this.__members[name],'getter',{
            get:()=>{return this.__members[name].value}
        })
    }
    
    
    getJSONSchema(){
        const res  ={members:{}}
        const props = res.members
        for(const [k,v] of Object.entries(this.__members)){
            props[k] = {type:typeToJSONType(v.type)}
        }
        return res;
    }
    
    
    // Helper
    memberGetter(){
        return new Proxy(this.__members,{
            get(target,k,rcv){
                return target[k].value
            }
        })
    }
}

class RemoteAPI  extends APIBase{
    constructor(jsSchema){
        super();
        if(jsSchema.members){
            for(const [k,v] of Object.entries(jsSchema.members)){
                this.addMember(k,v.type,v.default);
            }
        }
        
    }
    
}


export class NodeInstance{
    childs={}
    setAPI(a){
        this.api = a;
    }
    
    
    
    getJSONSchema(){
        const res = this.api.getJSONSchema();
        if(this.childs){
            res['childs']  ={}
            const childs  =res['childs'];
            for(const [k,v] of Object.entries(this.childs)){
                childs[k] = v.getJSONSchema()
            }
        }
        return res;
        
    }
    addChild(name,c){
        this.childs[name] = c;
    }
    
    restoreState(s){
        if(this.api){
            const mb = this.api.__members;
            for(const [k,v] of Object.entries(s)){
                if(k in mb){
                    mb[k].value = v
                }
            }
        }
        const childs = s;//s['childs'];
        if(childs){
            for(const [k,v] of Object.entries(childs)){
                const existingChild = this.childs[k];
                if(existingChild){
                    existingChild.restoreState(v);
                }
            }
        }
    }
    
    getState(){
        const res = {}
        
        if(this.api){
            const mb = this.api.__members;
            for(const [k,v] of Object.entries(mb)){
                res[k] = v.value
            }
        }
        const ch = this.childs
        if(ch && Object.keys(ch).length){
            
            // res['childs'] = {};
            const cdic = res;//['childs']
            for(const [k,v] of Object.entries(ch)){
                cdic[k] = v.getState();
            }
        }
        return res
    }
    
}

export function createInstanceFromSchema(schema){
    const i = new NodeInstance()
    i.setAPI(new RemoteAPI(schema))
    if(schema.childs){
        for(const [k,v] of Object.entries(schema.childs)){
            i.addChild(k,createInstanceFromSchema(v))
        }
    }
    return i
}
