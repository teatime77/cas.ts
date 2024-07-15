namespace casts {
let focusTimerId : number = 0;

class FormulaError extends Error {    
}

export async function readFormulas(){
    Indexes = [];

    const text = await fetchText(`../data/formulas.txt`);
    const lines = text.split('\r\n').map(x => x.trim()).filter(x => x.length != 0);
    for(const line of lines){
        const i = line.indexOf(':');
        const id = parseInt( line.substring(0, i).trim() )!;
        const assertion_str = line.substring(i + 1).trim();

        const index = new Index(id, null, 0, "", assertion_str);
        Indexes.push(index);
    }
}

export function applyFormula(focus : Term, index_id : number, side_idx : number) : [ApplyFormula, App, App]{
    const index = Indexes.find(x => x.id == index_id);
    if(index == undefined){
        throw new MyError();
    }

    const form = index.assertion;
    const side = form.args[side_idx];

    const [trans, formula_root_cp, side_cp] = matchFormulas(focus, index, form, side_idx , side);
    if(trans == null){
        throw new MyError();
    }
    return [trans, formula_root_cp, side_cp];
}

export abstract class Transformation {
    commandName : string;
    focus : Term;

    constructor(command_name : string, focus : Term){
        this.commandName     = command_name;
        this.focus           = focus;
    }

    abstract result() : App;
    abstract getCommand(focus_path : Path) : App;

    showCandidate(){
        const div = document.createElement("div");
        div.className = "candidate";
    
        const btn = document.createElement("button");
        btn.innerText = "apply";
        btn.addEventListener("click", this.onClick.bind(this));
    
        const tex_div = document.createElement("div");
    
        renderKatex(tex_div, this.result().tex());
    
        div.appendChild(btn);
        div.appendChild(tex_div);
        $div("candidate-div").appendChild(div);
    }

    onClick(ev : MouseEvent | null){
        // 候補リストを削除する。
        setTimeout(()=>{ $("candidate-div").innerHTML = ""; }, 1);

        // 既存のspanはフォーカスできないようにする。
        const all_spans = mathDivRoot.getElementsByTagName("span");
        const tab_spans = Array.from(all_spans).filter(x => x.getAttribute("data-tabidx") != null);
        tab_spans.forEach(x => x.tabIndex = -1);

        const focus_path = this.focus.getPath();
        const focus_root = this.focus.getRoot();
        assert(focus_path.getTerm(focus_root) == this.focus);

        const cmd = this.getCommand(focus_path);

        doCommand(cmd);
    }
}

export class ApplyFormula extends Transformation {
    formulaId : number;
    formula_root_cp : App;
    sideIdx : number;
    dic : Map<string, Term>;

    constructor(focus : Term, formula_id : number , formula_root_cp : App, sideIdx : number, dic : Map<string, Term>){
        super("@apply_formula", focus);
        this.formulaId       = formula_id;
        this.formula_root_cp = formula_root_cp;
        this.sideIdx         = sideIdx;
        this.dic             = dic;
    }

    result() : App {
        return this.formula_root_cp;
    }

    getCommand(focus_path : Path) : App {
        const formula_id = new ConstNum(this.formulaId);
        const formula_side_idx         = new ConstNum(this.sideIdx);
        const formula_another_side_idx = new ConstNum(this.sideIdx == 0 ? 1 : 0);

        const cmd = new App(actionRef(this.commandName), [ focus_path, formula_id, formula_side_idx, formula_another_side_idx]);

        return cmd;
    }

    /**
     * 
     * @param dic 変換辞書
     * @param trm1 フォーカス側の項
     * @param trm2 公式側の項
     */
    matchTerm(dic : Map<string, Term>, fdic : Map<string, [App, Term]>, trm1 : Term, trm2 : Term){
        if(trm2 instanceof RefVar){
            // 公式側が変数参照の場合
    
            if(! isLetter(trm2.name[0])){
                // 公式側が演算子の場合

                if(! trm1.eq(trm2)){
                    // 等しくない場合

                    throw new FormulaError();
                }
            }
            else{
                // 公式側が変数の場合

                // 変換値
                const conv = dic.get(trm2.name);
        
                if(conv == undefined){
                    // 変換値が未定の場合
        
                    // 新しい変換値をセットする。
                    const trm1_cp = trm1.clone();

                    // 変換値を変数参照の係数で割る。
                    trm1_cp.value.setdiv(trm2.value);

                    dic.set(trm2.name, trm1_cp);
                }
                else{
                    // 変換値が既定の場合
        
                    if(! trm1.eq(conv)){
                        // 変換値と等しくない場合
        
                        throw new FormulaError();
                    }
                }
            }
        }
        else if(trm2 instanceof ConstNum){
            // 定数の場合
    
            if(! trm1.eq(trm2)){
                // 定数に等しくない場合
    
                throw new FormulaError();
            }
        }
        else if(trm2 instanceof App){
            // 公式側が関数呼び出しの場合
    
            if(trm1 instanceof App){
                // フォーカス側が関数呼び出しの場合

                if(trm2.fnc instanceof RefVar && trm2.fnc.isNamedFnc() && trm1.fnc.isOprFnc()){
                    // 公式側の関数が変数で、フォーカス側の関数が演算子の場合

                    // 変換値
                    const conv = fdic.get(trm2.fnc.name);
                    if(conv == undefined){
                        // 変換値が未定の場合
            
                        // 新しい変換値をセットする。
                        const trm1_cp = trm1.clone();
                        fdic.set(trm2.fnc.name, [trm2.clone(), trm1_cp]);
                    }
                    else{
                        // 変換値が既定の場合

                        // 公式側の関数呼び出しの文字表記と、変換値を得る。
                        const [trm2_cp, trm1_conv] = conv;

                        if(trm2.eq(trm2_cp)){
                            // 公式側の関数の引数が一致する場合

                            if(! trm1.eq(trm1_conv)){
                                // 変換値と等しくない場合
                
                                throw new FormulaError();
                            }        
                        }
                        else{
                            // 公式側の関数の引数が違う場合
            
                            // 未実装としてエラーにする。
                            throw new FormulaError();
                        }
                    }
                }
                else{

                    // 関数をマッチさせる。
                    this.matchTerm(dic, fdic, trm1.fnc, trm2.fnc);
        
                    if(trm1.args.length != trm2.args.length){
                        // 引数の数が等しくない場合
        
                        throw new FormulaError();
                    }
        
                    // それぞれの引数をマッチさせる。
                    for(const [i, t] of Array.from(trm2.args).entries()){
                        this.matchTerm(dic, fdic, trm1.args[i], t);
                    }

                    if(! trm1.value.eq(trm2.value) && trm1 != this.focus){
                        throw new FormulaError();
                    }
                }
            }
            else{
                // 関数呼び出しでない場合
    
                throw new FormulaError();
            }
        }
        else{
            assert(false);
        }
    }
}

export class SimplifyNestedAddMul extends Transformation {
    static fromCommand(cmd : App){
        let focus : Term;

        if(cmd.args.length == 1 && cmd.args[0] instanceof Path){

        
            const focus_path = cmd.args[0] as Path;
            focus = focus_path.getTerm(Alg.root!);
        }
        else{

            focus = cmd;
        }

        const trans = new SimplifyNestedAddMul(focus);
        return trans.result();
    }

    constructor(focus : Term){
        super("@resolveAddMul", focus);
        assert(focus.isAdd());
    }

    result() : App {
        const [root_cp, focus_cp] = this.focus.cloneRoot() as [App, App];

        simplifyNestedAdd(focus_cp);

        return root_cp;
    }

    getCommand(focus_path : Path) : App {
        return new App(actionRef(this.commandName), [focus_path]);
    }
}

export function substByDic(dic : Map<string, Term>, fdic : Map<string, [App, Term]>, root : App){
    const all_terms = allTerms(root);

    const apps = all_terms.filter(x => x instanceof App && fdic.has(x.fncName)) as App[];
    for(const trm2 of apps){
        const [trm2_cp, trm1_conv] = fdic.get(trm2.fncName)!;
        if(trm2.equal(trm2_cp)){
            // 公式側の関数呼び出しと一致する場合

            trm2.replaceTerm(trm1_conv.clone());
        }
        else{
            // 公式側の関数呼び出し違う場合

            // 未実装としてエラーにする。
            throw new FormulaError();
        }
    }

    const refs = all_terms.filter(x => x instanceof RefVar && dic.has(x.name)) as RefVar[];
    for(const ref of refs){
        const trm = dic.get(ref.name)!.clone();

        // 変換値に変数参照の係数をかける。
        trm.value.setmul(ref.value);

        // 変数参照を変換値で置き換える。
        ref.replaceTerm(trm);
    }
}

function matchFormulas(focus : Term, index : Index, form : App, side_idx : number , side : Term) : [ApplyFormula, App, App]  | [null, null, null]{
    if(focus instanceof App && side instanceof App){
        if(focus.fncName == side.fncName && focus.args.length == side.args.length){

            const [formula_root_cp, side_cp] = side.cloneRoot() as [App, App];

            const dic = new Map<string, Term>();
            const fdic = new Map<string, [App, Term]>();
            try{
                const trans = new ApplyFormula(focus, index.id, formula_root_cp, side_idx, dic);
                trans.matchTerm(dic, fdic, focus, side_cp);

                substByDic(dic, fdic, formula_root_cp);
                msg(`form : OK ${focus.str()} F:${formula_root_cp.str()}`);

                return [trans, formula_root_cp, side_cp];
            }
            catch(e){
                if(e instanceof FormulaError){

                    msg(`form : NG ${focus.str()} F:${form.str()}`);
                }
                else{
                    assert(false);
                }
            }
        }
    }

    return [null, null, null];
}

function enumFormulaCandidates(focus : Term){
    msg(`run: id:${focus.id} ${focus.constructor.name}`);

    for(const index of Indexes.filter(x => x != curIndex)){
        const form = index.assertion;
        assert(2 <= form.args.length);
        for(const [side_idx, side] of form.args.entries()){
            const [trans, formula_root_cp, side_cp] = matchFormulas(focus, index, form, side_idx , side);
            if(trans != null){
                trans.showCandidate();
            }
        }
    }
}

function elementaryAlgebra(focus : Term){
    if(focus.parent != null){

        if(focus.isAdd() && focus.parent.isAdd() || focus.isMul() && focus.parent.isMul()){
            // 対象がネストした加算か乗算の場合

            const trans = new SimplifyNestedAddMul(focus);
            trans.showCandidate();
        }

        if(1 <= focus.index() && (focus.parent.isAdd() || focus.parent.isMul()) && 3 <= focus.parent.args.length){
            // 対象が加算や乗算の途中の引数の場合

            const trans = new SplitAddMul(focus);
            trans.showCandidate();
        }
        
        const value = unifyValue(focus, new Rational(1), true, false);
        if(! value.is(1)){
            // 係数が1でない場合

            // 係数を整理する。
            const trans = new UnifyValue(focus);
            trans.showCandidate();
        }
    }

    if(focus instanceof App){

        matchLinear(focus)
    }
}

export function searchCandidate(focus : Term){
    $div("candidate-div").innerHTML = "";

    enumFormulaCandidates(focus);
    elementaryAlgebra(focus);
}

export class ChangeOrder extends Transformation {
    shift : number;

    static move(focus : Term, shift : number){
        if(focus.parent != null && (focus.parent.isAdd() || focus.parent.isMul()) && focus.parent.fnc != focus){
            const idx = focus.index();
            const adjacent_idx = idx + shift;
            if(adjacent_idx < 0 || focus.parent.args.length <= adjacent_idx){
                return;
            }

            const trans = new ChangeOrder(focus, shift);
            trans.onClick(null);    
        }    
    }

    static fromCommand(cmd : App){
        assert(cmd.args.length == 2);
        assert(cmd.args[0] instanceof Path);
        assert(cmd.args[1] instanceof ConstNum);
    
        const focus_path = cmd.args[0] as Path;
        const focus = focus_path.getTerm(Alg.root!);

        const shift = cmd.args[1].value.int();

        const trans = new ChangeOrder(focus, shift);
        return trans.result();
    }

    constructor(focus : Term, shift : number){
        super("@change_order", focus);
        this.shift = shift;
    }

    result() : App {
        const [root_cp, focus_cp] = changeOrder(this.focus, this.shift);
        return root_cp;
    }

    getCommand(focus_path : Path) : App {
        return new App(actionRef(this.commandName), [ focus_path, new ConstNum(this.shift) ]);
    }
}


export class SplitAddMul extends Transformation {
    static fromCommand(cmd : App){
        assert(cmd.args.length == 1);
        assert(cmd.args[0] instanceof Path);
    
        const focus_path = cmd.args[0] as Path;
        const focus = focus_path.getTerm(Alg.root!);

        const trans = new SplitAddMul(focus);
        return trans.result();
    }

    constructor(focus : Term){
        super("@split_add_mul", focus);
    }

    result() : App {
        const [root_cp, focus_cp] = this.focus.cloneRoot() as [App, App];

        const idx = focus_cp.index();
        assert(1 <= idx);

        const parent = focus_cp.parent!;
        const args = parent.args.slice();
        args.forEach(x => x.remArg());

        if(idx == 1){
            parent.addArg(args[0]);
        }
        else{
            const app1 = new App(parent.fnc.clone(), args.slice(0, idx));
            parent.addArg(app1);
        }

        if(idx == parent.args.length - 1){
            parent.addArg(last(args));
        }
        else{
            const app2 = new App(parent.fnc.clone(), args.slice(idx));
            parent.addArg(app2);
        }
        
        return root_cp;
    }

    getCommand(focus_path : Path) : App {
        return new App(actionRef(this.commandName), [focus_path]);
    }
}

function unifyValue(trm : Term, value: Rational, is_mul : boolean, change_value : boolean) : Rational {
    if(is_mul){
        value.setmul(trm.value);
    }
    else{
        value.setdiv(trm.value);
    }

    if(change_value){

        trm.value.set(1);
    }

    if(trm instanceof App){

        if(trm.isMul()){
            trm.args.forEach(x => unifyValue(x, value, is_mul, change_value));
        }
        else if(trm.isDiv()){
            unifyValue(trm.args[0], value, is_mul, change_value);
            unifyValue(trm.args[1], value, ! is_mul, change_value);
        }
    }

    return value;
}

export class UnifyValue extends Transformation {

    static fromCommand(cmd : App){
        assert(cmd.args.length == 1);
        assert(cmd.args[0] instanceof Path);
    
        const focus_path = cmd.args[0] as Path;
        const focus = focus_path.getTerm(Alg.root!);

        const trans = new UnifyValue(focus);
        return trans.result();
    }

    constructor(focus : Term){
        super("@unify_value", focus);
    }

    result() : App {
        const [root_cp, focus_cp] = this.focus.cloneRoot() as [App, App];

        focus_cp.value = unifyValue(focus_cp, new Rational(1), true, true);

        return root_cp;
    }

    getCommand(focus_path : Path) : App {
        return new App(actionRef(this.commandName), [ focus_path ]);
    }
}

export abstract class LinearTransformation extends Transformation {
    static linearFunctions : [string, number][] = [
        [ "/", 0],
        [ "limit", 0],
        [ "diff", 0]
    ];

    static fromCommand(cmd : App){
        assert(cmd.args.length == 1);
        assert(cmd.args[0] instanceof Path);
    
        const focus_path = cmd.args[0] as Path;
        const focus = focus_path.getTerm(Alg.root!);

        let trans : LinearTransformation;
        if(cmd.fncName == "@linear_split"){
            trans = new LinearSplit(focus)            
        }
        else{
            trans = new LinearJoin(focus)            
        }
        return trans.result();
    }

    getCommand(focus_path : Path) : App {
        return new App(actionRef(this.commandName), [focus_path]);
    }
}

/**
 * f(a + b) = f(a) + f(b)
 */
class LinearSplit extends LinearTransformation {
    constructor(focus : Term){
        super("@linear_split", focus);
    }

    result() : App {
        const [root_cp, focus_cp] = this.focus.cloneRoot() as [App, App];

        const add = new App(operator("+"), []);

        const idx = 0;
        const add2 = focus_cp.args[idx] as App
        assert(add2.isAdd());
        for(const trm of add2.args){
            const focus_cp2 = focus_cp.clone();
            focus_cp2.setArg(trm.clone(), idx);
            add.addArg(focus_cp2);
        }

        if(root_cp == focus_cp){
            return add;
        }

        focus_cp.replaceTerm(add);
        return root_cp;
    }

}

class LinearJoin extends LinearTransformation {
    constructor(focus : Term){
        super("@linear_join", focus);
    }    

    result() : App {
        assert(false);
        const [root_cp, focus_cp] = this.focus.cloneRoot() as [App, App];
        assert(focus_cp.isAdd());

        const add = new App(operator("+"), []);

        const idx = 0;
        for(const fnc of focus_cp.args as App[]){
            const trm = fnc.args[idx].clone();
            trm.value.setmul(fnc.value);
            add.addArg(trm);
        }

        const joint_fnc = focus_cp.args[0].clone() as App;
        joint_fnc.value.set(1);
        joint_fnc.setArg(add, idx);

        if(root_cp == focus_cp){
            return joint_fnc;
        }

        focus_cp.replaceTerm(joint_fnc);
        return root_cp;

    }
}

function matchLinear(focus : App) {
    for(const [name, idx] of LinearTransformation.linearFunctions){
        if(focus.fncName == name && focus.args[idx].isAdd()){

            const trans = new LinearSplit(focus);
            trans.showCandidate();    
        }

        if(focus.isAdd() && focus.args.every(x => x instanceof App && x.fncName == name)){
            // フォーカス側が加算で、加算内の引数がすべて関数呼び出しで、関数が同じ場合

            // 加算の最初の関数呼び出し
            const fnc0 = focus.args[0] as App;

            L : for(const fnci of focus.args.slice(1) as App[]){
                // 加算の中の2番目以降の関数呼び出しに対し

                if(fnc0.args.length != fnci.args.length){
                    // 引数の数が一致しない場合

                    break L;
                }

                for(const [i, trm] of fnci.args.entries()){
                    if(i != idx){
                        // idx番目以外の引数の場合

                        if(! fnc0.args[i].equal(fnci.args[i])){
                            // 引数が一致しない場合

                            break L;
                        }
                    }
                }

                // idx番目以外の引数が同じ場合
                const trans = new LinearJoin(focus);
                trans.showCandidate();    
            }

        }
    }
}
}