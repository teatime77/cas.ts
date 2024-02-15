namespace casts {

let isEdit : boolean = false;

let id_inp : HTMLInputElement;
let title_inp : HTMLInputElement;
let assertion_text : HTMLTextAreaElement;


// https://github.com/firebase/firebase-js-sdk をクローン
// firebase-js-sdk/packages/firebase/index.d.ts を firebase.d.tsにリネームする。
let db: firebase.firestore.Firestore;

const defaultUid = "ngwpo76dYib1LoszZObGdfNswnm4";
let loginUid : string | null = null;
let guestUid = defaultUid;


abstract class DbItem {
    parentId         : string  | null;
    parent           : Section | null = null;
    id               : string;
    fnc              : (()=>void) | null = null;

    abstract data()  : any;
    abstract table() : string;

    constructor(id : string, parent_id : string | null){
        this.id = id;
        this.parentId = parent_id;
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
    title     : string;
    children  : DbItem[] = [];

    static fromData(id : string, data : any) : Section {
        return new Section(id, data.parentId, data.title)
    }

    table() : string {
        return "sections";
    }

    constructor(id : string, parent_id : string | null, title : string){
        super(id, parent_id);
        this.title  = title;
    }

    data() : any {
        return {
            "parent" : this.parent,
            "title"  : this.title
        }
    }
}

class Index extends DbItem {
    title     : string;
    assertion : string[];

    static fromData(id : string, data : any) : Index {
        return new Index(id, data.parentId, data.title, (data.assertion as string).split("\n"))
    }

    table() : string {
        return "indexes";
    }

    constructor(id : string, parent_id : string | null, title : string, assertion : string[]){
        super(id, parent_id);
        this.title     = title;
        this.assertion = assertion
    }

    data() : any {
        return {
            "title"     : this.title,
            "assertion" : this.assertion.join("\n")
        };
    }

    str() : string {
        return `id:${this.id} title:${this.title}`;
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

export async function initFirebase(){
    isEdit = window.location.href.includes("edit.html");

    if(isEdit){

        id_inp        = document.getElementById("doc-id") as HTMLInputElement;
        title_inp     = document.getElementById("doc-title") as HTMLInputElement;
        assertion_text = document.getElementById("doc-assertion") as HTMLTextAreaElement;
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

    const root = new Section("root", null, "目次");
    await root.writeDB();

    const sections = await readSections();

    const indexes = await readIndexes();

    const doc = db.collection("formulas").doc("加法:交換法則");
    doc.set({
        title : "交換法則",
        assertion : "a + b = b + a"
    })
    .then(() => {
        msg(`doc write OK:${doc.id}`);

        // MsgBox.show(`doc write OK:${doc.id}`, ()=>{
        //     msg("ok clicked");

        //     SubMenu("メニュー", [
        //         Menu("カット", ()=>{}),
        //         Menu("コピー", ()=>{}),
        //         Menu("ペースト", ()=>{})
        //     ])
        //     .show();
        // });
    })
    .catch((error) => {
        msg(`doc write ERROR!!!:${doc.id}`);
    });
}

}