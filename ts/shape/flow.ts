namespace casts {
//
class Phrase {
    texNode : TexNode;
    words   : string[];
    start!  : number;
    end!    : number;

    constructor(tex_node : TexNode, words : string[]){
        this.texNode = tex_node;
        this.words   = words;
    }
}

abstract class TexNode {
    abstract makeSpeech(phrases : Phrase[]) : void;

    initString() : string {
        return "";
    }

    *genTex(speech : Speech) : IterableIterator<string> {
        return "";
    }
}

class TexSpeech extends TexNode {
    makeSpeech(phrases : Phrase[]) : void {
    }
}

abstract class TexBlock extends TexNode {
    nodes : TexNode[];

    constructor(nodes : TexNode[]){
        super();
        this.nodes = nodes;
    }

    makeSpeech(phrases : Phrase[]) : void {
        this.nodes.forEach(x => x.makeSpeech(phrases));
    }
}

class TexSync extends TexBlock {
    constructor(nodes : TexNode[]){
        super(nodes);
    }

    *genTex(speech : Speech) : IterableIterator<string> {
        for(const x of this.nodes){
            assert(x instanceof TexNode);
        }
        const arg_strs = this.nodes.map(x => x.initString());

        for(let [idx, node] of this.nodes.entries()){
            for(const s of node.genTex(speech)){
                arg_strs[idx] = s;

                yield `${arg_strs.join(" ")}`;
            }
        }

        yield `${arg_strs.join(" ")}`;
    }
}

class TexSeq extends TexBlock {
    constructor(nodes : TexNode[]){
        super(nodes);
    }

    *genTex(speech : Speech) : IterableIterator<string> {
        const arg_strs : string[] = Array<string>(this.nodes.length).fill("");

        for(let [idx, node] of this.nodes.entries()){
            for(const s of node.genTex(speech)){
                arg_strs[idx] = s;

                yield `${arg_strs.join(" ")}`;
            }
        }

        yield `${arg_strs.join(" ")}`;
    }
}

abstract class TexLeaf extends TexNode {
    charPos! : number;

    constructor(){
        super();
    }

    *genTex(speech : Speech) : IterableIterator<string> {
        while(speech.prevCharIndex < this.charPos) yield "";

        return "";
    }
}

class TexNum extends TexLeaf {
    num : ConstNum;

    constructor(num : ConstNum){
        super();
        this.num = num;
    }

    makeSpeech(phrases : Phrase[]) : void {
    }

    initString() : string {
        return this.num.tex2();
    }

}

class TexRef extends TexLeaf {
    ref : RefVar;
    constructor(ref : RefVar){
        super();
        this.ref = ref;
    }

    makeSpeech(phrases : Phrase[]) : void {
    }

    initString() : string {
        return this.ref.tex2();
    }
}

class TexStr extends TexLeaf {
    str : string;

    constructor(str : string){
        super();
        this.str = str;
    }

    makeSpeech(phrases : Phrase[]) : void {
    }

    initString() : string {
        return this.str;
    }
}

function sync(...params:any[]) : TexSync {
    return new TexSync(params.map(x => makeFlow(x)));
}

function seq(...params:any[]) : TexSeq {
    return new TexSeq(params.map(x => makeFlow(x)));
}

function join(trms:Term[], delimiter : string) : TexNode {
    const nodes = trms.map(x => makeFlow(x));
    if(trms.length == 1){
        return makeFlow(trms[0]);
    }
    else{
        const nodes : TexNode[] = [];
        for(const [i, trm] of trms.entries()){
            if(i != 0){
                nodes.push(new TexStr(delimiter));
            }

            nodes.push(makeFlow(trm));
        }

        return new TexSeq(nodes);
    }
}

let termDicF : { [id : number] : Term } = {};

function htmldataF(trm : Term, text : string) : string {
    termDicF[trm.id] = trm;
    return `\\htmlData{id=${trm.id}, tabidx=${trm.tabIdx}}{${text}}`;
}

function     putValueF(trm : Term, text : string) : string {
    let val : string;

    if(trm instanceof ConstNum){

        val = text;
    }
    else{

        assert(trm.value instanceof Rational);
        if(trm.value.fval() == 1){
            val = text;
        }
        else if(trm.value.fval() == -1){
            // val = "-" + tex2;
            val = `- ${text}`;
        }
        else if(trm.value.denominator == 1){

            val = `${trm.value.numerator} * ${text}`
        }
        else{
            throw new MyError();
        }
    }

    if(trm.parent != null && trm != trm.parent.fnc && trm.parent.isAdd()){
        const idx = trm.parent.args.indexOf(trm);
        assert(idx != -1, "tex");

        if(idx != 0){

            if(0 <= trm.value.fval()){

                val = "+ " + val;
            }
        }
    }

    if(trm.color){
        return `{\\color{red} ${val}}`;
    }

    if(trm.cancel){
        return `\\cancel{${val}}`
    }
    else{
        return val;
    }
}

// function* makeFlow(trm : Term){
//     const text = makeFlow2(trm);
//     return htmldataF(trm, putValueF(trm, text));

// }


export function makeFlow(trm : TexNode | Term | string) : TexNode {
    if(trm instanceof TexNode){
        return trm;
    }
    else if(typeof trm === "string"){
        return new TexStr(trm);
    }
    else if(trm instanceof RefVar){
        const ref = trm;
        return new TexRef(ref);
    }
    else if(trm instanceof ConstNum){
        const num = trm;
        return new TexNum(num);
    }
    else if(trm instanceof App){
        const app = trm;

        let node : TexNode;    // | (Term | TexNode | string)[] | TexNode[][];

        if(app.fnc instanceof App){

            if(app.fnc instanceof RefVar){

                node = seq( app.fnc, sync("(", join(app.args, ","), ")") )
            }
            else{

                node = seq( sync("(", app.fnc, ")"), sync("(", join(app.args, ","), ")") )
            }
        }
        else if(app.fncName == "lim"){

            node = seq( sync("\\lim_{", seq(app.args[1], "\\to", app.args[2]), "}"), app.args[0] );
        }
        else if(app.fncName == "in"){
            const ids = join(app.args, " , ");
            node = seq( ids , "\\in" , app.args[1] );
        }
        else if(app.isDiff()){
            const n = (app.args.length == 3 ? sync("^{", app.args[2], "}") : ``);

            const d = (app.fncName == "diff" ? "d" : "\\partial");

            if(app.args[0].isDiv()){

                node = seq(sync("\\frac{", d, n, "}{", d, app.args[1], n, "}"), sync("(", app.args[0], ")"))
            }
            else{

                node = sync("\\frac{", d, n, app.args[0], "}{", d, app.args[1], n, "}")
            }
        }
        else if(isLetterOrAt(app.fncName)){
            if(["sin", "cos"].includes(app.fncName) && ! (app.args[0] instanceof App)){

                node = seq( app.fnc, app.args[0] )
            }
            else if(app.fncName == "sqrt"){

                assert(app.args.length == 1);
                return sync("\\sqrt{", app.args[0], "}");
            }
            else{

                node = seq( app.fnc, sync("(", join(app.args, ","), ")") )
            }
        }
        else{

            switch(app.fncName){
            case "+":
                switch(app.args.length){
                case 0: 
                    throw new MyError();

                case 1:
                    node = makeFlow(app.args[0]);
                    break;

                default:
                    node = join(app.args, ` `);
                    break;
                }
                break;

            case "/":
                if(app.args.length == 3){
                    msg(`/ 3args [${app.args[0].strval}] [ ${app.args[1].strval}] [ ${app.args[2].strval}]`);
                }
                else if(app.args.length == 1){
                    msg(`/ 1arg [${app.args[0].strval}]`);
                    return makeFlow(app.args[0]);
                }
                else{
                    assert(app.args.length == 2);
                }
                node = sync("\\frac{", app.args[0], "}{", app.args[1], "}");
                break;

            case "^":
                if(app.args[0] instanceof App && ["sin","cos","tan"].includes(app.args[0].fncName)){

                    const app2 = app.args[0];
                    node = seq( sync(`${texName(app2.fncName)}^{`, app.args[1], "}"), app2.args[0] )
                }
                else{

                    node = sync("{", app.args[0], "}^{", app.args[1], "}");
                }
                break

            default:
                node = join(app.args, ` ${texName(app.fncName)} `);
                break
            }
        }

        if(app.parent != null){

            if((app.isAdd() || app.isMul()) && app.parent.fncName == "lim"){

                node = sync("(", node, ")");
            }
            else if(app.isOperator() && app.parent.isOperator() && !app.parent.isDiv()){
                if(app.parent.fncName == "^" && app.parent.args[1] == app){
                    ;
                }
                else if(app.parent.precedence() <= app.precedence()){
                    node = sync("(", node, ")");
                }            
            }
        }

        return node;
    }
    else{

        throw new MyError();
    }
}

}