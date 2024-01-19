namespace casts {
//
export function* pulloutDiff(root : App){
    const diffs = allTerms(root).filter(x => x instanceof App && x.fncName == "pdiff") as App[];

    while(diffs.length != 0){
        const diff = diffs.pop();

        if(! diff.args[0].isMul()){
            continue;
        }
        const mul = diff.args[0] as App;

        const ref = diff.args[1] as RefVar;
        assert(ref instanceof RefVar, "pull out diff");

        const depends : Term[] = [];
        const no_depends : Term[] = [];
        for(const trm of mul.args){
            if( allTerms(trm).some(x => x.eq(ref)) ){
                depends.push(trm);
            }
            else{
                no_depends.push(trm);
            }
        }

        if(no_depends.length == 0){
            continue;
        }

        mul.args = depends;

        if(diff.parent.isMul()){

            diff.parent.insArgs(no_depends, diff.index());
        }
        else{

            const mul2 = new App(operator("*"), no_depends);
            diff.replace(mul2);
            mul2.addArg(diff);
        }

        
        showRoot(root);
        yield;
    }
}    
}