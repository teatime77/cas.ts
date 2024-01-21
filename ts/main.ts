namespace casts {

export let mathDiv : HTMLDivElement;

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

function* gen(texts : string){
    const alg = new Algebra();

    for(const text of texts.split("\n")){

        if(text.trim() == "" || text.trim().startsWith("//")){
            continue;
        }

        const div = document.createElement("div");
        div.innerText = text;
        document.body.appendChild(div);

        const expr = parseMath(text);
        if(expr.isCommand()){
            mathDiv = document.createElement("div");
            document.body.appendChild(mathDiv);

            alg.root = alg.root.clone();
            alg.root.setParent(null);

            const app = expr as App;

            assert(alg.root != null, "gen");

            switch(app.refVar.name){
            case "@cancel":
                yield* cancel(app, alg.root);
                break;

            case "@subst":
                yield* subst(app, alg.root);
                break;

            case "@mulroot":
                yield* alg.mulRoot(app);
                break;

            case "@moveadd":
                yield* moveAdd(app, alg.root);
                break;

            case "@distribute":
                yield* distribute(app, alg.root);
                break;

            case "@gcf":
                yield* greatestCommonFactor(app, alg.root);
                break;

            default:
                assert(false, "gen 2");
                break;
            }
        }
        else if(expr instanceof RefVar && expr.name[0] == '@'){
            mathDiv = document.createElement("div");
            document.body.appendChild(mathDiv);

            alg.root = alg.root.clone();
            alg.root.setParent(null);

            switch(expr.name){
            case "@cancelmul":
                yield* cancelMul(alg.root);
                break;

            case "@remcancel":
                yield* remCancel(alg.root);
                break;

            case "@trimmul":
                yield* trimMul(alg.root);
                break;

            case "@mulsign":
                yield* mulSign(alg.root);
                break;

            case "@putoutdiff":
                yield* pulloutDiff(alg.root);
                break;
                    
            default:
                assert(false, "gen 3");
                break;
            }
        }
        else{
            assert(expr instanceof App, "gen 4");
            mathDiv = document.createElement("div");
            document.body.appendChild(mathDiv);

            const tex = expr.tex();
            render(mathDiv, tex);

            alg.root = expr as App;
        }

        yield;
    }

    msg(`gen root:${alg.root.str()}`);
}



async function main() {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const id = params.get("id");

    const texts = await fetchText(`../data/${id}.txt`);
    msg(texts);

    const iterator = gen(texts);

    const timer_id = setInterval(()=>{
        if(iterator.next().done){
            // ジェネレータが終了した場合
    
            clearInterval(timer_id);
            console.log("ジェネレータ 終了");
        }        
    }, 1);
}

export function bodyOnLoad(){
    main();
    msg("main end");
}
}