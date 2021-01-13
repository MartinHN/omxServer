


///////////
function getIPs(){
    const res = execSync("ifconfig | grep 'inet ' | awk '{print $2}' ;",{shell:'/bin/bash'}).toString().split('\n')
    let i = res.length;
    while (i--){
        if(res[i].startsWith('127') || res[i].length==0){
            res.splice(i,1)
        }
    }
    return res;
}
