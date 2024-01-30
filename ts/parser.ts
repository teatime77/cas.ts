namespace casts {

export const pathSep = ":";

function isGreek(text : string) : boolean {
    const greeks = [
        "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", 
        "vartheta", "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "varpi", "rho", "varrho", 
        "sigma", "varsigma", "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega"
    ];

    if(greeks.includes(text)){
        return true;
    }

    const lower_case = text[0].toLowerCase() + text.substring(1);    
    if(greeks.includes(lower_case)){
        return true;
    }

    return false;
}

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
    case "sin"  :
    case "cos"  :
        return `\\${text}`;
    }

    if(isGreek(text)){
        return `\\${text}`;
    }

    const fnc_names = [ "sin", "cos", "sqrt" ]

    return text;
}

let termId : number = 0;

export class Rational{
    numerator : number = 1;
    denominator : number = 1;
    parent : Term = null;

    constructor(numerator : number, denominator : number = 1){
        this.numerator = numerator;
        this.denominator = denominator;
    }

    is(numerator : number, denominator : number = 1) : boolean{
        return(this.numerator == numerator && this.denominator == denominator);
    }

    set(numerator : number, denominator : number = 1){
        this.numerator   = numerator;
        this.denominator = denominator;
    }

    clone() : Rational {
        return new Rational(this.numerator, this.denominator);
    }

    str() : string {
        if(this.denominator == 1){

            return `${this.numerator}`;
        }
        else{

            return `${this.numerator} / ${this.denominator}`;
        }
    }

    tex() : string {
        if(this.denominator == 1){

            return `${this.numerator}`;
        }
        else{

            return `\\frac{${this.numerator}}{${this.denominator}}`;
        }
    }

    setmul(... rs : Rational[]){
        this.numerator   *= rs.reduce((acc, cur) => acc * cur.numerator,   1);
        this.denominator *= rs.reduce((acc, cur) => acc * cur.denominator, 1);
    }

    setdiv(r : Rational){
        this.numerator   *= r.denominator;
        this.denominator *= r.numerator;
    }

    fval() : number {
        return this.numerator / this.denominator;
    }

    abs() : number {
        return Math.abs(this.fval());
    }

    setAbs() {
        this.numerator   = Math.abs(this.numerator);
        this.denominator = Math.abs(this.denominator);
    }

    int() : number {
        assert(this.denominator == 1);
        return this.numerator;
    }

    sign() : number {
        return Math.sign(this.fval());
    }
}

export abstract class Term {
    id : number;
    parent : App | null = null;
    strval : string;

    // 係数
    value : Rational = new Rational(1);

    cancel : boolean = false;
    color  : boolean = false;

    constructor(){
        this.id = termId++;
    }

    abstract tex2() : string;
    abstract clone() : Term;

    eq(trm : Term) : boolean {
        return this.str() == trm.str();
    }

    eq2(trm : Term) : boolean {
        return this.strval == trm.strval;
    }

    copy(dst : Term){
        dst.value  = this.value.clone();
        dst.cancel = this.cancel;
    }

    setParent(parent : App | null){
        this.parent = parent;
        this.value.parent = this;
    }

    verifyParent(parent : App | null){
        assert(this.parent == parent);
        assert(this.value.parent == this)
    }

    setStrVal(){
        this.strval = this.str();
    }

    replace(target : Term){
        const app : App = this.parent;
        assert(app != null, "replace");

        if(app.fnc == this){
            app.fnc = target;
        }
        else{
            const idx = app.args.findIndex(x => x == this);
            assert(idx != -1, "replace idx");
            app.args[idx] = target;
        }

        target.parent = app;
    }

    index() : number {
        assert(this.parent != null, "index 1");
        const idx = this.parent.args.indexOf(this);
        assert(idx != -1, "index 2");

        return idx;
    }

    remArg() {
        assert(this.parent != null, "rem arg 1");
        const idx = this.parent.args.indexOf(this);
        assert(idx != -1, "rem arg 2");
        this.parent.args.splice(idx, 1);
    }

