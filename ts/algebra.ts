namespace casts {

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

}