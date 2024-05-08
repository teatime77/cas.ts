namespace casts {

const $dic = new Map<string, HTMLElement>();


export function $(id : string) : HTMLElement {
    let ele = $dic.get(id);
    if(ele == undefined){
        ele = document.getElementById(id)!;
        $dic.set(id, ele);
    }

    return ele;
}

export function $div(id : string) : HTMLDivElement {
    return $(id) as HTMLDivElement;
}

export function $dlg(id : string) : HTMLDialogElement {
    return $(id) as HTMLDialogElement;
}

export function $sel(id : string) : HTMLSelectElement {
    return $(id) as HTMLSelectElement;
}

export function $h(id : string) : HTMLHeadElement {
    return $(id) as HTMLHeadElement;
}

export function bindClick(id : string, fnc : ()=>void){
    const ele = document.getElementById(id)!;
    ele.onclick = fnc;
}

export async function inputBox() : Promise<string | null> {
    const dlg = document.getElementById("input-box-dlg") as HTMLDialogElement;
    dlg.showModal();

    return new Promise((resolve) => {
        const ok = document.getElementById("input-box-ok") as HTMLButtonElement;
        ok.addEventListener("click", (ev : MouseEvent)=>{
            const inp = document.getElementById("input-box-text") as HTMLInputElement;
            resolve(inp.value);
            dlg.close();
        });

        document.getElementById("input-box-text")?.addEventListener("keypress", (ev : KeyboardEvent)=>{
            if(ev.key == "Enter"){
                ok.click();
            }
        });
    
        dlg.addEventListener("cancel", (ev : Event)=>{
            resolve(null);
        })
    });
}

export function showMsg(text : string){
    msg(`show msg:${text}`);
}

export function closeDlg(dlg_id : string){
    ($(dlg_id) as HTMLDialogElement).close();
}

let dlgSet = new Set<string>();
export function showDlg(ev : MouseEvent, dlg_id : string){    
    const dlg = $dlg(dlg_id);

    dlg.style.left = `${ev.pageX}px`;
    dlg.style.top  = ev.pageY + "px";

    dlg.showModal();

    if(!dlgSet.has(dlg_id)){
        dlgSet.add(dlg_id);
        dlg.addEventListener("click", (ev : MouseEvent)=>{
            dlg.close();
        });
    }

    // const rc = dlg.getBoundingClientRect();
    // if(document.documentElement.scrollWidth < ev.pageX + rc.width){
    //     dlg.style.left = `${document.documentElement.scrollWidth - rc.width}px`;
    // }
}

export async function showDlgOk(dlg_id : string, ok_id : string) : Promise<boolean> {
    const dlg = document.getElementById(dlg_id) as HTMLDialogElement;
    dlg.showModal();

    return new Promise((resolve) => {
        const ok = document.getElementById(ok_id) as HTMLButtonElement;
        ok.addEventListener("click", (ev : MouseEvent)=>{
            resolve(true);
            dlg.close();
        });
    
        dlg.addEventListener("cancel", (ev : Event)=>{
            resolve(false);
        })
    });
}

export function onContextmenu(ev : MouseEvent){
    ev.preventDefault();

    if(ev.currentTarget instanceof HTMLDivElement){
        const div = ev.currentTarget;
        if(div.id == "assertion-tex" || div.className == "math-div"){

            showDlg(ev, "eq-action-dlg");
        }
    }
}

export class MsgBox {
    static dlg : HTMLDialogElement;

    static show(text : string, fnc : ()=>void){
        MsgBox.dlg = document.createElement("dialog");
        
        const  h4  = document.createElement("h4");
        h4.innerText = text;

        const cancel_btn = document.createElement("button");
        cancel_btn.innerText = "Cancel";
        cancel_btn.addEventListener("click", (ev: MouseEvent)=>{
            MsgBox.dlg.close();
            document.body.removeChild(MsgBox.dlg);
        });

        const ok_btn = document.createElement("button");
        ok_btn.innerText = "OK";
        ok_btn.addEventListener("click", (ev: MouseEvent)=>{
            MsgBox.dlg.close();
            document.body.removeChild(MsgBox.dlg);

            fnc();
        });

        MsgBox.dlg.appendChild(h4);
        MsgBox.dlg.appendChild(cancel_btn);
        MsgBox.dlg.appendChild(ok_btn);
        document.body.appendChild(MsgBox.dlg);

        MsgBox.dlg.showModal();
    }
}

export function enableMenuItem(id : string, enable : boolean){
    if(enable){            
        $(id).style.cursor = "pointer";
        $(id).style.color  = "black";
        $(id).style.textDecoration = "none";
    }
    else{
        $(id).style.cursor = "not-allowed";
        $(id).style.color  = "darkgray";
        $(id).style.textDecoration = "line-through";
    }        
}


export async function includeDialog(){
    const dialog_html = await fetchText("./dialog.html");
    $div("dlg-list").innerHTML = dialog_html;
}

}