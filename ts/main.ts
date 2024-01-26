namespace casts {

export let mathDiv : HTMLDivElement;
let translation : { [text : string] : string};
const theLang : string = "ja";

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

function heading(text : string){
    const words = text.match(/#+/);
    const n = words[0].length;
    const h = document.createElement(`h${n}`) as HTMLHeadingElement;
    h.innerText = text.substring(n);

    document.body.appendChild(h);
}

function* gen(texts : string){
    const alg = new Algebra();

    for(const text of texts.split("\n")){

        if(text.trim() == "" || text.trim().startsWith("//")){
            continue;
        }

        if(text.startsWith("#")){
            heading(text);
        }
        else{

            const div = document.createElement("div");
            div.innerText = text;
            document.body.appendChild(div);

            // addHtml(" $\\sin$ を $\\cos$ で置換する。");
    
            const expr = parseMath(text);
            if(expr instanceof App && expr.fncName[0] == "@"){
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

                case "@transpose":
                    yield* transpose(app, alg.root);
                    break;

                case "@addside":
                    yield* alg.addSide(app);
                    break;

                case "@distribute":
                    yield* distribute(app, alg.root);
                    break;

                case "@gcf":
                    yield* greatestCommonFactor(app, alg.root);
                    break;

                case "@gcf2":
                    yield* greatestCommonFactor2(app, alg.root);
                    break;

                case "@lowerdiff":
                    yield* lowerdiff(app, alg.root);
                    break;

                case "@diff":
                    yield* calc_diff(app, alg.root);
                    break;

                case "@square":
                    yield* trim_square(app, alg.root);
                    break;

                case "@movearg":
                    yield* movearg(app, alg.root);
                    break;

                case "@splitdiv":
                    yield* splitdiv(app, alg.root);
                    break;

                case "@splitlim":
                    yield* splitlim(app, alg.root);
                    break;

                default:
                    assert(false, "gen 2");
                    break;
                }

                showRoot(alg.root);
            }
            else if(expr instanceof RefVar && expr.name[0] == '@'){
                mathDiv = document.createElement("div");
                document.body.appendChild(mathDiv);

                alg.root = alg.root.clone();
                alg.root.setParent(null);

                switch(expr.name){
                case "@canceladd":
                    yield* cancelAdd(alg.root);
                    break;

                case "@cancelmul":
                    yield* cancelMul(alg.root);
                    break;

                case "@canceldiv":
                    yield* cancelDiv(alg.root);
                    break;

                case "@remcancel":
                    yield* remCancel(alg.root);
                    break;

                case "@trimadd":
                    yield* trimAdd(alg.root);
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
                
                showRoot(alg.root);
            }
            else{
                assert(expr instanceof App, "gen 4");
                mathDiv = document.createElement("div");
                document.body.appendChild(mathDiv);

                const tex = expr.tex();
                render(mathDiv, tex);

                alg.root = expr as App;
            }
        }

        yield;
    }

    msg(`gen root:${alg.root.str()}`);
}

async function readDoc(path: string){
    const texts = await fetchText(`../data/${path}`);
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

function translate(text : string, lang : string = theLang) : string {
    const item = translation[text.replace('-', ' ')];
    if(item != undefined){
        const dst_text = item[lang];
        if(dst_text != undefined){
            return dst_text;
        }
    }

    return text;
}

function makeIndex(parent_ul : HTMLUListElement | HTMLDivElement, parent_dir : any){
    assert(parent_dir != undefined);
    const ul = document.createElement("ul");

    const title_li = document.createElement("li");
    title_li.innerText = translate(parent_dir["title"]);
    ul.appendChild(title_li);

    if(parent_dir["dirs"] != undefined){
        for(const dir of parent_dir["dirs"]){
            makeIndex(ul, dir);
        }    
    }

    if(parent_dir["files"] != undefined && parent_dir["files"].length != 0){

        const files_ul = document.createElement("ul");

        for(const file of parent_dir["files"]){
            const file_li = document.createElement("li");

            const anc = document.createElement("a");
            anc.innerText = translate(file['title']);
            const url = file["url"];
            if(url != undefined){

                anc.href = url;
                anc.target = "_blank";
            }
            else{

                anc.setAttribute("data-path", file['path']);
                anc.addEventListener("click", ()=>{
                    const path = anc.getAttribute("data-path");
                    const new_url = `${window.location.href}?path=${path}`;
                    msg(`url:${new_url}`);

                    window.open(new_url, "_blank");
                });
            }

            file_li.appendChild(anc);
            files_ul.appendChild(file_li);
        }

        ul.appendChild(files_ul);
    }

    parent_ul.appendChild(ul);
}

function makeYoutubeJson(){
    let doc = (document.getElementById("map-iframe") as HTMLIFrameElement).contentWindow.document;

    const gs = doc.getElementsByTagName("g");
    
    let s = "";
    for(const g of Array.from(gs)){
        if(g.id.startsWith("be/")){
            const texts = Array.from(g.getElementsByTagName("text"));
            const text : SVGTextElement = texts[0];
            
            s += `{\n`;
            s += `   "title": "${texts[0].textContent}",\n`;
            s += `   "url"  : "https://youtu.${g.id}"\n`;
            s += `},\n`;
        }
    }
    msg(s);
}

function mergeJson(js1 : any, js2 : any){
    assert(js1["title"] == js2["title"]);

    if(js2["dirs"] != undefined){
        if(js1["dirs"] == undefined){

            js1["dirs"] = js2["dirs"];
        }
        else{

            for(const dir2 of js2["dirs"]){
                const dir1 = js1["dirs"].find(x => x["title"] == dir2["title"]);
                if(dir1 == undefined){
                    js1["dirs"].push(dir2);
                }
                else{
                    mergeJson(dir1, dir2);
                }
            }
        }
    }

    if(js2["files"] != undefined){

        if(js1["files"] == undefined){
            js1["files"] = js2["files"];
        }
        else{

            js1["files"].push(... js2["files"]);
        }
    }
}

async function main() {
    // makeYoutubeJson();

    const url = new URL(window.location.href);
    const params = url.searchParams;
    const path= params.get("path");
    if(path != undefined){
        await readDoc(path);
        return;
    }

    const translation_text = await fetchText(`../data/translation.json`);
    translation = JSON.parse(translation_text);

    const index_text = await fetchText(`../data/index.json`);
    const index = JSON.parse(index_text);

    const youtube_text = await fetchText(`../data/youtube.json`);
    const youtube = JSON.parse(youtube_text);

    mergeJson(index, youtube);

    const div = document.createElement("div");
    makeIndex(div, index)
    document.body.appendChild(div);
}

export function bodyOnLoad(){
    main();
    msg("main end");
}
}