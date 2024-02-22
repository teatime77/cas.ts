namespace casts {
//
export let curIndex : Index;
let actions : Action[];
let alg : Algebra;

export class Action {
    command : App;
    expr    : App;
    div  : HTMLDivElement;

    constructor(command : App, expr : App, div : HTMLDivElement){
        this.command = command;
        this.expr    = expr;
        this.div  = div;
    }

    delete(){
        closeDlg("eq-action-dlg");
        msg(`delete ${this.expr.str()}`);
    }
}

export function actionRef(name : string) : RefVar {
    return new RefVar(name);
}

export async function writeProof(){
    const commands = JSON.stringify(actions.map(x => x.command.str()), null , "\t");

    const data = {
        "commands" : commands
    };
    await writeDB("proofs", curIndex.id, data);
    msg(`write proof`);
}

function addSide(cmd : App) : App {
    assert(cmd.args.length == 1 && cmd.args[0] instanceof ConstNum);
    const side_idx = cmd.args[0].value.int();
    assert(alg.root!.isEq() && side_idx < alg.root!.args.length);
    const expr = alg.root!.args[side_idx].clone() as App;

    return expr;
}

function applyFormula(cmd : App) : App {
    assert(cmd.args.length == 4);
    assert(cmd.args[0] instanceof Path);
    assert(cmd.args[1] instanceof ConstNum);
    assert(cmd.args[2] instanceof ConstNum);
    assert(cmd.args[3] instanceof ConstNum);

    const focus_path = cmd.args[0] as Path;
    const formula_id = cmd.args[1].value.int();
    const formula_side_idx         = cmd.args[2].value.int();
    const formula_another_side_idx = cmd.args[3].value.int();

    const root_cp = alg.root!.clone();
    const focus = focus_path.getTerm(root_cp) as App;
    assert(focus instanceof App);

    const formula_index = Indexes.find(x => x.id == formula_id);
    assert(formula_index != undefined);

    assert(formula_index?.assertion instanceof App);
    const side = formula_index!.assertion.args[formula_side_idx];

    const [formula_root_cp, side_cp] = side.cloneRoot() as [App, App];

    const dic = new Map<string, Term>();
    try{
        const trans = new Transformation(focus, formula_id, formula_root_cp, formula_side_idx, dic);
        trans.matchTerm(dic, focus, side_cp);

        substByDic(dic, formula_root_cp);
    }
    catch(e){
        assert(false);
    }

    const formula_another_side = formula_root_cp.args[formula_another_side_idx];

    formula_another_side.value.setmul(focus.value);

    let focus_root : App;
    if(focus.parent == null){

        focus_root = formula_another_side as App;
        focus_root.setParent(null);
    }
    else{
        focus_root = focus.getRoot();
        focus.replace(formula_another_side);
    }

    return focus_root;
}

export function doCommand(cmd : App){
    let expr : App;
    
    switch(cmd.fncName){
    case "@add_side":
        expr = addSide(cmd);    
        break;

    case "@apply_formula":
        expr = applyFormula(cmd);
        break;

    default:
        throw new MyError("do command");
    }

    expr.setParent(null);
    alg.setRoot(expr);

    const act = new Action(cmd, expr, mathDiv);

    $("eq-action-delete").onclick = act.delete.bind(act);
    mathDiv.addEventListener("contextmenu", onContextmenu);
    actions.push(act);
}

function* generateActions(){
    for(const cmd_str of curIndex.commands!){
        const cmd = parseMath(cmd_str) as App;
        assert(cmd instanceof App);

        doCommand(cmd);
        yield;
    }
}

export async function startProof(index : Index){
    curIndex = index;

    const ancestors = getAncestors(curIndex);
    const ancestor_titles = ancestors.reverse().slice(1).map(x => x.title).join(" - ");

    $h("ancestor-titles").innerText = ancestor_titles;

    $h("index-title").innerText = index.title;
    assert(curIndex.assertion.isEq());
    render($("assertion-tex"), curIndex.assertion.tex());

    alg = new Algebra();
    alg.root = curIndex.assertion;

    await curIndex.readProof();

    actions = [];

    await doGenerator(generateActions(), 1);
    console.log("do generator end");
}

export function initAction(){
    $("assertion-tex").addEventListener("contextmenu", onContextmenu);
}

export function addLHS(){
    closeDlg("eq-action-dlg");
    const cmd = new App(actionRef("@add_side"), [Zero()]);
    doCommand(cmd);
}

export function addRHS(){
    closeDlg("eq-action-dlg");
    const cmd = new App(actionRef("@add_side"), [new ConstNum(alg.root!.args.length - 1)]);
    doCommand(cmd);
}


}