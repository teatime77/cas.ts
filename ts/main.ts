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
    let prev_root : App | null = null;

    for(const text of texts.split("\n")){
        if(text.trim() == ""){
            continue;
        }

        const div = document.createElement("div");
        div.innerText = text;
        document.body.appendChild(div);

        const root = parseMath(text);
        if(root.isCommand()){
            mathDiv = document.createElement("div");
            document.body.appendChild(mathDiv);

            prev_root = prev_root.clone();
            prev_root.setParent(null);

            const app = root as App;

            assert(prev_root != null, "gen");

            switch(app.refVar.name){
            case "@cancel":
                yield* cancel(app, prev_root);
                break;

            case "@subst":
                yield* subst(app, prev_root);
                break;

            case "@mulroot":
                yield* mulroot(app, prev_root);
                break;

            case "@moveadd":
                yield* moveAdd(app, prev_root);
                break;

            case "@distfnc":
                yield* distfnc(app, prev_root);
                break;

            case "@gcf":
                yield* greatestCommonFactor(app, prev_root);
                break;

            default:
                assert(false, "gen 2");
                break;
            }
        }
        else if(root instanceof RefVar && root.name[0] == '@'){
            mathDiv = document.createElement("div");
            document.body.appendChild(mathDiv);

            prev_root = prev_root.clone();
            prev_root.setParent(null);

            switch(root.name){
            case "@cancelmul":
                yield* cancelMul(prev_root);
                break;

            case "@trimmul":
                yield* trimMul(prev_root);
                break;


            case "@mulsign":
                yield* mulSign(prev_root);
                break;
                    
            default:
                assert(false, "gen 3");
                break;
            }
        }
        else{
            assert(root instanceof App, "gen 4");
            mathDiv = document.createElement("div");
            document.body.appendChild(mathDiv);

            const tex = root.tex();
            msg(`tex:[${tex}]`);
            render(mathDiv, tex);

            prev_root = root as App;
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