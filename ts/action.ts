namespace casts {
//
let eqActionDlg : HTMLDialogElement;
let index : Index;
let actions : Action[];
let assertion : App;
let alg : Algebra;

export class Action {
    expr : App;
    div  : HTMLDivElement;

    constructor(expr : App, div : HTMLDivElement){
        this.expr = expr;
        this.div  = div;
    }
}

function actionRef(name : string) : RefVar {
    return new RefVar(name);
}

function doCommand(cmd : App){
    let act : Action;
    
    switch(cmd.fncName){
    case "@add_side":{
        assert(cmd.args.length == 1 && cmd.args[0] instanceof ConstNum);
        const side_idx = cmd.args[0].value.int();
        assert(side_idx < assertion.args.length);
        const side = assertion.args[side_idx].clone() as App;
        side.setParent(null);
        alg.setRoot(side);
        act = new Action(side, mathDiv);
        mathDiv.addEventListener("contextmenu", onContextmenu);
        break;
    }

    default:
        throw new MyError("do command");
    }

    actions.push(act);
}

export function startProof(index_arg : Index){
    alg = new Algebra();
    index = index_arg;

    $h("title-h").innerText = index.title;
    assertion = parseMath(index.assertion) as App;
    assert(assertion.isEq());
    render($("assertion-tex"), assertion.tex());

    actions = [];
}

export function initAction(){
    eqActionDlg = document.getElementById("eq-action-dlg") as HTMLDialogElement;

    $("assertion-tex").addEventListener("contextmenu", onContextmenu);
}

export function addLHS(){
    closeDlg("eq-action-dlg");
    const cmd = new App(actionRef("@add_side"), [Zero()]);
    doCommand(cmd);
}

export function addRHS(){
    closeDlg("eq-action-dlg");
    const cmd = new App(actionRef("@add_side"), [new ConstNum(assertion.args.length - 1)]);
    doCommand(cmd);
}

}