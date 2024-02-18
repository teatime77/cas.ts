namespace casts {

let id_inp : HTMLInputElement;
let title_inp : HTMLInputElement;
let assertionInput : HTMLTextAreaElement;
let assertionTex : HTMLDivElement;
let contentsDlg : HTMLDialogElement;

// https://github.com/firebase/firebase-js-sdk をクローン
// firebase-js-sdk/packages/firebase/index.d.ts を firebase.d.tsにリネームする。
let db: firebase.firestore.Firestore;

const defaultUid = "ngwpo76dYib1LoszZObGdfNswnm4";
let loginUid : string | null = null;
let guestUid = defaultUid;


abstract class DbItem {
    parentId : string  | null;
    parent   : Section | null = null;
    id       : string;
    order    : number = 0;
    title    : string;
    fnc      : (()=>void) | null = null;
    ul       : HTMLUListElement | null = null;    

    abstract data()  : any;
    abstract table() : string;
    abstract makeContents(parent_ul : HTMLUListElement | HTMLDivElement) : void;

    constructor(id : string, parent_id : string | null, order : number, title : string){
        this.id = id;
        this.parentId = parent_id;
        this.order    = order;
        this.title    = title;
    }

    async writeDB(fnc : (()=>void) | null = null) : Promise<void> {
        await db.collection('users').doc(loginUid!).collection(this.table()).doc(this.id).set(this.data());

        console.log(`OK:write ${this.table()} ${this.id}`);
        if(fnc != null){
            fnc();
        }
    }
}

class Section extends DbItem {
    children  : DbItem[] = [];

    static fromData(id : string, data : any) : Section {
        return new Section(id, data.parentId, data.order, data.title)
    }

    table() : string {
        return "sections";
    }

    constructor(id : string, parent_id : string | null, order : number, title : string){
        super(id, parent_id, order, title);
    }

    data() : any {
        return {
            "parentId" : this.parentId,
            "order"     : this.order,
            "title"    : this.title
        }
    }

    makeContents(parent_ul : HTMLUListElement | HTMLDivElement){
        const li = document.createElement("li");
        li.style.cursor = "pointer";
        li.innerText = translate(this.title);
        li.addEventListener("click", (ev : MouseEvent)=>{
            SubMenu("メニュー", [
                Menu("子のセクションを追加", this.addChildSection.bind(this)),
                Menu("項目を追加", this.addIndex.bind(this))
            ])
            .show(ev);
        });

        parent_ul.appendChild(li);

        this.ul = document.createElement("ul");
    
        for(const item of this.children){
            item.makeContents(this.ul);
        }
        
        parent_ul.appendChild(this.ul);
    }

    async addChildSection(){
        const text = await inputBox();
        msg(`input ${text}`);
        if(text == null){
            return;
        }

        const section = new Section(text, this.id, this.children.length, text);
        section.parent = this;
        this.children.push(section);

        await section.writeDB();
        section.makeContents(this.ul!);
    }

    async addIndex(){
        const ok = await showDlg("index-dlg", "index-ok");
        if(! ok){
            return;
        }

        const id = id_inp.value.trim();
        let   title = title_inp.value.trim();
        if(title == ""){
            title = id;
        }
        const assertion = assertionInput.value.trim();

        const index = new Index(id, this.id, this.children.length, title, assertion);
        index.parent = this;
        this.children.push(index);

        await index.writeDB();
        index.makeContents(this.ul!);
    }
}

class Index extends DbItem {
    assertion : string;

    static fromData(id : string, data : any) : Index {
        return new Index(id, data.parentId, data.order, data.title, data.assertion)
    }

    table() : string {
        return "indexes";
    }

    constructor(id : string, parent_id : string | null, order : number, title : string, assertion : string){
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
        const li = document.createElement("li");
        li.style.cursor = "pointer";
        li.innerText = translate(this.title);
        li.addEventListener("click", (ev : MouseEvent)=>{
            const expr = parseMath(this.assertion);

            render(assertionTex, expr.tex());
        });
        parent_ul.appendChild(li);
    }
}

async function readSections() : Promise<Section[]> {
    const snapshot = await db.collection('users').doc(loginUid!).collection('sections').get();

    const sections : Section[] = [];
    snapshot.forEach((doc)=>{
        sections.push( Section.fromData(doc.id, doc.data()) );
    });

    return sections;
}

async function readIndexes() : Promise<Index[]> {

    const snapshot = await db.collection('users').doc(loginUid!).collection('indexes').get();

    const indexes : Index[] = [];
    snapshot.forEach((doc)=>{
        indexes.push( Index.fromData(doc.id, doc.data()) );
    });

    return indexes;
}

export async function initFirebase(page : string){
    if(page == "edit"){

        id_inp        = document.getElementById("doc-id") as HTMLInputElement;
        title_inp     = document.getElementById("doc-title") as HTMLInputElement;
        assertionInput = document.getElementById("doc-assertion") as HTMLTextAreaElement;
        assertionTex  = document.getElementById("assertion-tex") as HTMLDivElement;        
        contentsDlg    = document.getElementById("contents-dlg") as HTMLDialogElement;
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

    const sections = await readSections();

    let root : Section;
    if(sections.length == 0){

        root = new Section("root", null, 0, "目次");
        await root.writeDB();
    }
    else{
        root = sections.find(x => x.parentId == null)!;
        assert(root != undefined);
    }

    const indexes = await readIndexes();

    const sections_indexes = (sections as DbItem[]).concat(indexes);

    // for(const x of sections_indexes){ await x.writeDB(); };

    const map = new Map<string, DbItem>();
    sections_indexes.forEach(x => map.set(x.id, x));

    for(const item of sections_indexes){
        if(item.parentId != null){
            const parent = map.get(item.parentId) as Section;
            assert(parent != undefined);
            
            item.parent = parent;
            parent.children.push(item);
        }
    }

    for(const section of sections){
        if(2 <= section.children.length){
            section.children.sort((a,b) => a.order - b.order);
        }
    }

    const doc = db.collection("formulas").doc("加法:交換法則");
    doc.set({
        title : "交換法則",
        assertion : "a + b = b + a"
    })
    .then(() => {
        msg(`doc write OK:${doc.id}`);

        // MsgBox.show(`doc write OK:${doc.id}`, ()=>{
        //     msg("ok clicked");
        // });
    })
    .catch((error) => {
        msg(`doc write ERROR!!!:${doc.id}`);
    });

    if(page == "edit"){
        const div = document.getElementById("contents-div") as HTMLDivElement;
        root.makeContents(div);

        contentsDlg.showModal();
    }
    
}

}