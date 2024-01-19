namespace casts {

/**
 * 
 * @param multiplier 乗数
 * @param multiplicand 被乗数
 * @returns 
 * 
 * @description 乗数と被乗数の乗算を返す。
 * 
 */
export function multiply(multiplier : Term, multiplicand : Term) : App {
    const mul = new App(operator("*"), []);
    
    // 乗算の係数 = 乗数の係数 * 被乗数の係数
    mul.value = multiplier.value * multiplicand.value;
    multiplier.value = 1;
    multiplicand.value = 1;

    for(const trm of [multiplier, multiplicand]){
        // 乗数と乗算に対し

        if(trm instanceof App && trm.fncName == "*"){
            // 乗算の場合

            // 引数に追加する。
            mul.addArgs(trm.args);
        }
        else{
            // 乗算でない場合

            mul.addArg(trm);
        }
    }

    return mul;
}

export function* cancel(app: App, root : Term){
    assert(app.args.length == 1, "cancel");

    const targets = getSubTerms(root, app.args[0]);
    for(const t of targets){
        t.cancel = true;
        const tex = root.tex();
        msg(`tex:[${tex}]`);
        render(mathDiv, tex);
        yield;
    }
}

export function showRoot(root : Term){
    root.setParent(null);

    const tex = root.tex();
    msg(`tex:[${tex}]`);
    render(mathDiv, tex);
}

export function* subst(app: App, root : Term){
    assert(app.args.length == 2, "SUBST");

    const targets = getSubTerms(root, app.args[0]);
    for(const t of targets){
        const dst = app.args[1].clone();
        t.replace(dst);

        showRoot(root);
        yield;
    }
}

/**
 * 
 * @param root 
 * @param add 加算
 * @param multiplier 乗数
 * 
 * @description 加算の中の各項に対し、乗数をかける。
 */
function* mulAdd(root : Term, add : App, multiplier : Term) : Generator<Term> {
    assert(add.isAdd(), "muleq add");

    for(const [idx, arg] of add.args.entries()){
        // 加算の中の各項に対し

        // 乗数をかける。
        add.args[idx] = multiply(multiplier, arg);

        yield root;
    }
}

/**
 * 
 * @param root 等式
 * @param multiplier 乗数
 * @description 等式内のすべての辺に乗数をかける。
 */
export function* mulEq(root : App, multiplier : Term) : Generator<Term> {
    assert(root.isEq(), "mul eq");

    for(const [idx, trm] of root.args.entries()){
        // 等式内のすべての辺に対し

        if(trm.isAdd()){
            // 辺が加算の場合

            // 加算の中の各項に対し、乗数をかける。
            yield* mulAdd(root, trm as App, multiplier);
        }
        else{
            // 辺が加算でない場合

            // 辺に乗数をかける。
            root.args[idx] = multiply(multiplier, trm);

            yield root;    
        }
    }
}


export class Algebra {
    root : App | null = null;    

    /**
     * 
     * @param app 乗数
     * @param root ルート
     * @description ルートに乗数をかける。
     */
    *mulRoot(app: App){
        assert(app.args.length == 1, "mul-eq");

        // 乗数
        const multiplier = app.args[0];

        if(this.root.isEq()){
            // ルートが等式の場合

            yield* mulEq(this.root, multiplier);
        }
        else if(this.root instanceof App && this.root.fncName == "+"){
            // ルートが加算の場合

            // 加算の中の各項に対し、乗数をかける。
            yield* mulAdd(this.root, this.root, multiplier);
        }
        else{
            // ルートが等式や加算でない場合

            // 被乗数に乗数をかける。
            this.root = multiply(multiplier, this.root);
        }

        showRoot(this.root);
    }
}


export function* cancelMul(root : Term){
    // すべての乗算のリスト
    const mul_terms = allTerms(root).filter(x => x.isMul()) as App[];

    for(const mul of mul_terms){
        // すべての乗算に対し

        if(mul.args.find(x => x.isDiv()) == undefined){
            // 乗算の引数に除算が含まれない場合
            continue;
        }

        // 乗数のリスト
        let multipliers : Term[] = [];

        // 除数のリスト
        let divisors : Term[] = [];

        for(const trm of mul.args){
            // 乗算の引数に対し

            if(trm.isDiv()){
                // 除算の場合

                const div = trm as App;
                if(div.args[0].isMul()){
                    // 分子が乗算の場合

                    // 分子の乗算のすべての引数を乗数のリストに追加する。
                    multipliers.push(... (div.args[0] as App).args );
                }
                else{
                    // 分子が乗算でない場合

                    // 分子を乗数のリストに追加する。
                    multipliers.push( div.args[0] );
                }

                if(div.args[1].isMul()){
                    // 分母が乗算の場合

                    // 分母の乗算のすべての引数を除数のリストに追加する。
                    divisors.push(... (div.args[1] as App).args );
                }
                else{
                    // 分母が乗算でない場合

                    // 分母を除数のリストに追加する。
                    divisors.push( div.args[1] );
                }
                
            }
            else if(trm.isMul()){
                // 乗算の場合

                // 乗算のすべての引数を乗数のリストに追加する。
                multipliers.push(... (trm as App).args );
            }
            else{
                // 除算や乗算でない場合

                // 乗数のリストに追加する。
                multipliers.push( trm );
            }
        }

        // 乗数や除数のリストからキャンセルされた項を取り除く。
        multipliers = multipliers.filter(x => ! x.cancel);
        divisors = divisors.filter(x => ! x.cancel);

        for(const m of multipliers){
            // すべての乗数に対し

            const m_str = m.str();

            // 値が同じ除数を探す。
            const d = divisors.find(x => x.str() == m_str);
            if(d == undefined){
                // 値が同じ除数がない場合

                continue;
            }


            msg(`cancel m:[${m.str()}] d:[${d.str()}]`)

            // 対応する乗数と除数をキャンセルする。
            m.cancel = true;
            d.cancel = true;

            showRoot(root);
            yield;
        }
    }
}

/**
 * 
 * @param root ルート
 * @description キャンセルされた項を取り除く。
 */
export function* remCancel(root : Term){
    // キャンセルされた項のリスト
    const canceled = allTerms(root).filter(x => x.cancel);

    for(const can of canceled){
        // すべてのキャンセルされた項に対し

        if(can.parent.isMul()){
            // 親が乗算の場合

            // 乗算の引数から取り除く。
            can.remArg();
        }
        else if(can.parent.isDiv()){
            // 親が除算の場合

            if(can.parent.args[0] == can){
                // 分子の場合

                // 分子を1にする。
                can.parent.args[0] = new ConstNum(1);
            }
            else if(can.parent.args[1] == can){
                // 分母の場合

                // 分母を1にする。
                can.parent.args[1] = new ConstNum(1);
            }
            else{
                assert(false, "trim mul 2");
            }
        }

        showRoot(root);
        yield;
    }

}

/**
 * 
 * @description 引数が1個だけの加算や乗算を、唯一の引数で置き換える。
 */
function oneArg(app : App) {
    assert(app.args.length == 1, "one arg");

    // 唯一の引数
    const arg1 = app.args[0];

    // 加算や乗算を唯一の引数で置き換える。
    app.replace(arg1);

    // 唯一の引数の係数に、加算や乗算の係数をかける。
    arg1.value *= app.value;
}

export function* trimMul(root : Term){

    root.setParent(null);
    while(true){
        // 引数が１つしかない加算や乗算を探す。
        const bin1 = allTerms(root).find(x => (x.isAdd() || x.isMul()) && (x as App).args.length == 1);
        if(bin1 != undefined){
            // 引数が１つしかない加算や乗算がある場合

            // 引数が1個だけの加算や乗算を、唯一の引数で置き換える。
            oneArg(bin1 as App);

            showRoot(root);
            yield;
        }

        // 引数がない乗算を探す。
        const mul0 = allTerms(root).find(x => x.isMul() && (x as App).args.length == 0);
        if(mul0 != undefined){
            // 引数がない乗算がある場合

            assert(mul0.parent != null, "trim-mul 3");
            if(mul0.parent.isDiv()){
                // 引数がない乗算が、除算の分子か分母の場合

                // その除算の分子か分母を1で置き換える。
                mul0.replace(new ConstNum(1));
            }
            else if(mul0.parent.isMul()){
                // 引数のない乗算が、乗算の引数の場合

                // その乗算の引数を取り除く。
                mul0.remArg();
            }
            else{
                assert(false, "trim-mul 5");
            }

            showRoot(root);
            yield;
        }

        // 分母が1の除算を探す。
        const div = allTerms(root).find(x => x.isDiv() && (x as App).args[1].isOne()) as App;
        if(div != undefined){
            // 分母が1の除算がある場合

            // その除算を分子で置き換える。
            div.replace(div.args[0]);

            // 分子の係数に、除算の係数をかける。
            div.args[0].value *= div.value;

            showRoot(root);
            yield;
        }

        // 乗算の引数で定数1を探す。
        const one = allTerms(root).find(x => x.isOne() && x.parent.isMul());
        if(one != undefined){
            // 乗算の引数で定数1がある場合

            // 乗算の引数から取り除く。
            one.remArg();

            showRoot(root);
            yield;
        }

        if(bin1 == undefined && mul0 == undefined && div == undefined && one == undefined){
            break;
        }
    }
}

export function* moveAdd(cmd : App, root : Term){
    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path && cmd.args[1] instanceof Path, "move");
    assert(root instanceof App, "move 2");
    
    // 移動元の位置
    const src_path = cmd.args[0] as Path;

    // 移動先の位置
    const dst_path = cmd.args[1] as Path;

    // 移動する項
    const trm = src_path.getTerm(root as App);

    // 移動元の項の親の加算
    const trm_parent_add = trm.parent;
    assert(trm_parent_add.isAdd(), "move add")

    // 移動する項をキャンセルする。
    trm.cancel = true;
    showRoot(root);
    yield;

    // 移動元の項の親の加算から、移動する項を取り除く。
    trm.remArg();
    showRoot(root);
    yield;

    if(trm_parent_add.args.length == 1){
        // 移動元の項の親の加算の引数が1個の場合

        // 引数が1個だけの加算や乗算を、唯一の引数で置き換える。
        oneArg(trm_parent_add);
    }

    // 移動先の親
    let parent = dst_path.getTerm(root as App, true);
    let add : App;

    if(parent.isAdd()){
        // 移動先の親が加算の場合

        add = parent as App;
    }
    else{
        // 移動先の親が加算でない場合

        add = new App(operator("+"), []);
        parent.replace(add);
        add.addArg(parent);
    }

    // 移動する項のキャンセルをはずす。
    trm.cancel = false;

    // 移項したので符号を反転する。
    trm.value *= -1;

    // 移動先のインデックス
    const idx = last(dst_path.indexes);

    // 加算の中の指定した位置に挿入する。
    add.insArg(trm, idx);

    showRoot(root);
}

