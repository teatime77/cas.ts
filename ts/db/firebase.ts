namespace casts {
//
// https://github.com/firebase/firebase-js-sdk をクローン
// firebase-js-sdk/packages/firebase/index.d.ts を firebase.d.tsにリネームする。
let db: firebase.firestore.Firestore;

const defaultUid = "ngwpo76dYib1LoszZObGdfNswnm4";
let loginUid : string | null = null;
let guestUid = defaultUid;


export async function writeDB(table_name : string, id : number, data : any) : Promise<void> {
    await db.collection('users').doc(loginUid!).collection(table_name).doc(`${id}`).set(data);
}

export async function getSnapshot(table_name : string) : Promise<[number, any][]> {
    const snapshot = await db.collection('users').doc(loginUid!).collection(table_name).get();

    const docs : [number, any][] = [];
    snapshot.forEach((doc) =>{
        const id = parseInt(doc.id);
        docs.push([id, doc.data()]);
    });

    return docs;
}

export async function getDocument(table_name : string, id : number){
    const doc_ref : firebase.firestore.DocumentReference = await db.collection('users').doc(loginUid!).collection(table_name).doc(`${id}`);
    const doc = await doc_ref.get();

    return doc;
}

export async function initFirebase(page : string){

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

}

}