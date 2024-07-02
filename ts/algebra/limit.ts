namespace casts {
//
export function splitLinearFncFocus(focus : Term, arg_idx : number){
    assert(focus.parent != null && focus.parent.isAdd());
    
    const add = focus.parent as App;
    assert(add.parent != null && add.parent instanceof App);

    const idx = add.args.indexOf(focus);
    assert(idx != -1);
    
    const fnc = add.parent as App;
    assert(fnc.args[arg_idx] == add);

    return splitLinearFnc(fnc, arg_idx, idx);
}

export function splitLinearFncPath(cmd : App, root : App) : App {
    addHtml("線形関数を２つに分割する。");
    
    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path&& cmd.args[1] instanceof ConstNum, "move arg");

    // 分割する線形関数
    const fnc = (cmd.args[0] as Path).getTerm(root) as App;
    assert(fnc instanceof App && fnc.fncName == "lim");

    // 分割位置
    const idx = (cmd.args[1] as ConstNum).value.int();

    return splitLinearFnc(fnc, 0, idx);
}

/**
 * 
 * @param cmd コマンド
 * @param root ルート
 * @description 線形関数の中の加算を分割する。
 */
export function splitLinearFnc(fnc : App, arg_idx : number, idx : number) : App {
    // 加算
    const add = fnc.args[arg_idx] as App;
    assert(add instanceof App && (add.fncName == "+" || add.fncName == "*"));

    const opr = add.fncName;

    // 線形関数のコピー
    const fnc2 = fnc.clone();
    const add2 = fnc2.args[arg_idx] as App;

    add2.args = [];

    // 元の加算から新しい加算に項を移動する。
    while(idx < add.args.length){
        const trm = add.args[idx];
        trm.remArg();

        add2.addArg(trm);
    }

    // 元の線形関数と新しい線形関数の加算
    const add3 = new App(operator(opr), []);

    // 元の線形関数を新しい加算で置き換える。
    fnc.replaceTerm(add3);

    // 新しい加算に2つの線形関数を追加する。
    add3.addArg(fnc);
    add3.addArg(fnc2);

    if(add.args.length == 1){
        add.args[0].value.setmul(add.value);
        add.replaceTerm(add.args[0]);
    }

    if(add2.args.length == 1){
        add2.args[0].value.setmul(add2.value);
        add2.replaceTerm(add2.args[0]);
    }
    
    return add3;
}

}