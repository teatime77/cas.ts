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




}