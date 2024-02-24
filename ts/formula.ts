namespace casts {
let focusTimerId : number = 0;

class FormulaError extends Error {    
}

export function matchFormula(formula : App, app : App) : boolean {

    allTerms(formula).filter(x => x instanceof App && x.fncName == app.fncName);

    return true;
}

export function splitAddMul(app: App, cnt : number){
    assert( (app.fncName == "+" || app.fncName == "*") && cnt + 1 < app.args.length);

    app.args.forEach(x => x.remArg());
    assert(app.args.length == 0);

    const app1 = new App(operator(app.fncName), app.args.slice(0, cnt));
    const app2 = new App(operator(app.fncName), app.args.slice(cnt));

    app.addArgs( [app1, app2] );
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
    
        render(tex_div, this.result().tex());
    
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

export class BasicTransformation extends Transformation {
    static fromCommand(cmd : App){
        assert(cmd.args.length == 1);
        assert(cmd.args[0] instanceof Path);
    
        const focus_path = cmd.args[0] as Path;
        const focus = focus_path.getTerm(Alg.root!);

        const trans = new BasicTransformation(focus);
        return trans.result();
    }

    constructor(focus : Term){
        super("@resolveAddMul", focus);
    }

    result() : App {
        const [root_cp, focus_cp] = this.focus.cloneRoot() as [App, App];

        if(focus_cp.isAdd()){

            resolveAdd(focus_cp.parent as App, focus_cp);
        }
        else{

            assert(false);
        }

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

            trm2.replace(trm1_conv.clone());
        }
        else{
            // 公式側の関数呼び出し違う場合

            // 未実装としてエラーにする。
            throw new FormulaError();
        }
    }

    const refs = all_terms.filter(x => x instanceof RefVar && dic.has(x.name)) as RefVar[];
    refs.forEach(x => x.replace(dic.get(x.name)!.clone()));
}

function matchFormulas(focus : Term){
    msg(`run: id:${focus.id} ${focus.constructor.name}`);

    for(const index of Indexes.filter(x => x != curIndex)){
        const form = index.assertion;
        assert(2 <= form.args.length);
        for(const [side_idx, side] of form.args.entries()){
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

                        trans.showCandidate();
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
        }
    }
}

function elementaryAlgebra(focus : Term){
    if(focus.parent != null){

        if(focus.isAdd() && focus.parent.isAdd() || focus.isMul() && focus.parent.isMul()){
            const trans = new BasicTransformation(focus);
            trans.showCandidate();
        }
        if(1 <= focus.index() && (focus.parent.isAdd() || focus.parent.isMul()) && 3 <= focus.parent.args.length){
            const trans = new SplitAddMul(focus);
            trans.showCandidate();
        }
    }
}

export function searchCandidate(focus : Term){
    $div("candidate-div").innerHTML = "";

    matchFormulas(focus);
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
        const [root_cp, focus_cp] = this.focus.cloneRoot() as [App, App];

        const idx = focus_cp.index();
        focus_cp.parent!.args.splice(idx, 1);
        const new_idx = idx + this.shift + (this.shift < 0 ? 0: -1);
        focus_cp.parent!.args.splice(new_idx, 0, focus_cp);

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


}