    putValue(text : string) : string {
        let val : string;

        if(this instanceof ConstNum){

            val = text;
        }
        else{

            assert(this.value instanceof Rational);
            if(this.value.fval() == 1){
                val = text;
            }
            else if(this.value.fval() == -1){
                // val = "-" + tex2;
                val = `- ${text}`;
            }
            else if(this.value.denominator == 1){

                val = `${this.value.numerator} * ${text}`
            }
            else{
                assert(false);
            }
        }

        if(this.parent != null && this != this.parent.fnc && this.parent.isAdd()){
            const idx = this.parent.args.indexOf(this);
            assert(idx != -1, "tex");

            if(idx != 0){

                if(0 <= this.value.fval()){

                    val = "+ " + val;
                }
            }
        }

        if(this.color){
            return `{\\color{red} ${val}}`;
        }

        if(this.cancel){
            return `\\cancel{${val}}`
        }
        else{
            return val;
        }
    }

    str2() : string {
        assert(false, "str2");
        return "";
    }


    str() : string {
        const text = this.str2();
        return this.putValue(text);
    }

    tex() : string {
        const text = this.tex2();
        return this.putValue(text);
    }

    isOperator() : boolean {
        return this instanceof App && this.precedence() != -1;
    }

    isEq() : boolean {
        return this instanceof App && this.fncName == "==";
    }

    isAdd() : boolean {
        return this instanceof App && this.fncName == "+";
    }

    isMul() : boolean {
        return this instanceof App && this.fncName == "*";
    }

    isDiv() : boolean {
        return this instanceof App && this.fncName == "/";
    }

    isSqrt() : boolean {
        return this instanceof App && this.fncName == "sqrt";
    }

    isZero() : boolean {
        return this.value.numerator == 0;
    }

    isOne() : boolean {
        return this instanceof ConstNum && this.value.fval() == 1;
    }

    isE() : boolean {
        return this instanceof RefVar && this.name == "e";
    }

    isI() : boolean {
        return this instanceof RefVar && this.name == "i";
    }

    isDiff() : boolean {
        return this instanceof App && (this.fncName == "diff" || this.fncName == "pdiff");
    }

    depend(dvar : RefVar) : boolean {
        return allTerms(this).some(x => dvar.eq(x));
    }
}

export class Path extends Term {
    indexes : number[] = [];

    constructor(indexes : number[]){
        super();
        this.indexes = indexes.slice();
    }

    str() : string {
        return `#${this.indexes.join(".")}`;
    }

    tex2() : string {
        assert(false, "path:tex2");
        return "";
    }

    clone() : Term {
        const path = new Path(this.indexes);
        this.copy(path);
        path.setStrVal();

        return path;
    }

    getTerm(root : App, get_parent : boolean = false) : Term {
        let app = root;
    
        const last_i = (get_parent ? this.indexes.length - 2 : this.indexes.length - 1);

        for(const [i, idx] of this.indexes.entries()){
            if(i == last_i){
    
                return app.args[idx];
            }
            else{
                assert(app.args[idx] instanceof App, "pass:get term");
                app = app.args[idx] as App;
            }
        }
        assert(false, "get term");
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
        ref.setStrVal();

        return ref;
    }

    str2() : string {
        return this.name;
    }

    tex2() : string {
        return texName(this.name);
    }
}


export class ConstNum extends Term{
    constructor(numerator : number, denominator : number = 1){
        super();
        this.value = new Rational(numerator, denominator);
    }

    static fromRational(r : Rational) : ConstNum {
        return new ConstNum(r.numerator, r.denominator);
    }

    clone() : ConstNum {
        const cns = new ConstNum(this.value.numerator, this.value.denominator);
        this.copy(cns);
        cns.setStrVal();

        return cns;
    }

    str2() : string {
        return this.value.str();        
    }

    str() : string {
        return this.value.str();        
    }

    tex2() : string {
        return this.value.tex();
    }
}

export class App extends Term{
    fnc : Term;
    args: Term[];

    static startEnd : { [start : string] : string } = {
        "(" : ")",
        "[" : "]",
        "{" : "}",
    }

    get refVar() : RefVar | null {
        if(this.fnc != null && this.fnc instanceof RefVar){
            return this.fnc;
        }
        else{
            return null;
        }
    }

    get fncName() : string {
        if(this.fnc instanceof RefVar){
            return this.fnc.name;
        }
        else{
            return `no-fnc-name`;
        }
    }


    constructor(fnc: Term, args: Term[]){
        super();
        this.fnc    = fnc;
        this.args   = args.slice();

        this.args.forEach(x => x.parent = this);
    }

    clone() : App {
        const app = new App(this.fnc.clone(), this.args.map(x => x.clone()));

        this.copy(app);
        app.setStrVal();

        return app;
    }

