import { EventEmitter } from 'events'
function typeToJSONType(v) {
    if (v == 's') return 'string'
    if (v == 'f') return 'number'
    if (v == 'b') return 'boolean'
    if (v == 'i') return 'integer'
    // if(v=='s')return'string'

    return v
}
export class APIBase {
    __functions = {}
    __members = {}
    __streams = {}
    __files = {}
    __orderedMemberNames = []

    constructor(name) {
        this.apiName = name
    }
    addFunction(name, fun, argTypes, retType) {
        this.__functions[name] = { fun, argTypes, retType }
        this.__orderedMemberNames.push(name)
    }

    addStream(name, type, opts) {
        this.__streams[name] = { type, opts }
        this.__orderedMemberNames.push(name)
    }

    addMember(name, type, opts) {
        this.__members[name] = { type, value: opts.default, opts };
        Object.defineProperty(this.__members[name], 'getter', {
            get: () => { return this.__members[name].value }
        })
        this.__orderedMemberNames.push(name)
    }

    addFile(name, type, localPath) {
        this.__files[name] = { type, path: localPath }
        this.__orderedMemberNames.push(name)
    }


    getJSONSchema() {
        const res = {};
        if (this.__members && Object.keys(this.__members).length) {
            const members = {}
            for (const [k, v] of Object.entries(this.__members)) {
                members[k] = { type: typeToJSONType(v.type), minimum: v.opts.minimum, maximum: v.opts.maximum, readonly: v.opts.readonly }
            }
            res.members = members
        }

        if (this.__streams && Object.keys(this.__streams).length) {
            const streams = {}
            for (const [k, v] of Object.entries(this.__streams)) {
                streams[k] = { type: v.type, ...v.opts }
            }
            res.streams = streams
        }

        if (this.__files && Object.keys(this.__files).length) {
            const files = {}
            for (const [k, v] of Object.entries(this.__files)) {
                files[k] = { type: v.type, ...v.opts }
            }
            res.files = files
        }

        if (this.__functions && Object.keys(this.__functions).length) {
            const funs = {}
            for (const [k, v] of Object.entries(this.__functions)) {
                funs[k] = { retType: typeToJSONType(v.retType) }
                if (v.argTypes && v.argTypes.length) {
                    funs[k].argTypes = v.argTypes.map(typeToJSONType)
                }

            }
            res.functions = funs;
        }

        if (this.__orderedMemberNames && Object.keys(this.__orderedMemberNames).length) {
            res.orderedMemberNames = this.__orderedMemberNames.slice()
        }
        return res;
    }


    // Helper
    memberGetter() {
        return new Proxy(this, {
            get(target, k, rcv) {
                if (k in target.__members) {
                    return target.__members[k].value
                }
                if (k in target.__streams) {
                    return target.__streams[k].value
                }
            }
        })
    }

    setAnyFrom(from, name, args) {
        // console.log("calling or setting ",name)
        if (name in this.__members) {
            this.__members[name].value = args.length ? args[0] : args
            return this.__members[name].value
        }
        else if (name in this.__streams) {
            this.__streams[name].value = args
            return this.__streams[name].value
        }
        else if (name in this.__functions) {
            return this.__functions[name].fun.call(this, args);
        }
        else {
            console.error('not found member/function', name)
        }
    }
}

class RemoteAPI extends APIBase {
    constructor(apiName, jsSchema, isRemoteRoot, remoteCb) {
        super(apiName);

        this.isRemoteRoot = isRemoteRoot;
        this.remoteCb = remoteCb;
        if (jsSchema.members) {
            for (const [k, v] of Object.entries(jsSchema.members)) {
                const minimum = v.min != undefined ? v.min : v.minimum
                const maximum = v.max != undefined ? v.max : v.maximum
                this.addMember(k, v.type, { default: v.default, minimum, maximum });
            }
        }
        if (jsSchema.functions) {
            for (const [k, v] of Object.entries(jsSchema.functions)) {
                let f = {}
                if (typeof (v) === "string") {
                    const spl = v.replace(')', '').split('(')
                    f.ret = spl[0]
                    f.argTypes = spl[1] ? spl[1].split(',') : []

                } else {
                    f = v
                }
                // console.log('adding function ',k,f.ret,f.argTypes)
                this.addFunction(k, () => { }, f.argTypes, f.ret);
            }
        }

        if (jsSchema.streams) {
            for (const [k, v] of Object.entries(jsSchema.streams)) {
                const minimum = v.min != undefined ? v.min : v.minimum
                const maximum = v.max != undefined ? v.max : v.maximum
                this.addStream(k, v.type, { default: v.default, minimum, maximum });
                // console.log('adding stream ',k,v.type)
            }
        }

        if (remoteCb) {
            this.parentHierarchyChanged = (path) => {
                if (this.remoteCb) {
                    if (this.oldRootEvts) {
                        console.log("removing listener for api", this.apiName)
                        this.oldRootEvts.off("stateChanged", this.stateChangedCb.bind(this));
                        this.oldRootEvts = null;
                    }
                    if (path && path.root) {
                        this.rootAddress = path.address.slice()
                        console.log("adding listener for api", this.apiName)
                        this.oldRootEvts = path.root.evts;
                        path.root.evts.on("stateChanged", this.stateChangedCb.bind(this));
                    }
                    // console.log("register relative listener",path.address)
                }
            }
        }

    }
    stateChangedCb(msg) {
        if (msg.isStream) { return }
        if (!this.remoteCb) { return }
        // console.log("api rcvd state change")


        const msgAddr = msg.address.slice()
        const commonPart = msgAddr.splice(0, this.rootAddress.length);
        // console.log('relative check addr',this.rootAddress,commonPart)
        if (this.rootAddress.join('/') == commonPart.join('/')) {
            const relMsg = { address: msgAddr, args: msg.args, from: msg.from };
            // console.log("calling relative listener",msgAddr)
            this.remoteCb(relMsg)
        }

    }

