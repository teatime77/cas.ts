namespace casts {

export function multiply(multiplier : Term, multiplicand : Term) : App {
    if(multiplier.isMul()){
        (multiplier as App).addArg(multiplicand);

        return multiplier as App;
    }
    else if(multiplicand.isMul()){
        (multiplicand as App).insArg(multiplier, 0);

        return multiplicand as App;
    }
    else{
        const mul = new App(operator("*"), [multiplier]);
        multiplicand.replace(mul);
        mul.addArg(multiplicand);
        
        return mul;
    }
}

export function* cancel(app: App, root : Term){
    assert(app.args.length == 1, "cancel");

    const targets = getSubTerms(root, app.args[0]);
    for(const t of targets){
        t.cancel = true;
        const tex = root.tex();
        msg(`tex:[${tex}]`);
        render(mathDiv, tex);
        yield;
    }
}

function showRoot(root : Term){
    root.setParent(null);

    const tex = root.tex();
    msg(`tex:[${tex}]`);
    render(mathDiv, tex);
}

export function* subst(app: App, root : Term){
    assert(app.args.length == 2, "SUBST");

    const targets = getSubTerms(root, app.args[0]);
    for(const t of targets){
        const dst = app.args[1].clone();
        t.replace(dst);

        showRoot(root);
        yield;
    }
}

function muleq3(trm : Term, multiplier : Term) : Term {
    if(trm instanceof App && trm.fncName == "*"){
        trm.args.unshift(multiplier.clone());

        return trm;
    }
    else{
        const app = new App(operator("*"), [multiplier.clone(), trm]);

        return app;
    }
}

function* muleq_add(root : Term, app : App, multiplier : Term) : Generator<Term> {
    for(const [idx, arg] of app.args.entries()){
        app.args[idx] = muleq3(arg, multiplier);

        yield root;
    }
}

export function* muleq2(root : Term, multiplier : Term) : Generator<Term> {
    if(root instanceof App && root.fncName == "=="){
        for(const [idx, trm] of root.args.entries()){
            if(trm instanceof App && trm.fncName == "+"){
                yield* muleq_add(root, trm, multiplier);
            }
            else{
                root.args[idx] = muleq3(trm, multiplier);

                yield root;    
            }
        }
    }
    else if(root instanceof App && root.fncName == "+"){
        yield* muleq_add(root, root, multiplier);
    }
    else{
        yield muleq3(root, multiplier);
    }
}

export function* muleq(app: App, root : Term){
    assert(app.args.length == 1, "mul-eq");

    const multiplier = app.args[0];
    let root2 : Term = root;
    for(const t of muleq2(root, multiplier)){
        root2 = t;
        showRoot(root2);
        yield;
    }

    showRoot(root2);
}

export function* cancelMul(root : Term){
    const mul_terms = allTerms(root).filter(x => x.isMul()) as App[];

    for(const mul of mul_terms){
        if(mul.args.find(x => x.isDiv()) == undefined){
            continue;
        }

        let multipliers : Term[] = [];
        let dividers : Term[] = [];

        for(const trm of mul.args){
            if(trm.isDiv()){
                const div = trm as App;
                if(div.args[0].isMul()){

                    multipliers.push(... (div.args[0] as App).args );
                }
                else{
                    multipliers.push( div.args[0] );
                }

                if(div.args[1].isMul()){

                    dividers.push(... (div.args[1] as App).args );
                }
                else{
                    dividers.push( div.args[1] );
                }
                
            }
            else if(trm.isMul()){

                multipliers.push(... (trm as App).args );
            }
            else{

                multipliers.push( trm );
            }
        }

        multipliers = multipliers.filter(x => ! x.cancel);
        dividers = dividers.filter(x => ! x.cancel);

        for(const m of multipliers){
            const m_str = m.str();
            const d = dividers.find(x => x.str() == m_str);
            if(d == undefined){
                continue;
            }

            m.cancel = true;
            d.cancel = true;

            showRoot(root);
            yield;
        }
    }
}

export function* trimMul(root : Term){
    const canceled = allTerms(root).filter(x => x.cancel);

    for(const can of canceled){
        if(can.parent.isMul()){
            can.remArg();
        }
        else if(can.parent.isDiv()){
            if(can.parent.args[0] == can){
                can.parent.args[0] = new ConstNum(1);
            }
            else if(can.parent.args[1] == can){
                can.parent.args[1] = new ConstNum(1);
            }
            else{
                assert(false, "trim mul 2");
            }
        }

        showRoot(root);
        yield;
    }

    root.setParent(null);
    while(true){
        const bin1 = allTerms(root).find(x => (x.isAdd() || x.isMul()) && (x as App).args.length == 1);
        if(bin1 != undefined){
            bin1.replace((bin1 as App).args[0]);

            showRoot(root);
            yield;
        }

        const mul0 = allTerms(root).find(x => x.isMul() && (x as App).args.length == 0);
        if(mul0 != undefined){

            assert(mul0.parent != null, "trim-mul 3");
            if(mul0.parent.isDiv()){
                mul0.replace(new ConstNum(1));
            }
            else if(mul0.parent.isMul()){
                mul0.remArg();
            }
            else{
                assert(false, "trim-mul 5");
            }

            showRoot(root);
            yield;
        }


        const div = allTerms(root).find(x => x.isDiv() && (x as App).args[1].isOne()) as App;
        if(div != undefined){

            div.replace(div.args[0]);

            showRoot(root);
            yield;
        }

        const one = allTerms(root).find(x => x.isOne() && x.parent.isMul());
        if(one != undefined){
            one.remArg();

            showRoot(root);
            yield;
        }

        if(bin1 == undefined && mul0 == undefined && div == undefined && one == undefined){
            break;
        }
    }
}

export function* moveAdd(cmd : App, root : Term){
    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path && cmd.args[1] instanceof Path, "move");
    
    const src = cmd.args[0] as Path;
    const dst = cmd.args[1] as Path;

    assert(root instanceof App, "move 2");
    const trm = src.getTerm(root as App);

    assert(trm.parent.isAdd(), "move add")

    trm.cancel = true;
    showRoot(root);
    yield;

    trm.remArg();

    showRoot(root);
    yield;

    let parent = dst.getTerm(root as App, true);
    let add : App;
    if(parent.isAdd()){
        add = parent as App;
    }
    else{

        add = new App(operator("+"), []);
        parent.replace(add);
        add.addArg(parent);
    }

    trm.cancel = false;
    trm.value *= -1;
    const idx = last(dst.indexes);
    add.insArg(trm, idx);

    showRoot(root);
}

export function* distfnc(cmd : App, root : App){
    assert(cmd.args.length == 1 && cmd.args[0] instanceof Path, "dist fnc");

    const src = cmd.args[0] as Path;
    const fnc = src.getTerm(root) as App;

    assert(fnc instanceof App, "dist-fnc");
    if(fnc.isMul()){
        const mul = fnc as App;

        assert(2 <= mul.args.length, "dist fnc");
        assert(mul.args[1].isAdd(), "dist fnc 2")

        const multiplier = mul.args[0].clone();
        mul.args[0].cancel = true;
        showRoot(root);
        yield;

        const add = mul.args[1] as App;
        for(const trm of add.args){
            multiply(multiplier.clone(), trm);

            showRoot(root);
            yield;
        }
    }
    else{
        assert(false, "dist fnc");
    }

    yield* cancelMul(root);
    yield* trimMul(root);
}

}