/**
 * 
 * @param cmd 
 * @param root
 * @description 分配法則を適用する。 
 */
export function* distribute(cmd : App, root : App){
    assert(cmd.args.length == 1 && cmd.args[0] instanceof Path, "dist fnc");

    // 分配法則を適用する位置
    const src = cmd.args[0] as Path;

    // 分配法則を適用する乗算
    const mul = src.getTerm(root) as App;

    assert(mul.isMul(), "dist-fnc");


    assert(mul.args.length == 2, "dist fnc");
    assert(mul.args[1].isAdd(), "dist fnc 2")

    // 乗数
    const multiplier = mul.args[0];

    // 乗数の係数に乗算の係数をかける。
    multiplier.value *= mul.value;

    // 乗数をかけられる加算
    const add = mul.args[1] as App;

    // 乗算を加算に置き換える。
    mul.replace(add);

    // mul.args[0].cancel = true;
    showRoot(root);
    yield;

    for(const [i, trm] of add.args.entries()){
        // 加算の中のすべての引数に対し

        // 乗数をかける。
        add.setArg( multiply(multiplier.clone(), trm), i );

        showRoot(root);
        yield;
    }
}

export function* greatestCommonFactor(cmd : App, root : App){
    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path && cmd.args[1] instanceof ConstNum, "greatest common factor");

    const src = cmd.args[0] as Path;
    const cnt = cmd.args[1].value;

    const mul = src.getTerm(root) as App;
    assert(mul.isMul(), "gcf 1");

    const mul_parent_add = mul.parent;
    assert(mul_parent_add.isAdd(), "gcf 2");

    const start_pos = mul_parent_add.args.indexOf(mul);
    assert(start_pos != -1, "gcf 3");

    let left_cnt : number = 0;
    const args = mul_parent_add.args.slice(start_pos + 1, start_pos + 1 +(cnt - 1)) as App[];
    assert(args.length != 0 && args.every(x => x.isMul()), "gcf 4");

    mul.remArg();
    args.forEach(x => x.remArg());

    // 乗算の左側から共通因子をくくり出す。
    const left_factors : Term[] = [];
    while(mul.args.length != 0){
        const factor = mul.args[0];
        if(args.some(x => x.args.length == 0 || !factor.eq(x.args[0]))){
            break;
        }

        left_factors.push(factor);

        mul.args.shift();
        args.forEach(x => x.args.shift());
    }

    // 乗算の右側から共通因子をくくり出す。
    const right_factors : Term[] = [];
    while(mul.args.length != 0){
        const factor = last(mul.args);
        if(args.some(x => x.args.length == 0 || !factor.eq(last(x.args)))){
            break;
        }

        right_factors.push(factor);

        mul.args.pop();
        args.forEach(x => x.args.pop());
    }

    // 新たに引数が空の乗算を作る。
    const new_mul = new App(operator("*"), []);

    if(left_factors.length != 0){
        // 左側に共通因子がある場合

        new_mul.addArgs(left_factors);
    }

    const new_add = new App(operator("+"), [mul]);
    new_add.addArgs(args);


    new_mul.addArg(new_add);

    if(right_factors.length != 0){
        // 右側に共通因子がある場合

        new_mul.addArgs(right_factors);
    }

    mul_parent_add.insArg(new_mul, start_pos);

    if(mul_parent_add.args.length == 1){

        // 引数が1個だけの加算や乗算を、唯一の引数で置き換える。
        oneArg(mul_parent_add);
    }

    showRoot(root);
}

/**
 * 
 * @param root 
 * @description 乗算や除算の引数の符号をまとめる。
 */
export function* mulSign(root : App){
    const muldivs = allTerms(root).filter(x => x.isMul() || x.isDiv()) as App[];

    while(muldivs.length != 0){
        const app = muldivs.pop();

        if(app.args.some(x => Math.sign(x.value) == -1)){

            const sgn = app.args.reduce((acc,cur)=> acc * Math.sign(cur.value), 1);
            app.value *= sgn;
            app.args.forEach(x => x.value = Math.abs(x.value));

            showRoot(root);
            yield;
        }
    }
}




}