    setParent(parent : App){
        super.setParent(parent);

        this.fnc.setParent(this);

        this.args.forEach(x => x.setParent(this));
    }


    verifyParent(parent : App){
        super.verifyParent(parent);

        this.fnc.verifyParent(this);

        this.args.forEach(x => x.verifyParent(this));
    }

    setStrVal(){
        this.strval = this.str();
        this.fnc.setStrVal();
        this.args.forEach(x => x.setStrVal());
    }

    str2() : string {
        const args = this.args.map(x => x.str());
        
        let text : string;
        if(this.fnc instanceof App){
            const args_s = args.join(", ");
            text = `(${this.fnc.str()})(${args_s})`;
        }
        else if(isLetterOrAt(this.fncName)){
            const args_s = args.join(", ");
            text = `${this.fncName}(${args_s})`;
        }
        else{

            switch(this.fncName){
                case "+":
                    switch(args.length){
                    case 0: return " +[] ";
                    case 1: return ` +[${args[0]}] `;
                    }
                    text = args.join(` `);
                    break
    
                case "/":
                    if(this.args.length != 2){
                        throw new Error();
                    }
                    text = `${args[0]} / ${args[1]}`;
                    break
        
                default:
                    text = args.join(` ${this.fncName} `);
                    break
            }
        }

        if(this.isOperator() && this.parent != null && this.parent.isOperator()){
            if(this.parent.precedence() <= this.precedence()){
                return `(${text})`;
            }            
        }

        return text;
    }

    tex2() : string {
        const args = this.args.map(x => x.tex());

        let text : string;
        if(this.fnc instanceof App){

            const args_s = args.join(", ");
            text = `(${this.fnc.tex()})(${args_s})`;
        }
        else if(this.fncName == "lim"){
            text = `\\lim_{${args[1]} \\to ${args[2]}} ${args[0]}`;
        }
        else if(this.isDiff()){
            const n = (this.args.length == 3 ? `^${args[2]}`:``);

            const d = (this.fncName == "diff" ? "d" : "\\partial");

            if(args[0].indexOf("\\frac") == -1){

                text = `\\frac{ ${d} ${n} ${args[0]}}{ ${d}  ${args[1]}${n}}`;
            }
            else{

                text = `\\frac{ ${d} ${n} }{ ${d}  ${args[1]}${n}} (${args[0]})`;
            }
        }
        else if(isLetterOrAt(this.fncName)){
            if(["sin", "cos"].includes(this.fncName) && ! (this.args[0] instanceof App)){

                text = `${texName(this.fncName)} ${args[0]}`;
            }
            else if(this.fncName == "sqrt"){
                assert(args.length == 1, "tex2");
                text = `\\sqrt{${args[0]}}`;
            }
            else{

                const args_s = args.join(", ");
                text = `${texName(this.fncName)}(${args_s})`;
            }
        }
        else{

            switch(this.fncName){
            case "+":
                switch(args.length){
                case 0: return " +[] ";
                case 1: return ` +[${args[0]}] `;
                }
                text = args.join(` `);
                break

            case "/":
                if(this.args.length != 2){
                    throw new Error();
                }
                text = `\\frac{${args[0]}}{${args[1]}}`;
                break

            case "^":
                if(this.args[0] instanceof App && ["sin","cos","tan"].includes(this.args[0].fncName)){

                    const app = this.args[0];
                    text = `${texName(app.fncName)}^{${args[1]}} ${app.args[0].tex()}`;
                }
                else{

                    text = `${args[0]}^{${args[1]}}`;
                }
                break

            default:
                text = args.join(` ${texName(this.fncName)} `);
                break
            }
        }

        if((this.isAdd() || this.isMul()) && this.parent.fncName == "lim"){

            return `(${text})`;
        }
        else if(this.isOperator() && this.parent != null && this.parent.isOperator() && !this.parent.isDiv()){
            if(this.parent.fncName == "^" && this.parent.args[1] == this){
                return text;
            }

            if(this.parent.precedence() <= this.precedence()){
                return `(${text})`;
            }            
        }

        return text;
    }

    precedence() : number {
        switch(this.fncName){
        case "^": 
            return 0;

        case "/": 
            return 1;

        case "*": 
            return 2;

        case "+": 
        case "-": 
            return 3;
        }

        return -1;
    }

    setArg(trm : Term, idx : number){
        this.args[idx] = trm;
        trm.parent = this;
    }
    
