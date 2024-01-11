namespace casts {
// 

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
    const text = await fetchText("../data/1");
    msg(text);

    parseMath(text);
}

export function bodyOnLoad(){
    main();
}
}