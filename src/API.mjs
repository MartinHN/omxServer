
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
        const res  ={type:"object",properties:{}}
        const props = res.properties
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


export class NodeInstance{
    childs={}
    setAPI(a){
        this.api = a;
    }
    
    getJSONSchema(){
        return this.api.getJSONSchema()
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
        const childs = s['/'];
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
        console.log(Object.keys(this))
        if(this.api){
            const mb = this.api.__members;
            for(const [k,v] of Object.entries(mb)){
                res[k] = v.value
            }
        }
        const ch = this.childs
        if(ch && Object.keys(ch).length){
            console.log(ch);
            res['/'] = {};
            for(const [k,v] of Object.entries(ch)){
                res[k] = v.getState();
            }
        }
        return res
    }
    
}
