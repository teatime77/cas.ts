namespace casts {
// 
let mathDiv : HTMLDivElement;

export function parseMath(text: string) : Term {
    let parser = new Parser(text);
    let trm = parser.Expression();
    if(parser.token.typeTkn != TokenType.eot){
        throw new Error();
    }
    msg("parse end");

    trm.setParent(null);

    return trm;
}

function* cancel(app: App, root : Term){
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

function* subst(app: App, root : Term){
    assert(app.args.length == 2, "SUBST");

    const targets = getSubTerms(root, app.args[0]);
    for(const t of targets){
        const dst = app.args[1].clone();
        t.replace(dst);
        root.setParent(null);

        const tex = root.tex();
        msg(`tex:[${tex}]`);
        render(mathDiv, tex);
        yield;
    }
}

function* gen(texts : string){
    let prev_root : Term | null = null;

    for(const text of texts.split("\n")){
        if(text.trim() == ""){
            continue;
        }

        const root = parseMath(text);
        if(root.isCommand()){
            const app = root as App;

            assert(prev_root != null, "gen");

            switch(app.refVar.name){
            case "@cancel":
                yield* cancel(app, prev_root);
                break;

            case "@subst":
                yield* subst(app, prev_root);
                break;

            default:
                assert(false, "gen 2");
                break;
            }
        }
        else{
            mathDiv = document.createElement("div");
            document.body.appendChild(mathDiv);

            const tex = root.tex();
            msg(`tex:[${tex}]`);
            render(mathDiv, tex);

            prev_root = root;
        }

        yield;
    }
}



async function main() {
    const texts = await fetchText("../data/1.txt");
    msg(texts);

    const iterator = gen(texts);

    const timer_id = setInterval(()=>{
        if(iterator.next().done){
            // ジェネレータが終了した場合
    
            clearInterval(timer_id);
            console.log("ジェネレータ 終了");
        }        
    }, 100);
}

export function bodyOnLoad(){
    main();
    msg("main end");
}
}