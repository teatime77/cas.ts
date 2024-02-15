namespace casts {
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
        li.innerText = this.text;

        ul.appendChild(li);
    }
}

export class SubMenuClass extends AbstractMenuClass {
    text : string;
    menus : AbstractMenuClass[];

    constructor(text : string, menus : AbstractMenuClass[]){
        super();
        this.text = text;
        this.menus = menus;
    }

    showMenu(ul : HTMLUListElement) : void {
        const ul_sub = document.createElement("ul");

        const li = document.createElement("li");
        li.innerText = this.text;

        for(const menu of this.menus){
            menu.showMenu(ul_sub);
        }

        ul.appendChild(li);
        ul.appendChild(ul_sub);
    }

    show(){
        const dlg = document.createElement("dialog");

        const  h  = document.createElement("h5");
        h.innerText = this.text;

        const ul = document.createElement("ul");

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



}