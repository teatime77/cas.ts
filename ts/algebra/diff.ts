namespace casts {
//
export function* pulloutDiff(root : App){
    addHtml("微分の中の定数項をくくり出す。");

    const diffs = allTerms(root).filter(x => x.isDiff()) as App[];

    while(diffs.length != 0){
        const diff = diffs.pop()!;

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

        if(diff.parent!.isMul()){

            diff.parent!.insArgs(no_depends, diff.index());
        }
        else{

            const mul2 = new App(operator("*"), no_depends);
            diff.replaceTerm(mul2);
            mul2.addArg(diff);
        }

        
        yield* showRoot(root);
        yield;
    }
}  

export function* lowerdiff(cmd : App, root : App){
    addHtml(`微分の階数を下げる。`);

    assert(cmd.args.length == 1 && cmd.args[0] instanceof Path, "lowerdiff");

    const path = cmd.args[0] as Path;
    const hi_diff = path.getTerm(root) as App;
    assert(hi_diff.isDiff());

    const lo_diff = hi_diff.clone();
    
    // 微分する変数
    const dvar = lo_diff.args[1] as RefVar;
    assert(dvar instanceof RefVar);

    // 微分の階数
    const order = lo_diff.args[2] as ConstNum;
    assert(lo_diff.args.length == 3 && order instanceof ConstNum);

    assert(order.value.denominator == 1);
    order.value.numerator -= 1;
    if(order.value.int() == 1){
        // 1階微分の場合

        // 微分の階数は省略する。
        lo_diff.args.pop();
    }

    const diff = new App(operator(lo_diff.fncName), [ lo_diff, dvar.clone() ]);

    hi_diff.replaceTerm(diff);
}

function diffmul(mul_arg : App, dvar : RefVar) : Term {
    const mul = mul_arg.clone();

    const depends = mul.args.filter(x => x.depend(dvar));
    mul.args = mul.args.filter(x => ! depends.includes(x));

    if(depends.length == 0){

        return new ConstNum(0);
    }
    else if(depends.length == 1){
        
        const trm = diff(depends[0], dvar);
        return multiply(mul, trm);
    }
    else{

        const add = new App(operator("+"), []);

        for(const [idx, dep] of depends.entries()){
            const dep_diff = diff(dep, dvar);
    
            const mul_dep = new App(operator("*"), depends.map(x => x.clone()));
            mul_dep.setArg(dep_diff, idx);
    
            add.addArg(mul_dep);
        }

        mul.addArg(add);

        return mul;
    }
}

function diff(trm : Term, dvar : RefVar) : Term {
    let result : Term | null = null;
    if(trm instanceof ConstNum){
        result = new ConstNum(0);
    }
    else if(trm instanceof RefVar){
        if(trm.eq(dvar)){
            result = new ConstNum(1);
        }
        else{
            result = new ConstNum(0);
        }
    }
    else if(trm instanceof App){
        if(trm.fncName == "^"){
            if(trm.args[0].isE()){
                const exponent_diff = diff(trm.args[1], dvar);
                result = multiply(exponent_diff, trm.clone());
            }
        }
        else if(trm.isMul()){
            result = diffmul(trm, dvar);
        }
    }

    assert(result != null);
    return result!;
}

export function* calc_diff(cmd : App, root : App){
    addHtml(`微分を計算する。`);

    assert(cmd.args.length == 1 && cmd.args[0] instanceof Path, "diff");

    const path = cmd.args[0] as Path;
    const diff_app = path.getTerm(root) as App;
    assert(diff_app.isDiff() && diff_app.args.length == 2);

    const trm = diff_app.args[0];

    // 微分する変数
    const dvar = diff_app.args[1] as RefVar;
    assert(dvar instanceof RefVar);

    const result = diff(trm, dvar);
    diff_app.replaceTerm(result);
}

function square(trm : Term) : Term {
    if(trm instanceof ConstNum){
        return ConstNum.fromRational(mulR(trm.value, trm.value));
    }
    else if(trm.isI()){
        return new ConstNum(-1);
    }
    else if(trm.isSqrt()){
        return (trm as App).args[0].clone();
    }
    else{
        return new App(operator("^"), [ trm.clone(), new ConstNum(2)]);
    }
}

export function* trim_square(cmd : App, root : App){
    addHtml("自乗を計算する。");

    assert(cmd.args.length == 1 && cmd.args[0] instanceof Path, "square");

    const path = cmd.args[0] as Path;
    const mul = path.getTerm(root) as App;
    assert(mul.isMul());
    mul.setStrVal();

    for(let idx = 0; idx < mul.args.length; idx++){
        const trm = mul.args[idx];
        const trm2 = mul.args.slice(idx + 1).find(x => x.eq2(trm));
        if(trm2 != undefined){
            mul.setArg(square(trm), idx);
            trm2.remArg();
        }
    }
}

}