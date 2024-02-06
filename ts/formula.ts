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

export class Transformation {
    focus : Term;
    formula_root_cp : App;
    sideIdx : number;
    dic : Map<string, Term>;
    focus_root : Term;

    constructor(focus : Term, formula_root_cp : App, sideIdx : number, dic : Map<string, Term>){
        this.focus           = focus;
        this.formula_root_cp = formula_root_cp;
        this.sideIdx         = sideIdx;
        this.dic             = dic;

        this.focus_root = this.focus.getRoot();
    }


    matchTerm(dic : Map<string, Term>, trm1 : Term, trm2 : Term){
        if(trm2 instanceof RefVar){
            // 変数参照の場合
    
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
        else if(trm2 instanceof ConstNum){
            // 定数の場合
    
            if(! trm1.eq(trm2)){
                // 定数に等しくない場合
    
                throw new FormulaError();
            }
        }
        else if(trm2 instanceof App){
            // 関数呼び出しの場合
    
            if(trm1 instanceof App){
                // 関数呼び出しの場合
    
                // 関数をマッチさせる。
                this.matchTerm(dic, trm1.fnc, trm2.fnc);
    
                if(trm1.args.length != trm2.args.length){
                    // 引数の数が等しくない場合
    
                    throw new FormulaError();
                }
    
                // それぞれの引数をマッチさせる。
                for(const [i, t] of Array.from(trm2.args).entries()){
                    this.matchTerm(dic, trm1.args[i], t);
                }

                if(! trm1.value.eq(trm2.value) && trm1 != this.focus){
                    throw new FormulaError();
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
    

     showCandidate(candidate_div : HTMLDivElement){
        const div = document.createElement("div");
        div.className = "candidate";
    
        const btn = document.createElement("button");
        btn.innerText = "apply";
        btn.addEventListener("click", this.onClick.bind(this));
    
        const tex_div = document.createElement("div");
    
        render(tex_div, this.formula_root_cp.tex());
    
        div.appendChild(btn);
        div.appendChild(tex_div);
        candidate_div.appendChild(div);
    }

    onClick(ev : MouseEvent){
        // 候補リストを削除する。
        setTimeout(()=>{ document.getElementById("candidate-div").innerHTML = ""; }, 1);

        // 既存のspanはフォーカスできないようにする。
        const all_spans = mathDivRoot.getElementsByTagName("span");
        const tab_spans = Array.from(all_spans).filter(x => x.getAttribute("data-tabidx") != null);
        tab_spans.forEach(x => x.tabIndex = -1);

        makeMathDiv();

        const another_formula_side_idx = (this.sideIdx == 0 ? 1 : 0);
        const another_formula_side = this.formula_root_cp.args[another_formula_side_idx];

        another_formula_side.value.setmul(this.focus.value);
        if(this.focus.parent != null){

            this.focus.replace(another_formula_side);
        }
        else{
            assert(this.focus_root == this.focus);
            this.focus_root = another_formula_side;
            this.focus_root.setParent(null);
        }

        this.focus_root.setStrVal();
        this.focus_root.setTabIdx();
        const tex = this.focus_root.tex();
        render(mathDiv, tex);
    }
    
}

function substByDic(dic : Map<string, Term>, root : App){
    const refs = allTerms(root).filter(x => x instanceof RefVar && dic.has(x.name)) as RefVar[];
    refs.forEach(x => x.replace(dic.get(x.name).clone()));
}

function onFocusRun(focus : Term){
    msg(`run: id:${focus.id} ${focus.constructor.name}`);

    const candidate_div = document.getElementById("candidate-div") as HTMLDivElement;
    candidate_div.innerHTML = "";

    for(const [key, form] of formulas.entries()){
        assert(2 <= form.args.length);
        for(const [idx, side] of form.args.entries()){
            if(focus instanceof App && side instanceof App){
                if(focus.fncName == side.fncName && focus.args.length == side.args.length){

                    const [formula_root_cp, side_cp] = side.cloneRoot() as [App, App];

                    const dic = new Map<string, Term>();
                    try{
                        const trans = new Transformation(focus, formula_root_cp, idx, dic);
                        trans.matchTerm(dic, focus, side_cp);

                        substByDic(dic, formula_root_cp);
                        msg(`form : OK ${focus.str()} F:${formula_root_cp.str()}`);

                        trans.showCandidate(candidate_div);
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

export function onKeypress(ev : KeyboardEvent, span : HTMLSpanElement, trm : Term){
    msg(`key: [${ev.key}] ${trm.str()}`);
    if(ev.key == " "){
        onFocusRun(trm);
    }
    ev.stopPropagation();
}

}