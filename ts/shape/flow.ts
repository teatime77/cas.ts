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

    *gen(speech : Speech) : IterableIterator<string> {
        return "";
    }
}

abstract class TexBlock extends TexNode {
    nodes : TexNode[];

    constructor(nodes : TexNode[]){
        super();
        this.nodes = nodes;
    }

    makeSpeech(phrases : Phrase[]) : void {
    }

}

class TexSync extends TexBlock {
    constructor(nodes : TexNode[]){
        super(nodes);
    }

}

class TexSeq extends TexBlock {
    constructor(nodes : TexNode[]){
        super(nodes);
    }
}

abstract class TexLeaf extends TexNode {
    charPos! : number;

    constructor(){
        super();
    }

    *gen(speech : Speech) : IterableIterator<string> {
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

}

class TexRef extends TexLeaf {
    ref : RefVar;
    constructor(ref : RefVar){
        super();
        this.ref = ref;
    }

    makeSpeech(phrases : Phrase[]) : void {
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

}

function sync(...params:any[]) : TexBlock {
    return new TexSync(params);
}

function join(trms:Term[], delimiter : string) : TexNode {
    const nodes = trms.map(x => makeFlow2(x));
    if(trms.length == 1){
        return makeFlow2(trms[0]);
    }
    else{
        const nodes : TexNode[] = [];
        for(const [i, trm] of trms.entries()){
            if(i != 0){
                nodes.push(new TexStr(delimiter));
            }

            nodes.push(makeFlow2(trm));
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

function makeFlow2(trm : TexNode | Term | string | any[]) : TexNode {
    if(Array.isArray(trm)){
        return new TexSeq(trm.map(x => makeFlow2(x)));
    }
    else if(trm instanceof TexNode){
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

        let nodes : TexNode | (Term | TexNode | string)[] | TexNode[][];

        if(app.fnc instanceof App){

            if(app.fnc instanceof RefVar){

                nodes = [ app.fnc, sync("(", app.args, ")") ]
            }
            else{

                nodes = [ sync("(", app.fnc, ")"), sync("(", app.args, ")") ]
            }
        }
        else if(app.fncName == "lim"){

            nodes = [ sync("\\lim_{", [app.args[1], "\\to", app.args[2]], "}"), app.args[0] ];
        }
        else if(app.fncName == "in"){
            const ids = join(app.args, " , ");
            nodes = [ ids , "\\in" , app.args[1] ];
        }
        else if(app.isDiff()){
            const n = (app.args.length == 3 ? `^{${app.args[2]}}`:``);

            const d = (app.fncName == "diff" ? "d" : "\\partial");

            if(app.args[0].isDiv()){

                nodes = [sync("\\frac{", d, n, "}{", d, app.args[1], n, "}"), sync("(", app.args[0], ")")]
            }
            else{

                nodes = sync("\\frac{", d, n, app.args[0], "}{", d, app.args[1], n, "}")
            }
        }
        else if(isLetterOrAt(app.fncName)){
            if(["sin", "cos"].includes(app.fncName) && ! (app.args[0] instanceof App)){

                nodes = [ app.fnc, app.args[0] ]
            }
            else if(app.fncName == "sqrt"){

                assert(app.args.length == 1);
                return sync("\\sqrt{", app.args[0], "}");
            }
            else{

                nodes = [ app.fnc, sync("(", join(app.args, ","), ")")]
            }
        }
        else{

            switch(app.fncName){
            case "+":
                switch(app.args.length){
                case 0: 
                    throw new MyError();

                case 1:
                    nodes = makeFlow2(app.args[0]);
                    break;

                default:
                    nodes = join(app.args, ` `);
                    break;
                }

            case "/":
                assert(app.args.length == 2);
                nodes = sync("\\frac{", app.args[0], "}{", app.args[1], "}");
                break;

            case "^":
                if(app.args[0] instanceof App && ["sin","cos","tan"].includes(app.args[0].fncName)){

                    const app2 = app.args[0];
                    nodes = [ sync(`${texName(app2.fncName)}^{`, app.args[1], "}"), app2.args[0] ]
                }
                else{

                    nodes = sync("{", app.args[0], "}^{", app.args[1], "}");
                }
                break

            default:
                nodes = join(app.args, ` ${texName(app.fncName)} `);
            }
        }

        if(app.parent != null){

            if((app.isAdd() || app.isMul()) && app.parent.fncName == "lim"){

                nodes = sync("(", nodes, ")");
            }
            else if(app.isOperator() && app.parent.isOperator() && !app.parent.isDiv()){
                if(app.parent.fncName == "^" && app.parent.args[1] == app){
                    ;
                }
                else if(app.parent.precedence() <= app.precedence()){
                    nodes = sync("(", nodes, ")");
                }            
            }
        }

        if(Array.isArray(nodes)){
            return makeFlow2(nodes);
        }
        else{

            return nodes;
        }    
    }
    else{

        throw new MyError();
    }
}

}