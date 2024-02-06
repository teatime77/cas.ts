var katex : any;
var getUserMacros;
var renderMathInElement : any;

namespace casts {

export function assert(b : boolean, msg : string = ""){
    if(!b){
        throw new Error(msg);
    }
}    

export function msg(txt : string){
    console.log(txt);
}

export function last<T>(v : Array<T>) : T {
    return v[v.length - 1];
}

export async function fetchText(fileURL: string) {
    const response = await fetch(fileURL);
    const text = await response!.text();

    return text;
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
                    onKeypress(ev, span, trm);
                });
            }
        }
    }
    catch(e){
    }
}

export function makeMathDiv(){
    mathDiv = document.createElement("div");
    mathDivRoot.appendChild(mathDiv);
}

export function addHtml(html : string){
    const div = document.createElement("div");
    div.innerHTML = html;
    mathDiv.parentElement.insertBefore(div, mathDiv);

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


}