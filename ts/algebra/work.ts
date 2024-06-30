namespace casts {
//
export let mathDiv : HTMLDivElement;
export let mathDivRoot : HTMLDivElement;
export let stopGen : boolean = false;
export let actions : Action[];

export class Action {
    command : App;

    constructor(command : App){
        this.command = command;
    }
}

export function addAction(act : Action){
    actions.push(act);
}

}