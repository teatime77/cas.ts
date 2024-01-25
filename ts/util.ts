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
            // newLineInDisplayMode : "ignore",
            macros : getUserMacros()
        });    
    }
    catch(e){
    }
}

export function addHtml(html : string){
    const div = document.createElement("div");
    div.innerHTML = html;
    document.body.appendChild(div);

    if(html.indexOf("$") != -1){
        renderMathInElement(div, {delimiters: [
            {left: "$", right: "$", display: false}
        ]});
    }
}


}