    addArg(trm : Term){
        this.args.push(trm);
        trm.parent = this;
    }

    addArgs(trms : Term[]){
        this.args.push(... trms);
        trms.forEach(x => x.parent = this);
    }

    insArg(trm : Term, idx : number){
        this.args.splice(idx, 0, trm);
        trm.parent = this;
    }

    insArgs(args : Term[], idx : number){
        assert(idx != -1, "ins parent mul 1");

        const args_cp = args.slice();
        while(args_cp.length != 0){
            const trm = args_cp.pop();
            this.insArg(trm, idx);
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

            if(this.token.text == '('){

                let app = new App(refVar, []);
                this.readArgs(app);

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
        else if(this.token.typeTkn == TokenType.path){
            assert(this.token.text[0] == "#", "parse path");
            const indexes = this.token.text.substring(1).split(pathSep).map(x => parseFloat(x));
            trm = new Path(indexes);

            this.next();
        }
        else if(this.token.text == '('){

            this.next();
            trm = this.Expression();

            if(this.current() != ')'){
                throw new Error();
            }
            this.next();

            if(this.token.text == '('){

                let app = new App(trm, []);
                this.readArgs(app);

                return app;
            }

            return trm;
        }
        else{
            throw new Error();
        }

        return trm;
    }

    PowerExpression() : Term {
        const trm1 = this.PrimaryExpression();
        if(this.token.text == "^"){

            this.nextToken("^");

            const trm2 = this.PowerExpression();

            return new App(operator("^"), [trm1, trm2]);
        }

        return trm1;
    }

    UnaryExpression() : Term {
        if (this.token.text == "-") {
            // 負号の場合

            this.nextToken("-");

            // 基本の式を読みます。
            const t1 = this.PowerExpression();

            // 符号を反転します。
            t1.value.numerator *= -1;

            return t1;
        }
        else {

            // 基本の式を読みます。
            return this.PowerExpression();
        }
    }

    
    DivExpression() : Term {
        let trm1 = this.UnaryExpression();
        while(this.token.text == "/"){
            let app = new App(operator(this.token.text), [trm1]);
            this.next();

            while(true){
                let trm2 = this.UnaryExpression();
                app.args.push(trm2);
                
                if(this.token.text == app.fncName){
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

    
    MultiplicativeExpression() : Term {
        let trm1 = this.DivExpression();
        while(this.token.text == "*"){
            let app = new App(operator(this.token.text), [trm1]);
            this.next();

            while(true){
                let trm2 = this.DivExpression();
                app.args.push(trm2);
                
                if(this.token.text == app.fncName){
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
    
    AdditiveExpression() : Term {
        let nagative : boolean = false;
        if(this.token.text == "-"){
            nagative = true;
            this.next();
        }

        const trm1 = this.MultiplicativeExpression();
        if(nagative){
            trm1.value.numerator *= -1;
        }

        if(this.token.text == "+" || this.token.text == "-"){
            let app = new App(operator("+"), [trm1]);

            while(this.token.text == "+" || this.token.text == "-"){
                const opr = this.token.text;
                this.next();

                const trm2 = this.MultiplicativeExpression();
                if(opr == "-"){
                    trm2.value.numerator *= -1;
                }

                app.addArg(trm2);
            }

            return app;
        }

        return trm1;
    }

    RelationalExpression() : Term {
        let trm1 = this.AdditiveExpression();
        while([ "==", "!=", "<", "<=", ].includes(this.token.text)){
            let app = new App(operator(this.token.text), [trm1]);
            this.next();

            while(true){
                let trm2 = this.AdditiveExpression();
                app.args.push(trm2);
                
                if(this.token.text == app.fncName){
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

    Expression() : Term {
        return this.RelationalExpression();
        // const trm1 = this.RelationalExpression();

        // if(this.token.typeTkn != TokenType.eot){

        // }
    }
    
}

export function operator(opr : string) : RefVar {
    return new RefVar(opr);
}

export function getAllTerms(t : Term, terms: Term[]){
    terms.push(t);

    if(t instanceof App){
        assert(t.fnc != null, "get all terms");
        getAllTerms(t.fnc, terms);

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

    const target_str = target.str2();
    return terms.filter(x => x.str2() == target_str );
}

export function allTerms(trm : Term) : Term[] {
    const terms : Term[] = [];
    getAllTerms(trm, terms);

    return terms;
}

}