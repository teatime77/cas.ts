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

/**
 * 
 * @param cmd コマンド
 * @param root ルート
 * @description パスを指定して線形関数の中の加算を分割する。
 */
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
 * @param fnc 線形関数
 * @param arg_idx 加算の位置
 * @param idx 分割位置
 * @description 分割位置を指定して線形関数の中の引数を分割する。
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


/**
 * 
 * @param fnc 関数
 * @param arg_idx 展開する引数の位置
 * @description f(a * b * c) => f(a) * f(b) * f(c)
 */
export function expandFncAll(fnc : App, arg_idx : number) : App {
    // 加算or乗算
    const add_mul = fnc.args[arg_idx] as App;
    assert(add_mul instanceof App && (add_mul.fncName == "+" || add_mul.fncName == "*"));

    // 係数が1の場合のみ対応
    assert(add_mul.value.is(1));

    // 新しい加算or乗算
    const add_mul2 = new App(operator(add_mul.fncName), []);

    // 加算or乗算の引数に対して
    for(const trm of add_mul.args){
        const trm_cp = trm.clone();
        const fnc_cp = fnc.clone();
        fnc_cp.setArg(trm_cp, arg_idx);

        // 引数に関数を適用してから、新しい加算or乗算に追加する。
        add_mul2.addArg(fnc_cp);
    }

    // 元の関数を新しい加算or乗算で置き換える。
    fnc.replaceTerm(add_mul2);
    
    return add_mul2;
}

}