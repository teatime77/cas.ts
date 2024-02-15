namespace casts {
declare let navigator : any;

declare let glb : any;
declare let getElement : any;
declare let fetchFileList : any;

export let dropZone : HTMLDivElement;

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

export let indexFile: IndexFile;

abstract class DbItem {
    id!              : string;
    parent!          : string | null;
    fnc!             : ()=>void | null;

    abstract data()  : any;
    abstract table() : string;

    writeDB(fnc : (()=>void) | null = null) : void {
        db.collection('users').doc(loginUid!).collection(this.table()).doc(this.id).set(this.data())
        .then(function() {
            console.log(`OK:${msg}`);
            if(fnc != null){
                fnc();
            }
        })
        .catch(function(error : any) {
            console.error("Error adding document: ", error);
        });
    }
}

class Section extends DbItem {
    title     : string;
    children  : DbItem[] = [];

    table() : string {
        return "sections";
    }

    constructor(parent : string | null, id : string, title : string){
        super();
        this.parent = parent;
        this.id     = id;
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
    id        : string;
    title     : string;
    assertion : string[];

    static fromData(id : string, data : any) : Index {
        return new Index(id, data.title, (data.assertion as string).split("\n"))
    }

    table() : string {
        return "indexes";
    }

    constructor(id : string, title : string, assertion : string[]){
        super();
        this.id        = id;
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

class TextFile {
    text   : string;

    constructor(text: string){
        this.text = text;
    }
}

export class FileInfo {
    id!    : number;
    title! : string;
    len!   : number;
}

function newFileInfo(id: number, title: string){
    return {
        id   : id,
        title: title,
        len  : glb.widgets.length
    } as FileInfo;
}

export class IndexFile {
    docs!: FileInfo[];
    maps!: FileInfo[];
    imgs!: FileInfo[];
}

function newIndexFile(doc: FileInfo[], map: FileInfo[], img: FileInfo[]){
    return {
        docs: doc,
        maps: map,
        imgs: img
    } as IndexFile;
}

function cloneIndexFile(){
    let obj = {
        docs: indexFile.docs.map(x => Object.assign({}, x)),
        maps: indexFile.maps.map(x => Object.assign({}, x)),
        imgs: indexFile.imgs.map(x => Object.assign({}, x)),
    };

    return obj;
}

function maxFileId(){
    return Math.max(... indexFile.docs.concat(indexFile.maps).map(x => x.id));
}

export function initFirebase(){
    isEdit = window.location.href.includes("edit.html");

    if(isEdit){

        id_inp        = document.getElementById("doc-id") as HTMLInputElement;
        title_inp     = document.getElementById("doc-title") as HTMLInputElement;
        assertion_text = document.getElementById("doc-assertion") as HTMLTextAreaElement;
    }

    firebase.auth().onAuthStateChanged(function(user: any) {
        loginUid = null;
        guestUid = defaultUid;
        
        if (user) {
            // User is signed in.
            msg(`login A ${user.uid} ${user.displayName} ${user.email}`);
    
            const user1 = firebase.auth().currentUser;
    
            if (user1) {
                // User is signed in.

                loginUid = user.uid;
                guestUid = user.uid;

                msg(`login B ${user1.uid} ${user1.displayName} ${user1.email}`);

                const root = new Section(null, "root", "目次");
                root.writeDB();

                readIndexes();
            } 
            else {
                // No user is signed in.

                msg("ログアウト");
            }    
        } 
        else {
            // User is signed out.
            // ...

            msg("ログアウト");
        }

        // fetchDB("index", (id: string | null, data:any)=>{
        //     if(data != null){
        //         indexFile = data;
        //     }
        //     else{
        //         indexFile = { docs: [], maps: [], imgs: [] };
        //     }

        //     fnc();
        // });
    });

    db = firebase.firestore();

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

function readIndexes() : void {
    msg("read indexes");

    const indexes : Index[] = [];
    db.collection('users').doc(loginUid!).collection('indexes').get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const index_data = doc.data();

            console.log(doc.id, " => ", index_data);
            const index = Index.fromData(doc.id, index_data);
            indexes.push(index);

            msg(`index : ${index.str()}`);
        });

        const root = indexes.find(x => x)

        const div = document.createElement("div");
        // makeIndex(div, index)
        document.body.appendChild(div);
    
    });    

}

export function writeFormula() : void {
    const id = id_inp.value.trim();
    const title = title_inp.value.trim();
    const assertion = assertion_text.value.trim().split("\n");
    const index = new Index(id, title, assertion);

    writeDB('indexes', id, index.data(), "write index");
}



export function writeDB(table : string, id: string, data: any, msg: string, fnc:(()=>void) | null = null){
    db.collection('users').doc(loginUid!).collection(table).doc(id).set(data)
    .then(function() {
        console.log(`OK:${msg}`);
        if(fnc != null){
            fnc();
        }
    })
    .catch(function(error : any) {
        console.error("Error adding document: ", error);
    });
}

export function putNewDoc(is_new: boolean, title: string, text: string, fnc:()=>void){
    let tmpIdx = cloneIndexFile();

    let id : number;
    let set_index = false;

    if(is_new){

        id = maxFileId() + 1;

        let inf = newFileInfo(id, title);
        tmpIdx.docs.push(inf);
        set_index = true;
    }
    else{
        id = glb.docID;

        let inf = tmpIdx.docs.find(x => x.id == id);
        if(inf == undefined){
            throw new Error();
        }

        if(inf.title != title || inf.len != glb.widgets.length){
            set_index = true;
            inf.title = title;
            inf.len   = glb.widgets.length;
        }
    }

    let doc = { text: text };

    let batch = db.batch();

    // FirebaseError: Function WriteBatch.set() called with invalid data. Data must be an object, but it was: a custom object
    //  https://stackoverflow.com/questions/48156234/function-documentreference-set-called-with-invalid-data-unsupported-field-val
    let docRef = db.collection('users').doc(loginUid!).collection('docs').doc(`${id}`);
    batch.set(docRef, doc);

    if(set_index){

        let idxRef = db.collection('users').doc(loginUid!).collection('docs').doc("index");
        batch.set(idxRef, tmpIdx);
    }

    batch.commit().then(function () {
        indexFile = tmpIdx;
        fnc();
    });
}

export function delDoc(id: number){
    let tmpIdx = cloneIndexFile();

    for(let [idx, doc] of tmpIdx.docs.entries()){
        if(doc.id == id){
            tmpIdx.docs.splice(idx, 1);
            break;
        }
    }

    let batch = db.batch();

    let docRef = db.collection('users').doc(loginUid!).collection('docs').doc(`${id}`);
    batch.delete(docRef);

    let idxRef = db.collection('users').doc(loginUid!).collection('docs').doc("index");
    batch.set(idxRef, tmpIdx);

    batch.commit().then(function () {
        indexFile = tmpIdx;
        alert("削除しました。");
    });
}

let pendingFiles : any[];
function fetchAllDoc(){
    if(pendingFiles.length != 0){
        let file = pendingFiles.pop();

        console.log(`fetch ${file.id} ${file.title}`);
/*
        fetchText(`json/${file.id}.json`, (text: string)=>{

            db.collection('users').doc(loginUid!).collection('docs').doc(file.id).set(new TextFile(text))
            .then(function() {
                msg(`[${file.id}]${file.title} に書き込みました。`);
                fetchAllDoc();
            })
            .catch(function(error : any) {
                console.error("Error adding document: ", error);
            });
        });
*/
    }
}

export function fetchDB(id: string, fnc:(data_id: string | null, data: any)=>void){
    db.collection('users').doc(guestUid).collection('docs').doc(id).get()
    .then(function(doc) {
        if (doc.exists) {
            console.assert(doc.id == id);
            let data = doc.data();
            fnc(doc.id, data);
        } else {
            // doc.data() will be undefined in this case
            console.log("No such document!");
            fnc(null, null);
        }
    })
    .catch(function(error) {
        console.log("Error getting document:", error);
    });
}

function dbUpload(){
    fetchFileList((obj: any)=>{

        let file_map : { [id: string]: string } = {};
        for(let file of obj.files){
            console.log(`${file.id} ${file.title}`);
            file_map[file.id] = file.title;
        }

        for(let edge of obj.edges){
            console.log(`${edge.srcId}: ${file_map[edge.srcId]} --${edge.label}-> ${edge.dstId}: ${file_map[edge.dstId]}`);
        }

        let max_id = Math.max(... obj.files.map((x:any) => parseInt(x.id)));
        max_id++;
        console.log(`max_id: ${max_id}`);

        let map_data = new TextFile( JSON.stringify({ edges: obj.edges }) );

        writeDB(
            "NULL", 
            `${max_id}`, map_data, `[${max_id}]$ にマップを書き込みました。`,
            ()=>{
                let doc = obj.files.map((x:any) => newFileInfo(x.id, x.title));
                console.assert(false);
                let root = newIndexFile(doc, [ newFileInfo(max_id, "依存関係") ], []);
    
                writeDB(
                    "NULL", 
                    "index", root, `[${max_id}]$ にマップを書き込みました。`,
                    ()=>{
                        pendingFiles = obj.files.slice(0, 10);
                        fetchAllDoc();    
                    }
                );
            }
        );
    });
}

export function initDB(){
    function set_click(id: string, fnc:()=>void){
        let btn = getElement(id) as HTMLButtonElement;
        btn.disabled = false;

        btn.addEventListener("click", (ev: MouseEvent)=>{
            fnc();
        });    
    }
    // initFirebase(()=>{
    //     set_click("db-upload", dbUpload);
    //     set_click("db-backup", dbBackup);
    //     set_click("db-batch",  dbBatch);
    // });
}





function getImgRef(fileName: string, mode:string){
    // Create a root reference
    const storageRef = firebase.storage().ref();

    let uid: string;
    switch(mode){
    case "r": uid = guestUid; break;
    case "w": uid = loginUid!; break;
    default: throw new Error();
    }

    return storageRef.child(`/users/${uid}/img/${fileName}`);
}

export function setSvgImgDB(img: SVGImageElement, fileName: string){
    const imgRef = getImgRef(fileName, "r");

    imgRef.getDownloadURL().then(function(downloadURL: string) {
        msg(`download URL: [${downloadURL}]`);
        
        img.setAttributeNS('http://www.w3.org/1999/xlink','href',downloadURL);
    });
}

export function setImgSrc(img: HTMLImageElement, fileName: string){
    const imgRef = getImgRef(fileName, "r");

    imgRef.getDownloadURL().then(function(downloadURL: string) {
        msg(`download URL: [${downloadURL}]`);

        img.src = downloadURL;
    });
}

function uploadFile(file: File){
    // Create a reference to 'mountains.jpg'
    const imgRef = getImgRef(file.name, "w");

    imgRef.put(file).then(function(snapshot: any) {
        snapshot.ref.getDownloadURL().then(function(downloadURL: string) {
            msg(`download URL: [${downloadURL}]`);

            dropZone.style.display = "none";            
        });

        //-- const act = new Image().make({fileName:file.name});
        //-- actions.push(act);
    });    
}


function handleFileSelect(ev: DragEvent) {
    ev.stopPropagation();
    ev.preventDefault();

    const files = ev.dataTransfer!.files; // FileList object.

    for (let f of files) {
        msg(`drop name:${escape(f.name)} type:${f.type} size:${f.size} mtime:${f.lastModified.toLocaleString()} `);

        uploadFile(f);
    }
}

function handleDragOver(evt: DragEvent) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer!.dropEffect = 'copy'; // Explicitly show this is a copy.
}

