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

export function showDlg(ev : MouseEvent, dlg_id : string){
    const dlg = document.getElementById(dlg_id) as HTMLDialogElement;
    dlg.style.left = ev.pageX + "px";
    dlg.style.top  = ev.pageY + "px";
    dlg.showModal();
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

    /*
    <dialog id="msg-box-dlg">
        <h4 id="msg-box-text"></h4>
        <button id="msg-box-cancel">Cancel</button>
        <button id="msg-box-ok">OK</button>
    </dialog>


    */

    }

}

abstract class AbstractMenuClass {
    abstract showMenu(ul : HTMLUListElement) : void;
}

export class MenuClass extends AbstractMenuClass {
    text : string;
    fnc  : ()=>void;

    constructor(text :string, fnc : ()=>void){
        super();
        this.text = text;
        this.fnc  = fnc;
    }

    showMenu(ul : HTMLUListElement) : void {
        const li = document.createElement("li");
        li.style.cursor = "pointer";
        li.innerText = this.text;        
        li.addEventListener("click", this.fnc)
        li.addEventListener("click", (ev : MouseEvent)=>{ SubMenuClass.theDlg.close() });

        ul.appendChild(li);
    }
}

export class SubMenuClass extends AbstractMenuClass {
    static theDlg : HTMLDialogElement;

    text : string;
    menus : AbstractMenuClass[];

    constructor(text : string, menus : AbstractMenuClass[]){
        super();
        this.text = text;
        this.menus = menus;
    }

    showMenu(ul : HTMLUListElement) : void {
        const ul_sub = document.createElement("ul");

        ul_sub.style.margin  = "2px";
        ul_sub.style.padding = "3px";

        const li = document.createElement("li");
        li.innerText = this.text;

        for(const menu of this.menus){
            menu.showMenu(ul_sub);
        }

        ul.appendChild(li);
        ul.appendChild(ul_sub);
    }

    show(ev : MouseEvent){
        const dlg = document.createElement("dialog");
        SubMenuClass.theDlg = dlg;

        dlg.style.position = "absolute";
        dlg.style.left = ev.pageX + "px";
        dlg.style.top  = ev.pageY + "px";
        dlg.style.margin = "0";
        dlg.style.padding = "5px";

        const  h  = document.createElement("h5");
        h.innerText = this.text;
        h.style.margin = "0";

        const ul = document.createElement("ul");
        ul.style.margin  = "2px";
        ul.style.padding = "3px";

        for(const menu of this.menus){
            menu.showMenu(ul);
        }

        dlg.appendChild(h);
        dlg.appendChild(ul);
        document.body.appendChild(dlg);

        dlg.showModal();
    }
}

export function Menu(text : string, fnc : ()=>void) : MenuClass {
    return new MenuClass(text, fnc);
}

export function SubMenu(text : string, menus : AbstractMenuClass[]) : SubMenuClass {
    return new SubMenuClass(text, menus);
}

export class PopupMenu {
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

    /*
    <dialog id="msg-box-dlg">
        <h4 id="msg-box-text"></h4>
        <button id="msg-box-cancel">Cancel</button>
        <button id="msg-box-ok">OK</button>
    </dialog>


    */

    }

}

function enableMenuItem(id : string, enable : boolean){
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

export class DragDrop {
    dropItem : DbItem;
    dragItem : DbItem;

    addChild(){
        msg(`child ${this.dropItem.title} <= ${this.dragItem.title}`);
        this.closeDlg();

        (this.dropItem as Section).moveChild(this.dragItem);
        showContents();
    }

    addAfter(){        
        msg(`after ${this.dropItem.title} <= ${this.dragItem.title}`);
        this.closeDlg();

        this.dropItem.moveAfter(this.dragItem);
        showContents();
    }

    addBefore(){
        msg(`before ${this.dropItem.title} <= ${this.dragItem.title}`);
        this.closeDlg();

        this.dropItem.moveBefore(this.dragItem);
        showContents();
    }
    
    closeDlg(){
        $dlg("drag-drop-dlg").close();
    }

    constructor(drop_item : DbItem, drag_item : DbItem){
        this.dropItem = drop_item;
        this.dragItem = drag_item;

        const enable_drop_child = drop_item instanceof Section && drop_item.children.length == 0;

        $("drag-drop-child").onclick = enable_drop_child ? this.addChild.bind(this) : null;
        $("drag-drop-after").onclick = this.addAfter.bind(this);
        $("drag-drop-before").onclick = this.addBefore.bind(this);

        enableMenuItem("drag-drop-child", enable_drop_child);
    }

    show(){
        $dlg("drag-drop-dlg").showModal();
    }
}

export function showContents(){
    const root = getRoot();
    $div("contents-div").innerHTML = "";
    root.makeContents();

    $dlg("contents-dlg").showModal();
}

}