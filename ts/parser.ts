namespace casts {
// 

export class Term {
    // 係数
    value : number = 1;
}

export class RefVar extends Term{
    name: string;

    constructor(name: string){
        super();
        this.name = name;
    }
}


export class ConstNum extends Term{
    value: number;

    constructor(value: number){
        super();
        this.value = value;
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
        let trm = this.RelationalExpression();
        if(this.token.text != ","){

            return trm;
        }

        let app = new App("[]", [trm]);
        
        while(this.token.text == ","){
            this.next();

            let trm2 = this.RelationalExpression();
            app.args.push(trm2);
        }

        return app;
    }
    
}

}