    close() {

    }



}


export class NodeInstance {
    childs = {}
    onValueChanged = undefined; //(cname,args,from)=>{...}
    setAPI(a) {
        this.api = a;
    }

    setRoot() {
        this.evts = new EventEmitter()
        this.isRoot = true;
    }

    getJSONSchema() {
        const res = this.api.getJSONSchema();
        if (this.childs && Object.keys(this.childs).length) {
            res['childs'] = {}
            const childs = res['childs'];
            for (const [k, v] of Object.entries(this.childs)) {
                childs[k] = v.getJSONSchema()
            }
        }
        return res;

    }

    addChild(name, c) {
        this.childs[name] = c;
        c.parentNode = this;
        c.nameInParent = name;
        // console.log("adding child",name)
        if (c.api.parentHierarchyChanged) {
            c.api.parentHierarchyChanged(c.getDepthPath())
        }
    }

    removeChild(name) {
        const ch = this.childs[name]
        if (ch) {
            ch.parentNode = null;
            ch.nameInParent = "";
            if (ch.api.parentHierarchyChanged) {
                ch.api.parentHierarchyChanged(null)
            }
            delete this.childs[name]
        }
    }

    getDepthPath(childName) {
        let insp = this;
        let lastInsp = insp;
        const els = []
        while (insp) {
            lastInsp = insp
            els.push(insp)
            insp = insp.parentNode
        }
        els.reverse();
        const root = lastInsp
        if (!root.isRoot) {
            console.error('!!! path on detached elem', els)
        }
        const address = els.map(e => e.nameInParent);
        address.splice(0, 1);
        if (childName) address.push(childName)

        return { address, root, els };
    }

    restoreState(s) {
        if (this.api) {
            const mb = this.api.__members;
            for (const [k, v] of Object.entries(s)) {
                if (k in mb) {
                    mb[k].value = v
                }
            }
        }
        const childs = s;//s['childs'];
        if (childs) {
            for (const [k, v] of Object.entries(childs)) {
                const existingChild = this.childs[k];
                if (existingChild) {
                    existingChild.restoreState(v);
                }
            }
        }
    }

    getState(ignoreRemoteChilds = false) {
        const res = {}

        if (this.api) {
            const mb = this.api.__members;
            for (const [k, v] of Object.entries(mb)) {
                res[k] = v.value
            }
        }
        const ch = this.childs
        if (ch && Object.keys(ch).length) {

            // res['childs'] = {};
            const cdic = res;//['childs']
            for (const [k, v] of Object.entries(ch)) {
                if (!ignoreRemoteChilds || !v.api.isRemoteRoot)
                    cdic[k] = v.getState();
            }
        }
        return res
    }

    setAnyValue(cName, args, from) {
        const value = this.api.setAnyFrom(from, cName, args)
        const path = this.getDepthPath(cName);
        if (this.onValueChanged)
            this.onValueChanged(cName, args, from);
        // console.log("sending state change from",from.instanceName,path.address)
        path.root.evts.emit("stateChanged", { from, address: path.address, args: value })
    }

    processMsgFromListener(from, addressSpl, args) {

        if (addressSpl && addressSpl.length == 1) {
            const cName = addressSpl[0]
            this.setAnyValue(cName, args, from);
        }
        else if (addressSpl[0] in this.childs) {
            const k = addressSpl.shift()
            this.childs[k].processMsgFromListener(from, addressSpl, args)
        } else {
            console.error(addressSpl[0], 'not found in', this.childs)
        }
    }

    getChildsWithAPIType(t) {
        // TODO use getChildsIfPredicate
        let res = []
        for (const c of Object.values(this.childs)) {
            const cAPIs = c.getChildsWithAPIType(t);
            if (cAPIs.length)
                res = res.concat(cAPIs)
        }
        if (this.api.apiName == t) {
            res.push(this);
        }
        return res;

    }

    getChildsIfPredicate(fun, preventSubChilds) {
        let res = []
        const ImIn = fun(this);
        if (ImIn) {
            res.push(this);
        }
        if (!preventSubChilds || !ImIn) {
            for (const c of Object.values(this.childs)) {
                const cAPIs = c.getChildsIfPredicate(fun, preventSubChilds);
                if (cAPIs.length)
                    res = res.concat(cAPIs)
            }
        }
        return res;
    }

}

export function createRemoteInstanceFromSchema(apiName, schema, isRoot = true, rootCb = undefined) {
    const i = new NodeInstance()
    // console.log('new schema',schema)
    i.setAPI(new RemoteAPI(apiName, schema, isRoot, rootCb))
    if (schema.childs) {
        for (const [k, v] of Object.entries(schema.childs)) {
            i.addChild(k, createRemoteInstanceFromSchema(apiName + "_" + k, v, false))
        }
    }
    return i
}
