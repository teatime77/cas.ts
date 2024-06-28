namespace casts {

export let mathDivRoot : HTMLDivElement;
export let mathDiv : HTMLDivElement;
export let stopGen : boolean = false;
let docsIndex : any;

function heading(text : string){
    const words = text.match(/#+/)!;
    const n = words[0].length;

    addDiv(`<h${n}>${text.substring(n)}</${n}>`);
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
        else if(2 <= text.length && text[0] == "@" && ' \t\n\r\v'.indexOf(text[1]) != -1){

            addDiv(text.substring(2).trim());
        }
        else if(text.startsWith("@title")){
            addDiv(`<h1>${text.substring("@title".length)}</h1>`);
        }
        else if(text.startsWith("@show")){
            continue;
        }       
        else{
    
            const expr = parseMath(text);
            if(expr instanceof App && expr.fncName[0] == "@"){
                const app = expr as App;

                if(app.refVar!.name == "@formula"){

                    alg.setRoot(app.args[0].clone() as App);
                    continue;
                }

                makeMathDiv();

                alg.root = alg.root!.clone();
                alg.root.setParent(null);


                assert(alg.root != null, "gen");

                switch(app.refVar!.name){
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
                    yield* alg.appendSide(app);
                    break;

                case "@addpm":
                    yield* addpm(app, alg.root);
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
                    yield* splitLim(app, alg.root);
                    break;

                case "@show":
                    show(app, alg.root);
                    break;

                case "@factor_out_div":
                    yield* factor_out_div(app, alg.root);
                    break;

                case "@verify":
                    yield* zeroOneAddMul(alg.root);
                    yield* verify(app, alg.root);
                    return;

                default:
                    assert(false, "gen 2");
                    break;
                }

                alg.root.setParent(null);
                alg.root.verifyParent(null);

                yield* showRoot(alg.root);
            }
            else if(expr instanceof RefVar && expr.name[0] == '@'){
                makeMathDiv();

                alg.root = alg.root!.clone();
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
                    yield* removeCanceledTerms(alg.root);
                    break;

                case "@trimadd":
                    yield* simplifyNestedAddAll(alg.root);
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
                
                alg.root.setParent(null);
                alg.root.verifyParent(null);

                yield* showRoot(alg.root);
            }
            else{
                assert(expr instanceof App, "gen 4");
                alg.setRoot(expr as App);
            }
        }

        yield;
    }

    yield* zeroOneAddMul(alg.root!);
    msg(`result root: ${alg.root!.str()}`);
}

async function readDoc(path: string){
    const texts = await fetchText(`../data/${path}`);
    msg(texts);

    let timeout:number;
    if(path.indexOf("physics") == -1){
        timeout = 1;
    }
    else{
        timeout = 1;
    }

    const iterator = gen(texts);

    await doGenerator(iterator, timeout);
    console.log("do generator end");
}

function* genDocPath(parent_dir : any) : any {
    if(parent_dir["dirs"] != undefined){
        for(const dir of parent_dir["dirs"]){
            if(stopGen){
                return;
            }

            yield* genDocPath(dir);
        } 
    }
   
    if(parent_dir["files"] != undefined){
        for(const file of parent_dir["files"]){
            const path = file['path'] as string;
            msg(`path:${path}`);

            let texts : string = "";
            fetchText(`../data/${path}`).then((rcv : string)=>{
                texts = rcv;
            });

            while(texts == ""){
                yield;
            }

            mathDivRoot.innerHTML = "";

            for(const g of gen(texts)){
                if(stopGen){
                    return;
                }
                yield;
            }
        }
    }
}

export function stopDocGen(){
    stopGen = true;
    cancelSpeech();
}


export function readAllDoc(){
    const use_speech_chk = document.getElementById("use-speech") as HTMLInputElement;
    if(use_speech_chk != undefined && !use_speech_chk.checked){
        useSpeech = false;
    }
    const use_flow_chk = document.getElementById("use-flow") as HTMLInputElement;
    if(use_flow_chk != undefined && !use_flow_chk.checked){
        useFlow = false;
    }

    const iterator = genDocPath(docsIndex);

    const timer_id = setInterval(()=>{
        if(iterator.next().done){
            // ジェネレータが終了した場合
    
            clearInterval(timer_id);
            console.log("ジェネレータ 終了");
        }        
    }, 1);
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
                const path = file['path'];
    
                anc.setAttribute("data-path", path);
                anc.addEventListener("click", ()=>{
                    const path = anc.getAttribute("data-path");
                    const new_url = `${window.location.href}?path=${path}`.replace("index.html", "play.html");
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
    let doc = (document.getElementById("map-iframe") as HTMLIFrameElement).contentWindow!.document;

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
                const dir1 = js1["dirs"].find((x: { [x: string]: any; }) => x["title"] == dir2["title"]);
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

async function main(page : string) {    
    await includeDialog();
    
    mathDivRoot = document.getElementById("math-div-root") as HTMLDivElement;

    const translation_text = await fetchText(`../data/translation.json`);
    translation = JSON.parse(translation_text);

    initSpeech();
    
    if(page == "edit"){

        initAction();
    }

    const url = new URL(window.location.href);
    const params = url.searchParams;

    if(page == "firebase" || params.get("db") != undefined){

        await initContents(page);
    }

    if(page == "edit"){
        showContents();
    }

    const index_text = await fetchText(`../data/index.json`);
    docsIndex = JSON.parse(index_text);

    const youtube_text = await fetchText(`../data/youtube.json`);
    const youtube = JSON.parse(youtube_text);

    // mergeJson(index, youtube);
    // makeYoutubeJson();

    const path= params.get("path");
    if(path != undefined){
        await readDoc(path);
        return;
    }

    if(params.get("all") != undefined){
        return;
    }

    if(page == "index"){

        const div = document.createElement("div");
        makeIndex(div, docsIndex)
        document.body.appendChild(div);
    }

    if(page == "edit" || page == "shape"){
        initShape();
    }
}

export function bodyOnLoad(page : string){
    main(page);
}


}