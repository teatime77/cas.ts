namespace casts {
//
let eqActionDlg : HTMLDialogElement;
let curIndex : Index;
let actions : Action[];
let assertion : App;
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
}

function actionRef(name : string) : RefVar {
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

function doCommand(cmd : App){
    let act : Action;
    
    switch(cmd.fncName){
    case "@add_side":{
        assert(cmd.args.length == 1 && cmd.args[0] instanceof ConstNum);
        const side_idx = cmd.args[0].value.int();
        assert(alg.root!.isEq() && side_idx < alg.root!.args.length);
        const side = alg.root!.args[side_idx].clone() as App;
        side.setParent(null);
        alg.setRoot(side);
        act = new Action(cmd, side, mathDiv);
        mathDiv.addEventListener("contextmenu", onContextmenu);
        break;
    }

    default:
        throw new MyError("do command");
    }

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
    assertion = parseMath(curIndex.assertion) as App;
    assert(assertion.isEq());
    render($("assertion-tex"), assertion.tex());

    alg = new Algebra();
    alg.root = assertion;

    await curIndex.readProof();

    await doGenerator(generateActions(), 1);
    console.log("do generator end");


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