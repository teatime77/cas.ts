namespace casts {

let title_inp : HTMLInputElement;
let assertionInput : HTMLTextAreaElement;
let contentsDlg : HTMLDialogElement;
let sectionMenuDlg : HTMLDialogElement;
let indexMenuDlg : HTMLDialogElement;

// https://github.com/firebase/firebase-js-sdk をクローン
// firebase-js-sdk/packages/firebase/index.d.ts を firebase.d.tsにリネームする。
let db: firebase.firestore.Firestore;

const defaultUid = "ngwpo76dYib1LoszZObGdfNswnm4";
let loginUid : string | null = null;
let guestUid = defaultUid;

let Sections : Section[];
let Indexes : Index[];

function getMaxId() : number {
    const dbitems = (Sections as DbItem[]).concat(Indexes);

    return dbitems.map(x => x.id).reduce((acc,cur)=> Math.max(acc, cur), 0);
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

abstract class DbItem {
    parentId : number  | null;
    parent   : Section | null = null;
    id       : number;
    order    : number = 0;
    title    : string;
    fnc      : (()=>void) | null = null;
    li       : HTMLLIElement | null = null;
    ul       : HTMLUListElement | null = null;    

    abstract data()  : any;
    abstract table() : string;
    abstract makeContents(parent_ul : HTMLUListElement | HTMLDivElement) : void;

    constructor(id : number, parent_id : number | null, order : number, title : string){
        this.id = id;
        this.parentId = parent_id;
        this.order    = order;
        this.title    = title;
    }

    async putDB(fnc : (()=>void) | null = null) : Promise<void> {
        await db.collection('users').doc(loginUid!).collection(this.table()).doc(`${this.id}`).set(this.data());

        console.log(`OK:put ${this.table()} ${this.id}`);
        if(this instanceof Section){
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
        await db.collection('users').doc(loginUid!).collection(this.table()).doc(`${this.id}`).set(this.data());
        console.log(`OK:edit ${this.table()} ${this.id}`);

        if(fnc != null){
            fnc();
        }
    }
}

class Section extends DbItem {
    children  : DbItem[] = [];

    static fromData(id : number, data : any) : Section {
        return new Section(id, data.parentId, data.order, data.title)
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

    makeContents(parent_ul : HTMLUListElement | HTMLDivElement){
        this.li = document.createElement("li");
        this.li.style.cursor = "pointer";
        this.li.innerText = translate(this.title);
        this.li.addEventListener("contextmenu", (ev : MouseEvent)=>{
            ev.preventDefault();

            bindClick("add-section", this.addChildSection.bind(this));
            bindClick("add-index", this.addIndex.bind(this));
            showDlg(ev, "section-menu-dlg");
        });

        parent_ul.appendChild(this.li);

        this.ul = document.createElement("ul");
    
        for(const item of this.children){
            item.makeContents(this.ul);
        }
        
        parent_ul.appendChild(this.ul);
    }

    async addChildSection(){
        sectionMenuDlg.close();

        const title = await inputBox();
        msg(`input ${title}`);
        if(title == null){
            return;
        }

        const section = new Section(getMaxId() + 1, this.id, this.children.length, title);
        section.parent = this;
        this.children.push(section);

        await section.putDB();
        section.makeContents(this.ul!);
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
        index.makeContents(this.ul!);
    }
}

export class Index extends DbItem {
    assertion : string;

    static fromData(id : number, data : any) : Index {
        return new Index(id, data.parentId, data.order, data.title, data.assertion)
    }

    table() : string {
        return "indexes";
    }

    constructor(id : number, parent_id : number | null, order : number, title : string, assertion : string){
        super(id, parent_id, order, title);
        this.assertion = assertion
    }

    data() : any {
        return {
            "parentId"  : this.parentId,
            "order"     : this.order,
            "title"     : this.title,
            "assertion" : this.assertion
        };
    }

    str() : string {
        return `id:${this.id} title:${this.title}`;
    }

    makeContents(parent_ul : HTMLUListElement | HTMLDivElement) : void {
        this.li = document.createElement("li");
        this.li.style.cursor = "pointer";
        this.li.innerText = translate(this.title);

        this.li.addEventListener("click", (ev : MouseEvent)=>{
            const expr = parseMath(this.assertion);

            render($("assertion-tex"), expr.tex());
        });

        this.li.addEventListener("contextmenu", (ev : MouseEvent)=>{
            ev.preventDefault();

            bindClick("index-menu-edit", this.edit.bind(this));
            bindClick("index-menu-delete", this.delete.bind(this));
            bindClick("index-menu-proof", this.proof.bind(this));
            showDlg(ev, "index-menu-dlg");
        });

        parent_ul.appendChild(this.li);
    }

    async edit(){
        msg("edit start");

        indexMenuDlg.close();

        const res = await inputIndex(this.title, this.assertion);
        if(res == null){
            return;
        }

        [this.title, this.assertion] = res;

        this.li!.innerText = translate(this.title);

        await this.updateDB();

        // contentsDlg.close();
    }

    delete(){
        msg("delete start");
        indexMenuDlg.close();
        contentsDlg.close();
    }

    proof(){
        msg("proof start");
        indexMenuDlg.close();
        contentsDlg.close();

        startProof(this);
    }
}

async function readSections() : Promise<Section[]> {
    const snapshot = await db.collection('users').doc(loginUid!).collection('sections').get();

    const sections : Section[] = [];
    snapshot.forEach((doc)=>{
        const id = parseInt(doc.id);
        sections.push( Section.fromData(id, doc.data()) );
    });

    return sections;
}

async function readIndexes() : Promise<Index[]> {

    const snapshot = await db.collection('users').doc(loginUid!).collection('indexes').get();

    const indexes : Index[] = [];
    snapshot.forEach((doc)=>{
        const id = parseInt(doc.id);
        indexes.push( Index.fromData(id, doc.data()) );
    });

    return indexes;
}

export async function initFirebase(page : string){
    if(page == "edit"){

        title_inp      = document.getElementById("doc-title") as HTMLInputElement;
        assertionInput = document.getElementById("doc-assertion") as HTMLTextAreaElement;
        contentsDlg    = document.getElementById("contents-dlg") as HTMLDialogElement;
        sectionMenuDlg = document.getElementById("section-menu-dlg") as HTMLDialogElement;
        indexMenuDlg   = document.getElementById("index-menu-dlg") as HTMLDialogElement;
    }

    function auth() : Promise<firebase.User | null> {
        return new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user : firebase.User | null) => {
              // user オブジェクトを resolve
              resolve(user);
        
              // 登録解除
              unsubscribe();
            });
        });  
    }

    const user = await auth();

    loginUid = null;
    guestUid = defaultUid;

    if(user == null){
        // ログアウトしている場合

        msg("ログアウト");
    }
    else{
        // ログインしている場合

        msg(`login A ${user.uid} ${user.displayName} ${user.email}`);

        const user1 = firebase.auth().currentUser;

        if (user1) {
            // User is signed in.

            loginUid = user.uid;
            guestUid = user.uid;

            msg(`login B ${user1.uid} ${user1.displayName} ${user1.email}`);
        } 
        else {
            // No user is signed in.

            msg("ログアウト");
        }
    }

    db = firebase.firestore();

    Sections = await readSections();

    let root : Section;
    if(Sections.length == 0){

        root = new Section(0, null, 0, "目次");
        await root.putDB();
    }
    else{
        root = Sections.find(x => x.parentId == null)!;
        assert(root != undefined && root.id == 0);
    }

    Indexes = await readIndexes();

    const sections_indexes = (Sections as DbItem[]).concat(Indexes);

    // for(const x of sections_indexes){ await x.writeDB(); };

    const map = new Map<number, DbItem>();
    sections_indexes.forEach(x => map.set(x.id, x));

    for(const item of sections_indexes){
        if(item.parentId != null){
            const parent = map.get(item.parentId) as Section;
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

    if(page == "edit"){
        const div = document.getElementById("contents-div") as HTMLDivElement;
        root.makeContents(div);

        contentsDlg.showModal();
    }
    
}

}