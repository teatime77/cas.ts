namespace casts {

export enum TokenType{
    unknown,

    // 識別子
    identifier,

    // クラス
    Class,

    // 数値
    Number,

    // 記号
    symbol,

    // 予約語
    reservedWord,

    // $n
    metaId,

    // End Of Text
    eot,

    // 指定なし
    any,

    // 行コメント
    lineComment,

    // ブロックコメント
    blockComment,

    // 改行
    newLine,

    // 文字列
    String,

    // 文字
    character,

    // 不正
    illegal
}


var SymbolTable : Array<string> = new  Array<string> (
    ",",
    ".",
    ";",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "+",
    "-",
    "*",
    "/",
    "^",
    "%",
    "=",
    ":",
    "<",
    ">",
    "$",

    "==",
    "!=",
    "<=",
    ">=",

    "$$",
    "&&",
    "||",

    "+=",
    "-=",
    "*=",
    "/=",
    "%=",

    "++",
    "--",

    "!",
    "&",
    "|",
    "?",
);

const reserved : string[] = [
    "hbar",
    "nabla",
    "sin",
    "cos",
    "",
    "",
    "",
];
    
var KeywordMap : Array<string> = new  Array<string> (
);

var IdList : Array<string> = new  Array<string> (
);

function isLetter(s : string) : boolean {
    return s.length === 1 && ("a" <= s && s <= "z" || "A" <= s && s <= "Z");
}

function isDigit(s : string) : boolean {
    return s.length == 1 && "0123456789".indexOf(s) != -1;
}

function isLetterOrDigit(s : string) : boolean {
    return isLetter(s) || isDigit(s);
}
    
export enum TokenSubType {
    unknown,
    integer,
    float,
    double,
}

export class Token{
    typeTkn:TokenType;
    subType:TokenSubType;
    text:string;
    charPos:number;

    public constructor(type : TokenType, sub_type : TokenSubType, text : string, char_pos : number){
        //console.log("" + TokenType[type] + " " + TokenSubType[sub_type] + " " + text + " " + char_pos);
        this.typeTkn = type;
        this.subType = sub_type;
        this.text = text;
        this.charPos = char_pos;
    }
}    

export function lexicalAnalysis(text : string) : Token[] {
    const tokens : Token[] = [];

    // 現在の文字位置
    let pos : number = 0;

    while(pos < text.length){
        
        // 改行以外の空白をスキップします。
        for ( ; pos < text.length && (text[pos] == ' ' || text[pos] == '\t' || text[pos] == '\r'); pos++);

        if (text.length <= pos) {
            // テキストの終わりの場合

            return;
        }

        const start_pos = pos;

        var token_type = TokenType.unknown;
        var sub_type : TokenSubType = TokenSubType.unknown;

        // 現在位置の文字
        var ch1 : string = text[pos];

        // 次の文字の位置。行末の場合は'\0'
        var ch2 : string;

        if (pos + 1 < text.length) {
            // 行末でない場合

            ch2 = text[pos + 1];
        }
        else {
            // 行末の場合

            ch2 = '\0';
        }

        if(ch1 == '\n'){

            token_type = TokenType.newLine;
            pos++;
        }
        else if (isLetter(ch1)) {
            // 識別子の最初の文字の場合

            // 識別子の文字の最後を探します。識別子の文字はユニコードカテゴリーの文字か数字か'_'。
            for (pos++; pos < text.length && isLetterOrDigit(text[pos]); pos++);

            // 識別子の文字列
            var name : string = text.substring(start_pos, pos);

            if (KeywordMap.indexOf(name) != -1) {
                // 名前がキーワード辞書にある場合

                token_type = TokenType.reservedWord;
            }
            else {
                // 名前がキーワード辞書にない場合

                if (IdList.indexOf(name) == -1) {

                    IdList.push(name);
                }
                token_type = TokenType.identifier;
            }
        }
        else if (isDigit(ch1)) {
            // 数字の場合

            token_type = TokenType.Number;

            // 10進数の終わりを探します。
            for (; pos < text.length && isDigit(text[pos]); pos++);

            if (pos < text.length && text[pos] == '.') {
                // 小数点の場合

                pos++;

                // 10進数の終わりを探します。
                for (; pos < text.length && isDigit(text[pos]); pos++);

                sub_type = TokenSubType.float;
            }
            else {

                sub_type = TokenSubType.integer;
            }
        }
        else if (SymbolTable.indexOf("" + ch1 + ch2) != -1) {
            // 2文字の記号の表にある場合

            token_type = TokenType.symbol;
            pos += 2;
        }
        else if (SymbolTable.indexOf("" + ch1) != -1) {
            // 1文字の記号の表にある場合

            token_type = TokenType.symbol;
            pos++;
        }
        else {
            // 不明の文字の場合

            token_type = TokenType.unknown;
            pos++;
            console.log("不明 {0}", text.substring(start_pos, pos), "");
        }

        // 字句の文字列を得ます。
        var word : string = text.substring(start_pos, pos);

        const token = new Token(token_type, sub_type, word, start_pos);

        msg(`${token.charPos} [${token.text}] ${token.typeTkn} ${token.subType}`);

        tokens.push(token);
    }

    return tokens;
}


}