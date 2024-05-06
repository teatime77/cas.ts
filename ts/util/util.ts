var katex : any;
declare let getUserMacros : any;
var renderMathInElement : any;

namespace casts {
const theLang : string = "ja";
export let translation : { [text : string] : { [text : string] : string} };
    
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


export function translate(text : string, lang : string = theLang) : string {
    const item = translation[text.replace('-', ' ')];
    if(item != undefined){
        const dst_text = item[lang];
        if(dst_text != undefined){
            return dst_text;
        }
    }

    return text;
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

// POST メソッドの実装の例
export async function postData(url : string, data : any) {
    try{
        // 既定のオプションには * が付いています
        const response = await fetch(url, {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json",
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(data), // 本体のデータ型は "Content-Type" ヘッダーと一致させる必要があります
        });

        if (!response.ok) {
            throw new Error("Network response was not OK");
        }

        return response.json(); // JSON のレスポンスをネイティブの JavaScript オブジェクトに解釈
    }
    catch (error) {
        console.error("There has been a problem with your fetch operation:", error);
    }
}
  

export function sum(v : number[]) : number {
    return v.reduce((acc, cur) => acc + cur, 0);
}


}