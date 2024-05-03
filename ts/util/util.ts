var katex : any;
declare let getUserMacros : any;
var renderMathInElement : any;

namespace casts {

export class MyError extends Error {
    constructor(text : string = ""){
        super();
    }
}

export function assert(b : boolean, msg : string = ""){
    if(!b){
        throw new MyError(msg);
    }
}    

export function msg(txt : string){
    console.log(txt);
}

export function getAncestors(index : Index) : DbItem[] {
    const path : DbItem[]= [];

    for(let section = index.parent; section != null; section = section.parent){
        path.push(section);
    }

    return path;
}

export function range(n: number) : number[]{
    return [...Array(n).keys()];
}

export function last<T>(v : Array<T>) : T {
    return v[v.length - 1];
}

export function remove<T>(v : Array<T>, x : T){
    const idx = v.indexOf(x);
    assert(idx != undefined);
    v.splice(idx, 1);
}

export async function doGenerator(iterator : Generator, timeout : number){
    return new Promise((resolve)=>{
        const timer_id = setInterval(()=>{
            if(iterator.next().done){
                // ジェネレータが終了した場合
        
                clearInterval(timer_id);
                resolve(undefined);
                console.log("ジェネレータ 終了");
            }        
        }, timeout);    
    });
}

export async function fetchText(fileURL: string) {
    const response = await fetch(fileURL);
    const text = await response!.text();

    return text;
}

export async function fetchJson(fileURL: string) {
    const text = await fetchText(fileURL);
    return JSON.parse(text);
}

export function render(ele: HTMLElement, tex_text: string){
    try{
        ele.innerHTML = "";
        
        katex.render(tex_text, ele, {
            throwOnError: false,
            displayMode : true,
            trust : true,
            // newLineInDisplayMode : "ignore",
            macros : getUserMacros()
        });

        
        const term_spans = Array.from(ele.getElementsByClassName("enclosing")) as HTMLSpanElement[];
        for(const span of term_spans){
            const id_str     = span.getAttribute("data-id");
            const tabidx_str = span.getAttribute("data-tabidx");
            if(id_str != null && tabidx_str != null){
                const id = parseInt(id_str);
                const tabidx = parseInt(tabidx_str);

                const trm = termDic[id];
                assert(trm != undefined);

                span.tabIndex = tabidx;
                span.addEventListener("keypress", (ev : KeyboardEvent)=>{
                    ev.stopPropagation();
                    if(ev.key == " "){
                        searchCandidate(trm);
                    }
                });
                span.addEventListener("keydown", (ev:KeyboardEvent)=>{
                    if(ev.key == "ArrowLeft"){
                        ChangeOrder.move(trm, -1);
                    }
                    else if(ev.key == "ArrowRight"){
                        ChangeOrder.move(trm,  1);
                    }
                });
            }
        }
    }
    catch(e){
    }
}

export function makeMathDiv(){
    mathDiv = document.createElement("div");
    mathDiv.className = "math-div";
    mathDivRoot.appendChild(mathDiv);
}

export function addHtml(html : string){
    const div = document.createElement("div");
    div.innerHTML = html;
    mathDiv.parentElement!.insertBefore(div, mathDiv);

    if(html.indexOf("$") != -1){
        renderMathInElement(div, {
            delimiters : [ 
                {left: "$", right: "$", display: false}
            ],
            trust : true
        });
    }
}

export function addDiv(html : string){
    const div = document.createElement("div");
    div.innerHTML = html;
    mathDivRoot.appendChild(div);
}

export function mulR(... rs : Rational[]) : Rational {
    const numerator   = rs.reduce((acc, cur) => acc * cur.numerator,   1);
    const denominator = rs.reduce((acc, cur) => acc * cur.denominator, 1);

    return new Rational(numerator, denominator);
}

export function sum(v : number[]) : number {
    return v.reduce((acc, cur) => acc + cur, 0);
}


}