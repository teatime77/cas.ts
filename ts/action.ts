namespace casts {
//
let eqActionDlg : HTMLDialogElement;

export function initAction(){
    eqActionDlg = document.getElementById("eq-action-dlg") as HTMLDialogElement;
}

export function eqActionBtn(){
    eqActionDlg.showModal();
}    

}