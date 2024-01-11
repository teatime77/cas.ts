namespace casts {
// 
let mathDiv : HTMLDivElement;

export function parseMath(text: string) : Term {
    let parser = new Parser(text);
    let trm = parser.Expression();
    if(parser.token.typeTkn != TokenType.eot){
        throw new Error();
    }
    msg("parse end");

    return trm;
}

async function main() {
    mathDiv = document.getElementById("math-div") as HTMLDivElement;

    const text = await fetchText("../data/1.txt");
    msg(text);

    const root = parseMath(text);
    const tex = root.tex();
    msg(`tex:[${tex}]`);
    render(mathDiv, tex);
}

export function bodyOnLoad(){
    main();
}
}