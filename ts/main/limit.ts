namespace casts {

/**
 * 
 * @param cmd コマンド
 * @param root ルート
 * @description 極限の中の加算を分割する。
 */
export function* splitLim(cmd : App, root : App){
    addHtml("極限を２つに分割する。");
    
    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path&& cmd.args[1] instanceof ConstNum, "move arg");

    // 分割する極限
    const lim = (cmd.args[0] as Path).getTerm(root) as App;
    assert(lim instanceof App && lim.fncName == "lim");

    // 分割位置
    const idx = (cmd.args[1] as ConstNum).value.int();

    // 加算
    const add = lim.args[0] as App;
    assert(add instanceof App && (add.fncName == "+" || add.fncName == "*"));

    const opr = add.fncName;

    // 新しい極限の中の加算
    const add2 = new App(operator(opr), []);

    // 元の加算から新しい加算に項を移動する。
    while(idx < add.args.length){
        const trm = add.args[idx];
        trm.remArg();

        add2.addArg(trm);
    }

    // 新しい極限
    const lim2 = new App(new RefVar("lim"), [ add2, lim.args[1].clone(), lim.args[2].clone() ]);
    lim2.value = lim.value.clone();

    // 元の極限と新しい極限の加算
    const add3 = new App(operator(opr), []);

    // 元の極限を新しい加算で置き換える。
    lim.replace(add3);

    // 新しい加算に2つの極限を追加する。
    add3.addArg(lim);
    add3.addArg(lim2);

    if(add.args.length == 1){
        add.args[0].value.setmul(add.value);
        add.replace(add.args[0]);
    }

    if(add2.args.length == 1){
        add2.args[0].value.setmul(add2.value);
        add2.replace(add2.args[0]);
    }
    
}

}