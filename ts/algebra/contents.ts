namespace casts {

let title_inp : HTMLInputElement;
let assertionInput : HTMLTextAreaElement;
let sectionMenuDlg : HTMLDialogElement;
let indexMenuDlg : HTMLDialogElement;



let Sections : DbSection[];
export let Indexes : Index[];


export class DragDrop {
    dropItem : DbItem;
    dragItem : DbItem;

    addChild(){
        msg(`child ${this.dropItem.title} <= ${this.dragItem.title}`);
        this.closeDlg();

        (this.dropItem as DbSection).moveChild(this.dragItem);
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

        const enable_drop_child = drop_item instanceof DbSection && drop_item.children.length == 0;

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



export function getRoot() : DbSection {
    let root : DbSection;

    root = Sections.find(x => x.parentId == null)!;
    assert(root != undefined && root.id == 0);

    return root
}

function getMaxId() : number {
    const dbitems = (Sections as DbItem[]).concat(Indexes);

    return dbitems.map(x => x.id).reduce((acc,cur)=> Math.max(acc, cur), 0);
}

function getDbItemFromId(id : number) : DbItem {
    const dbitems = (Sections as DbItem[]).concat(Indexes);

    const item = dbitems.find(x => x.id == id);
    assert(item != undefined);

    return item!;
}

async function inputIndex(title : string = "", assertion : string = "") : Promise<[string, string] | null> {
    title_inp.value = title;
    assertionInput.value = assertion;

    const ok = await showDlgOk("index-dlg", "index-ok");
    if(! ok){
        return null;
    }

    title = title_inp.value.trim();
    if(title == ""){

        showMsg(`title is empty!`);
        return null;
    }

    assertion = assertionInput.value.trim();
    if(assertion == ""){

        showMsg(`assertion is empty!`);
        return null;
    }

    return [title, assertion];
}


export abstract class DbItem {
    parentId : number  | null;
    parent   : DbSection | null = null;
    id       : number;
    order    : number = 0;
    title    : string;
    fnc      : (()=>void) | null = null;
    span     : HTMLSpanElement | null = null;
    tex      : HTMLSpanElement | null = null;

    abstract data()  : any;
    abstract table() : string;

    constructor(id : number, parent_id : number | null, order : number, title : string){
        this.id = id;
        this.parentId = parent_id;
        this.order    = order;
        this.title    = title;
    }

    fullName() : string {
        let full_name = this.title;
        for(let parent = this.parent; parent != null; parent = parent.parent){
            full_name = `${parent.title}-${full_name}`;
        }

        return full_name;
    }

    nest() : number {
        let n = 0;
        
        for(let parent = this.parent; parent != null; parent = parent.parent){
            n++;
        }

        return n;
    }

    makeContents(){
        this.span = document.createElement("span");
        this.span.style.cursor = "pointer";
        this.span.style.marginLeft = `${this.nest() * 40}px`;
        this.span.style.alignContent = "center";
        const marker = (this instanceof DbSection ? "・ " : "  ");
        this.span.innerText = marker + translate(this.title);
        this.span.draggable = true;
        this.span.addEventListener("dragstart", this.onDragStart.bind(this));
        this.span.addEventListener("dragenter", this.onDragEnter.bind(this));
        this.span.addEventListener("dragover", this.onDragOver.bind(this));
        this.span.addEventListener("dragleave", this.onDragLeave.bind(this));
        this.span.addEventListener("drop", this.onDrop.bind(this));

        $("contents-div").appendChild(this.span);

        this.tex  = document.createElement("span");
        $("contents-div").appendChild(this.tex);
    }

    onDragStart(ev : DragEvent){
        ev.dataTransfer!.setData("text/plain", `${this.id}`);
        msg(`drag start : ${this.title}`);
    }

    onDragOver(ev : DragEvent){
        ev.preventDefault();
        ev.dataTransfer!.dropEffect = "move";
    }

    onDragEnter(){
        this.span!.style.color = "blue";
        msg(`drag enter : ${this.title}`);
    }

    onDragLeave(ev : DragEvent){
        ev.preventDefault();
        this.span!.style.color = "black";
    }

    onDrop(ev : DragEvent){
        ev.preventDefault();
        this.span!.style.color = "black";
        const drag_id_str = ev.dataTransfer!.getData("text/plain");
        const drag_id = parseInt(drag_id_str);
        const drag_item = getDbItemFromId(drag_id);
        
        const drag_drop = new DragDrop(this, drag_item);
        drag_drop.show();
    }

    async putDB(fnc : (()=>void) | null = null) : Promise<void> {
        await writeDB(this.table(), this.id, this.data())

        console.log(`OK:put ${this.table()} ${this.id}`);
        if(this instanceof DbSection){
            Sections.push(this);
        }
        else if(this instanceof Index){
            Indexes.push(this);
        }
        else{
            assert(false);
        }

        if(fnc != null){
            fnc();
        }
    }

    async updateDB(fnc : (()=>void) | null = null) : Promise<void> {
        await writeDB(this.table(), this.id, this.data());
        console.log(`OK:edit ${this.table()} ${this.id}`);

        if(fnc != null){
            fnc();
        }
    }

    moveBefore(item : DbItem){
        this.parent!.move(item);

        const idx = this.parent!.children.indexOf(this);
        assert(idx != undefined);
        this.parent!.children.splice(idx, 0, item);
    }

    moveAfter(item : DbItem){
        this.parent!.move(item);

        const idx = this.parent!.children.indexOf(this);
        assert(idx != undefined);
        this.parent!.children.splice(idx + 1, 0, item);
    }

    correctDbData(parent_id : number | null, order : number, changed : DbItem[]){
        if(this.parentId != parent_id || this.order != order){
            this.parentId = parent_id;
            this.order    = order;
            changed.push(this);
        }

        if(this instanceof DbSection){
            for(const [i,x] of this.children.entries()){
                x.correctDbData(this.id, i, changed);
            }
        }
    }
}

class DbSection extends DbItem {
    children  : DbItem[] = [];

    static fromData(id : number, data : any) : DbSection {
        return new DbSection(id, data.parentId, data.order, data.title)
    }

    table() : string {
        return "sections";
    }

    constructor(id : number, parent_id : number | null, order : number, title : string){
        super(id, parent_id, order, title);
    }

    data() : any {
        return {
            "parentId" : this.parentId,
            "order"    : this.order,
            "title"    : this.title
        }
    }

    makeContents(){
        super.makeContents();

        this.span!.addEventListener("contextmenu", (ev : MouseEvent)=>{
            ev.preventDefault();

            bindClick("add-section", this.addChildSection.bind(this));
            bindClick("add-index", this.addIndex.bind(this));
            showDlg(ev, "section-menu-dlg");
        });

    
        for(const item of this.children){
            item.makeContents();
        }
        
    }

    async addChildSection(){
        sectionMenuDlg.close();

        const title = await inputBox();
        msg(`input ${title}`);
        if(title == null){
            return;
        }

        const section = new DbSection(getMaxId() + 1, this.id, this.children.length, title);
        section.parent = this;
        this.children.push(section);

        await section.putDB();

        showContents();
    }

    async addIndex(){
        sectionMenuDlg.close();

        const res = await inputIndex();
        if(res == null){
            return;
        }
        const [title, assertion] = res;

        const index = new Index(getMaxId() + 1, this.id, this.children.length, title, assertion);
        index.parent = this;
        this.children.push(index);

        await index.putDB();

        showContents();        
    }

    move(item : DbItem){
        remove(item.parent!.children, item);

        item.parent   = this;
    }

    moveChild(item : DbItem){
        this.move(item);
        this.children.push(item);        
    }
}

export class Index extends DbItem {
    assertion : App;
    commands  : string[] | null = null;

    static fromData(id : number, data : any) : Index {
        return new Index(id, data.parentId, data.order, data.title, data.assertion)
    }

    table() : string {
        return "indexes";
    }

    constructor(id : number, parent_id : number | null, order : number, title : string, assertion_str : string){
        super(id, parent_id, order, title);
        this.assertion = parseMath(assertion_str) as App;
        msg(`formula NEW:${assertion_str}`);
    }

    data() : any {
        return {
            "parentId"  : this.parentId,
            "order"     : this.order,
            "title"     : this.title,
            "assertion" : this.assertion.str()
        };
    }

    str() : string {
        return `id:${this.id} title:${this.title}`;
    }

    makeContents(){
        super.makeContents();

        renderKatex(this.tex!, this.assertion.tex());

        this.span!.addEventListener("click", (ev : MouseEvent)=>{
            renderKatex($("assertion-tex"), this.assertion.tex());
        });

        this.span!.addEventListener("contextmenu", (ev : MouseEvent)=>{
            ev.preventDefault();

            bindClick("index-menu-edit", this.edit.bind(this));
            bindClick("index-menu-delete", this.delete.bind(this));
            bindClick("index-menu-proof", this.proof.bind(this));
            showDlg(ev, "index-menu-dlg");
        });

    }

    async edit(){
        msg("edit start");

        indexMenuDlg.close();

        const res = await inputIndex(this.title, this.assertion.str());
        if(res == null){
            return;
        }

        let assertion_str : string;
        [this.title, assertion_str] = res;
        this.assertion = parseMath(assertion_str) as App;

        this.span!.innerText = translate(this.title);

        await this.updateDB();
    }

    delete(){
        msg("delete start");
        indexMenuDlg.close();
        $dlg("contents-dlg").close();
    }

    proof(){
        msg("proof start");
        indexMenuDlg.close();
        $dlg("contents-dlg").close();

        startProof(this);
    }

    async readProof() : Promise<void> {
        this.commands = [];

        const doc = await getDocument('proofs', this.id);

        if(!doc.exists){
            msg(`read proof : no doc : ${this.title}`);
            return;
        }

        const data = doc.data();
        if(data == undefined){
            msg(`read proof : no data : ${this.title}`);
            return;
        }

        const commands = data["commands"];
        assert(typeof commands == "string");
        
        this.commands = JSON.parse(commands);
        assert( Array.isArray(this.commands) );

        msg(`commands:${this.title}\n${commands}`);
    }
}

async function readSections() : Promise<DbSection[]> {
    const docs = await getSnapshot('sections');
    const sections = docs.map(([id, data]) => DbSection.fromData(id, data));

    return sections;
}

async function readIndexes() : Promise<Index[]> {
    const docs = await getSnapshot('indexes');
    const indexes = docs.map(([id, data]) => Index.fromData(id, data));

    return indexes;
}

export async function updateContents(){
    const root = getRoot();
    const changed : DbItem[] = [];
    root.correctDbData(null, 0, changed);

    for(const item of changed){
        msg(`changed ${item.fullName()}`);
        await item.updateDB();
    }
}

export async function initContents(page : string){
    if(page == "edit"){

        title_inp      = document.getElementById("doc-title") as HTMLInputElement;
        assertionInput = document.getElementById("doc-assertion") as HTMLTextAreaElement;
        sectionMenuDlg = document.getElementById("section-menu-dlg") as HTMLDialogElement;
        indexMenuDlg   = document.getElementById("index-menu-dlg") as HTMLDialogElement;
    }

    await initFirebase(page);

    Sections = await readSections();

    if(Sections.length == 0){

        const root = new DbSection(0, null, 0, "目次");
        await root.putDB();
    }

    Indexes = await readIndexes();
    
    Indexes.forEach(x => x.assertion.setStrVal());

    const sections_indexes = (Sections as DbItem[]).concat(Indexes);

    // for(const x of sections_indexes){ await x.writeDB(); };

    const map = new Map<number, DbItem>();
    sections_indexes.forEach(x => map.set(x.id, x));

    for(const item of sections_indexes){
        if(item.parentId != null){
            const parent = map.get(item.parentId) as DbSection;
            assert(parent != undefined);
            
            item.parent = parent;
            parent.children.push(item);
        }
    }

    for(const section of Sections){
        if(2 <= section.children.length){
            section.children.sort((a,b) => a.order - b.order);
        }
    }

}

}