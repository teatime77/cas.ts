var katex : any;
var getUserMacros;

namespace casts {

    
//
export function msg(txt : string){
    console.log(txt);
}

export async function fetchText(fileURL: string) {
    const response = await fetch(fileURL);
    const text = await response!.text();

    return text;
}

export function render(ele: HTMLElement, tex_text: string){
    try{
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



}