export function dbBackup(){
    db.collection('users').doc(loginUid!).collection('docs').get()
    .then((querySnapshot: any) => {
        let docs : any[] = [];

        querySnapshot.forEach((dt: any) => {
            const doc = dt.data();

            docs.push({
                id  : dt.id,
                doc : doc
            });
        });

        let text = JSON.stringify(docs, null, 4);

        var link = getElement('download-link') as HTMLAnchorElement;

        var blob = new Blob([ text ], { "type" : "text/plain" });

        let dt = new Date();
        link.download = `backup-${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}-${dt.getHours()}-${dt.getMinutes()}.json`;
        link.href = window.URL.createObjectURL(blob);
        link.click();

        // link.setAttribute('download', `gan-${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}-${dt.getHours()}-${dt.getMinutes()}.png`);
        // link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));

        navigator.clipboard.writeText(text).then(
        function() {
            msg("copy OK");
        }, 
        function() {
            msg("copy error");
        });
    });    
}


export function dbBatch(){
    db.collection('users').doc(loginUid!).collection('docs').get()
    .then((querySnapshot: any) => {
        querySnapshot.forEach((dt: any) => {
            const doc = dt.data();
            if(dt.id == "index"){
                console.log(`索引`);
            }
            else{
                let dt_id = parseInt(dt.id);
                console.assert(! isNaN(dt_id));

                let   d = JSON.parse(doc.text);
                if(d.widgets != undefined){

                    let info = indexFile.docs.find(x => x.id == dt_id)!;
                    console.assert(info != undefined);
                    
                    info.len = d.widgets.length;
                    console.log(`${dt.id} ${d.widgets.length} ${d.title}`);
                }
                else if(d.edges != undefined){
    
                    console.log(`${dt.id} エッジ : ${d.edges.length}`);
                }
                else{
    
                    console.assert(false);
                }
            }
        });

        let tmpIdx = cloneIndexFile();
        writeDB("NULL", "index", tmpIdx, "索引を更新しました。");
    });    
}












}