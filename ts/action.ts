namespace casts {
//
let eqActionDlg : HTMLDialogElement;
let index : Index;
let actions : App[];
let assertion : App;
let alg : Algebra;


function actionRef(name : string) : RefVar {
    return new RefVar(name);
}

function doAction(act : App){
    switch(act.fncName){
    case "@assertion_side":{
        assert(act.args.length == 1 && act.args[0] instanceof ConstNum);
        const side_idx = act.args[0].value.int();
        assert(side_idx < assertion.args.length);
        const side = assertion.args[side_idx].clone() as App;
        side.setParent(null);
        alg.setRoot(side);
        break;
    }
    }
}

export function startProof(index_arg : Index){
    alg = new Algebra();
    index = index_arg;

    $h("title-h").innerText = index.title;
    assertion = parseMath(index.assertion) as App;
    assert(assertion.isEq());
    render($("assertion-tex"), assertion.tex());

    $("assertion-tex").addEventListener("contextmenu", onContextmenu);

    actions = [];
}

export function initAction(){
    eqActionDlg = document.getElementById("eq-action-dlg") as HTMLDialogElement;
}

export function eqActionBtn(){
    eqActionDlg.showModal();
}    

export function addAssertionLeft(){
    closeDlg("eq-action-dlg");
    const act = new App(actionRef("@assertion_side"), [Zero()]);
    actions.push(act);
    doAction(act);
}

export function addAssertionRight(){
    closeDlg("eq-action-dlg");
    const act = new App(actionRef("@assertion_side"), [new ConstNum(assertion.args.length - 1)]);
    actions.push(act);
    doAction(act);
}

}