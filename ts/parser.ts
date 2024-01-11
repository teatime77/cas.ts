namespace casts {
// 

const commands : string[] = [
    "@cancel",
    "@subst"
]

function texName(text : string){
    switch(text){
    case "=="     : return "=";
    case "!="     : return "\\ne";
    case "<"      : return "\\gt";
    case ">"      : return "\\lt";
    case "<="     : return "\\ge";
    case ">="     : return "\\le";
    case "*"      : return "\\cdot";
    case "hbar"   : return "\\hbar";
    case "nabla"  : return "\\nabla";
    case "nabla2" : return "\\nabla^2";
    }

    return text;
}

export abstract class Term {
    parent : App | null = null;

    // 係数
    value : number = 1;

    cancel : boolean = false;

    abstract str() : string;
    abstract tex2() : string;
    abstract clone() : Term;

    copy(dst : Term){
        dst.value  = this.value;
        dst.cancel = this.cancel;
    }

    setParent(parent : App | null){
        this.parent = parent;
    }

    replace(target : Term){
        const app : App = this.parent;
        assert(app != null, "replace");

        if(app.refVar == this as unknown){
            app.refVar = target as RefVar;
        }
        else{
            const idx = app.args.findIndex(x => x == this);
            assert(idx != -1, "replace idx");
            app.args[idx] = target;
        }

        target.parent = app;
    }

    tex() : string {
        if(this.cancel){
            return `\\cancel{${this.tex2()}}`
        }
        else{
            return this.tex2();
        }
    }

    isCommand() : boolean{
        if(this instanceof App && this.refVar != null){

            return commands.includes(this.refVar.name);
        }

        return false;
    }
}

export class RefVar extends Term{
    name: string;

    constructor(name: string){
        super();
        this.name = name;
    }

    clone() : RefVar {
        const ref = new RefVar(this.name);
        this.copy(ref);

        return ref;
    }

    str() : string {
        return this.name;
    }

    tex2() : string {
        return texName(this.name);
    }
}


export class ConstNum extends Term{
    value: number;

    constructor(value: number){
        super();
        this.value = value;
    }

    clone() : ConstNum {
        const cns = new ConstNum(this.value);
        this.copy(cns);

        return cns;
    }

    str() : string {
        return this.value.toString();        
    }

    tex2() : string {
        return this.value.toString();
    }
}

export class App extends Term{
    opr : string;
    refVar : RefVar | null = null;
    args: Term[];

    static startEnd : { [start : string] : string } = {
        "(" : ")",
        "[" : "]",
        "{" : "}",
    }

    constructor(opr: string, args: Term[], refVar: RefVar | null = null){
        super();
        this.opr    = opr;
        this.refVar = refVar;
        this.args   = args.slice();
    }

    clone() : App {
        const ref_var = (this.refVar == null ? null : this.refVar.clone());
        const app = new App(this.opr, this.args.map(x => x.clone()), ref_var);

        this.copy(app);

        return app;
    }

    setParent(parent : App){
        super.setParent(parent);

        if(this.refVar != null){
            this.refVar.setParent(this);
        }

        this.args.forEach(x => x.setParent(this));
    }

    str() : string {
        const args = this.args.map(x => x.str());
        
        if(isLetterOrAt(this.opr)){
            const args_s = args.join(", ");
            return `${texName(this.opr)}(${args_s})`;
        }

        if(this.opr == "[]"){
            const args_s = args.join(", ");
            if(this.refVar == null){

                return `[${args_s}`;
            }
            else{

                return `${this.refVar.name}[${args_s}]`;            
            }
        }

        return args.join(` ${this.opr} `);
    }

    tex2() : string {
        const args = this.args.map(x => x.tex());

        if(isLetterOrAt(this.opr)){
            const args_s = args.join(", ");
            return `${texName(this.opr)}(${args_s})`;
        }

        switch(this.opr){
        case "[]":{
            const args_s = args.join(", ");
            if(this.refVar == null){

                return `[${args_s}`;
            }
            else{

                return `${this.refVar.tex()}[${args_s}]`;            
            }
        }
        case ".":
            if(this.refVar == null){
                throw new Error();
            }
            if(this.args.length != 1){
                throw new Error();
            }
            return `${this.refVar.tex()}.${args[0]}`;            

        case "/":
            if(this.args.length != 2){
                throw new Error();
            }
            return `\\frac{${args[0]}}{${args[1]}}`;

        case "^":
            return `${args[0]}^{${args[1]}}`;

        default:
            return args.join(` ${texName(this.opr)} `);
        }
    }

}

export class Parser {
    tokens: Token[];
    token!: Token;

    constructor(text: string){
        this.tokens = lexicalAnalysis(text);
        if(this.tokens.length == 0){
            
        }

        this.next();
    }

    next(){
        if(this.tokens.length == 0){

            this.token = new Token(TokenType.eot, TokenSubType.unknown, "", 0);
        }
        else{

            this.token = this.tokens.shift()!;
        }
    }

    nextToken(text : string){
        if(this.token.text != text){
            throw new Error();
        }

        this.next();
    }

    current(){
        return this.token.text;
    }


    BracketExpression(app: App){
        let start = this.token.text;
        let endMark = App.startEnd[start];
        if(endMark == undefined){
            throw new Error();
        }

        this.next();

        let trm1 = this.AdditiveExpression();
        app.args.push(trm1);

        while(this.token.text == ","){
            this.next();

            let trm2 = this.AdditiveExpression();
            app.args.push(trm2);
        }

        if(this.token.text != endMark){
            throw new Error();
        }
        this.next();
    }

    readArgs(app : App){
        this.nextToken("(");

        while(true){
            const trm = this.Expression();
            app.args.push(trm);

            if(this.token.text == ","){
                this.nextToken(",");
            }
            else{
                break;
            }
        }

        this.nextToken(")");
    }

    PrimaryExpression() : Term {
        let trm : Term;

        if(this.token.typeTkn == TokenType.identifier){
            let refVar = new RefVar(this.token.text);
            this.next();

            if(this.token.text == '['){

                let app = new App("[]", [], refVar);
                this.BracketExpression(app);

                return app;
            }
            else if(this.token.text == '('){

                let app = new App(refVar.name, [], refVar);
                this.readArgs(app);

                return app;
            }
            else if(this.token.text == '.'){
                this.next();

                let trm2 = this.PrimaryExpression();

                let app = new App(".", [ trm2 ], refVar);
                return app;
            }
            else{

                return refVar;
            }
        }
        else if(this.token.typeTkn == TokenType.Number){
            let n = parseFloat(this.token.text);
            if(isNaN(n)){
                throw new Error();
            }

            trm = new ConstNum(n);
            this.next();
        }
        else if(this.token.text == '['){

            let app = new App("[]", []);
            this.BracketExpression(app);

            return app;
        }
        else if(this.token.text == '('){

            this.next();
            trm = this.Expression();

            if(this.current() != ')'){
                throw new Error();
            }
            this.next();

            return trm;
        }
        else{
            throw new Error();
        }

        return trm;
    }

     UnaryExpression() {
        if (this.token.text == "-") {
            // 負号の場合

            this.nextToken("-");

            // 基本の式を読みます。
            const t1 = this.PrimaryExpression();

            // 符号を反転します。
            t1.value *= -1;

            return t1;
        }
        else {

            // 基本の式を読みます。
            return this.PrimaryExpression();
        }
    }

    PowerExpression(){
        const trm1 = this.UnaryExpression();
        if(this.token.text == "^"){

            this.nextToken("^");

            const trm2 = this.PowerExpression();

            return new App("^", [trm1, trm2]);
        }

        return trm1;
    }
    
    MultiplicativeExpression(){
        let trm1 = this.PowerExpression();
        while(this.token.text == "*" || this.token.text == "/"){
            let app = new App(this.token.text, [trm1]);
            this.next();

            while(true){
                let trm2 = this.PowerExpression();
                app.args.push(trm2);
                
                if(this.token.text == app.opr){
                    this.next();
                }
                else{
                    trm1 = app;
                    break;
                }
            }
        }
    
        return trm1;
    }
    
    AdditiveExpression(){
        let trm1 = this.MultiplicativeExpression();
        while(this.token.text == "+" || this.token.text == "-"){
            let app = new App(this.token.text, [trm1]);
            this.next();

            while(true){
                let trm2 = this.MultiplicativeExpression();
                app.args.push(trm2);
                
                if(this.token.text == app.opr){
                    this.next();
                }
                else{
                    trm1 = app;
                    break;
                }
            }
        }

        return trm1;
    }

    RelationalExpression(){
        let trm1 = this.AdditiveExpression();
        while([ "==", "!=", "<", "<=", ].includes(this.token.text)){
            let app = new App(this.token.text, [trm1]);
            this.next();

            while(true){
                let trm2 = this.AdditiveExpression();
                app.args.push(trm2);
                
                if(this.token.text == app.opr){
                    this.next();
                }
                else{
                    trm1 = app;
                    break;
                }
            }
        }

        return trm1;
    }

    Expression(){
        return this.RelationalExpression();
    }
    
}

export function getAllTerms(t : Term, terms: Term[]){
    terms.push(t);

    if(t instanceof App){
        if(t.refVar != null){
            getAllTerms(t.refVar, terms);
        }

        t.args.forEach(x => getAllTerms(x, terms));
    }
}

export function makeTermMap(root : Term) : Map<string, Term>{
    const terms : Term[] = [];
    getAllTerms(root, terms);

    const map = new Map<string, Term>();
    terms.forEach(x => map.set(x.str(), x));

    return map;
}

export function getSubTerms(root : Term, target : Term) : Term[]{
    const terms : Term[] = [];
    getAllTerms(root, terms);

    const target_str = target.str();
    return terms.filter(x => x.str() == target_str );
}
}