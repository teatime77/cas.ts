namespace casts {
//
export function makeMathDiv(){
    mathDiv = document.createElement("div");
    mathDiv.className = "math-div";
    mathDivRoot.appendChild(mathDiv);
}


export function addHtml(html : string){
    const div = document.createElement("div");
    div.innerHTML = html;
    mathDiv.parentElement!.insertBefore(div, mathDiv);

    if(html.indexOf("$") != -1){
        renderMathInElement(div, {
            delimiters : [ 
                {left: "$", right: "$", display: false}
            ],
            trust : true
        });
    }
}


export function addDiv(html : string){
    const div = document.createElement("div");
    div.innerHTML = html;
    mathDivRoot.appendChild(div);
}


export function mulR(... rs : Rational[]) : Rational {
    const numerator   = rs.reduce((acc, cur) => acc * cur.numerator,   1);
    const denominator = rs.reduce((acc, cur) => acc * cur.denominator, 1);

    return new Rational(numerator, denominator);
}


export function show(app : App, root : App){
    assert(app.args.length == 1 && app.args[0] instanceof Path);
    const path = app.args[0] as Path;
    const trm  = path.getTerm(root);
    msg(`show:[${trm.str()}]`);
    // addHtml(`$ ${trm.tex()} $`)
}

/**
 * 
 * @param mul 乗算
 * @description 乗算の引数の係数をすべて1にする。
 */
function normalizeMul(mul : App){
    assert(mul.isMul());
    for(const trm of mul.args){
        mul.value.setmul(trm.value);
        trm.value.set(1);
    }
}

/**
 * 
 * @param multiplier_cp 乗数
 * @param multiplicand_cp 被乗数
 * @returns 
 * 
 * @description 乗数と被乗数の乗算を返す。
 * 
 */
export function multiply(multiplier : Term, multiplicand : Term) : Term {
    if(multiplier.isZero() || multiplicand.isZero()){
        return new ConstNum(0);
    }

    const mul = new App(operator("*"), []);

    const multiplier_cp = multiplier.clone();
    const multiplicand_cp = multiplicand.clone();
    
    // 乗算の係数 = 乗数の係数 * 被乗数の係数
    mul.value = mulR(multiplier_cp.value, multiplicand_cp.value);
    multiplier_cp.value.set(1);
    multiplicand_cp.value.set(1);

    for(const trm of [multiplier_cp, multiplicand_cp]){
        // 乗数と被乗数に対し

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

/**
 * 
 * @param args 引数リスト
 * @description 引数リストから乗算を作る。
 */
function multiplyArgs(args: Term[]) : Term {
    if(args.length == 0){
        return new ConstNum(1);
    }
    else if(args.length == 1){
        return args[0];
    }
    else{
        return new App(operator("*"), args);
    }
}

export function showRoot(root : Term){
    assert(root != null, "show root");
    root.setParent(null);

    root.setTabIdx();
    const tex = root.tex();
    render(mathDiv, tex);
}

/**
 * 
 * @param app コマンド
 * @param root ルート
 * @description 置換する。
 */
export function* subst(app: App, root : Term){
    assert(app.args.length == 2, "SUBST");

    addHtml(`$${app.args[0].tex()}$ に $${app.args[1].tex()}$ を代入する。`);

    root.setParent(null);
    const targets = getSubTerms(root, app.args[0]);
    for(const t of targets){
        const dst = app.args[1].clone();
        if(dst.isMul() && t.parent!.isMul()){
            t.parent!.insArgs((dst as App).args, t.index());

            t.remArg();
            t.parent!.value.setmul(t.value);
        }
        else{

            t.replace(dst);
        }

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
export function* mulEq(multiplier : Term, root : App) : Generator<Term> {
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

    setRoot(root : App){
        this.root = root;

        makeMathDiv();

        root.setStrVal();
        root.setTabIdx();
        const tex = root.tex();
        render(mathDiv, tex);
    }

    /**
     * 
     * @param app 乗数
     * @param root ルート
     * @description ルートに乗数をかける。
     */
    *mulRoot(app: App){
        addHtml(`両辺に $${app.args[0].tex()}$ をかける。`);

        assert(app.args.length == 1, "mul-eq");

        // 乗数
        const multiplier = app.args[0];

        if(this.root!.isEq()){
            // ルートが等式の場合

            yield* mulEq(multiplier, this.root!);
        }
        else if(this.root instanceof App && this.root.fncName == "+"){
            // ルートが加算の場合

            // 加算の中の各項に対し、乗数をかける。
            yield* mulAdd(this.root, this.root, multiplier);
        }
        else{
            // ルートが等式や加算でない場合

            // 被乗数に乗数をかける。
            this.root = multiply(multiplier, this.root!) as App;
            assert(this.root instanceof App, "mul root");
        }
    }

    /**
     * 
     * @param trm 辺の値
     * @description 辺を追加する。
     */
    *appendSide(app : App){
        assert(app.args.length == 1, "add side");
        const side = app.args[0];

        addHtml(`$${side.tex()}$ の辺を追加する。`)

        let eq : App;
        if(this.root!.isEq()){
            eq = this.root!;
        }
        else{
            eq = new App(operator("=="), [this.root!]);
            this.root = eq;
        }

        eq.addArg(side);
    }
}

/**
 * 
 * @param div 除算
 * @param multipliers 乗数のリスト
 * @param divisors 除数のリスト
 * @description 除算の中の乗数と除算を、それぞれのリストに追加する。
 */
function getMultipliersDivisorsInDiv(div : App, multipliers : Term[], divisors : Term[]){
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

/**
 * 
 * @param mul 乗算
 * @returns 乗数のリストと除数のリスト
 * @description 乗算の中の乗数のリストと除数のリストを返す。
 */
function getMultipliersDivisors(mul : App) : [Term[], Term[]]{
    // 乗数のリスト
    let multipliers : Term[] = [];

    // 除数のリスト
    let divisors : Term[] = [];

    for(const trm of mul.args){
        // 乗算の引数に対し

        if(trm.isDiv()){
            // 除算の場合

            getMultipliersDivisorsInDiv(trm as App, multipliers, divisors);
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

    return [multipliers, divisors];
}

/**
 * 
 * @param root ルート
 * @param app 乗算または除算
 * @param multipliers 乗数のリスト
 * @param divisors 除数のリスト
 * @description 係数を除いて値が同じ乗数と除数のペアをキャンセルする。
 */
function* cancelOut(root : Term, app : App, multipliers : Term[], divisors : Term[]){

    // 乗数や除数のリストからキャンセルされた項を取り除く。
    multipliers = multipliers.filter(x => ! x.cancel);
    divisors = divisors.filter(x => ! x.cancel);

    for(const m of multipliers){
        // すべての乗数に対し

        const m_str2 = m.str2();

        // 値が同じ除数を探す。
        const d = divisors.find(x => x.str2() == m_str2);
        if(d == undefined){
            // 係数を除いて値が同じ除数がない場合

            continue;
        }

        // msg(`cancel m:[${m.str2()}] d:[${d.str2()}]`)

        // 対応する乗数と除数をキャンセルする。
        m.cancel = true;
        d.cancel = true;

        assert(d.value.abs() == 1 || m.value.abs() == d.value.abs());
        app.value.setmul(m.value);
        app.value.setdiv(d.value);

        showRoot(root);
        yield;
    }
}

/**
 * 
 * @param root ルート
 * @description 乗算内の相殺する項をキャンセルする。
 */
export function* cancelMul(root : Term){
    addHtml("乗算内の相殺する項をキャンセルする。");

    // すべての乗算のリスト
    const mul_terms = allTerms(root).filter(x => x.isMul()) as App[];

    for(const mul of mul_terms){
        // すべての乗算に対し

        if(mul.args.find(x => x.isDiv()) == undefined){
            // 乗算の引数に除算が含まれない場合
            continue;
        }

        let [multipliers, divisors] = getMultipliersDivisors(mul);

        yield* cancelOut(root, mul, multipliers, divisors);
    }
}


/**
 * 
 * @param root ルート
 * @description 除算の中の相殺する項をキャンセルする。
 */
export function* cancelDiv(root : Term){
    addHtml("除算の中の相殺する項をキャンセルする。");

    // すべての除算のリスト
    const div_terms = allTerms(root).filter(x => x.isDiv()) as App[];

    for(const div of div_terms){
        // すべての除算に対し

        // 乗数のリスト
        let multipliers : Term[] = [];

        // 除数のリスト
        let divisors : Term[] = [];

        getMultipliersDivisorsInDiv(div, multipliers, divisors);

        yield* cancelOut(root, div, multipliers, divisors);
    }
}


/**
 * 
 * @param root ルート
 * @description 加算内の相殺する項をキャンセルする。
 */
export function* cancelAdd(root : Term){
    addHtml("加算内の相殺する項をキャンセルする。");

    // すべての加算のリスト
    const add_terms = allTerms(root).filter(x => x.isAdd()) as App[];

    for(const add of add_terms){
        // すべての加算に対し

        add.setStrVal();

        for(const [idx, trm] of add.args.entries()){
            // 加算の引数に対し

            if(trm.cancel){
                continue;
            }

            // 係数以外が一致し、キャンセル済みでなく、係数の正負が逆の項を探す。
            const trm2 = add.args.slice(idx + 1).find(x => x.str2() == trm.str2() && ! x.cancel && x.value.fval() == - trm.value.fval());
            if(trm2 != undefined){
                trm.cancel = true;
                trm2.cancel = true;

                showRoot(root);
                yield;
            }
        }
    }
}

/**
 * 
 * @param trm ハイライト表示する項
 * @param root ルート
 * @description 指定された項をハイライト表示する。
 */
export function* highlight(trm : Term, root : Term){
    trm.color = true;
    showRoot(root);
    yield;
    trm.color = false;
}

/**
 * 
 * @param root ルート
 * @description キャンセルされた項を取り除く。
 */
export function* remCancel(root : Term){
    addHtml("キャンセルされた項を取り除く。");

    // キャンセルされた項のリスト
    const canceled = allTerms(root).filter(x => x.cancel);

    for(const can of canceled){
        // すべてのキャンセルされた項に対し

        if(can.parent!.isMul() || can.parent!.isAdd()){
            // 親が乗算の場合

            yield* highlight(can, root);

            // 乗算の引数から取り除く。
            can.remArg();
        }
        else if(can.parent!.isDiv()){
            // 親が除算の場合

            if(can.parent!.args[0] == can){
                // 分子の場合

                // 分子を1にする。
                can.parent!.args[0] = new ConstNum(1);
            }
            else if(can.parent!.args[1] == can){
                // 分母の場合

                // 分母を1にする。
                can.parent!.args[1] = new ConstNum(1);
            }
            else{
                assert(false, "trim mul 2");
            }
        }
        // else if(can.parent!.isAdd()){

        // }
        else{
            assert(false, "rem cancel");
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
    arg1.value.setmul(app.value);
}

/**
 * @param add 親の加算
 * @param add_child 子の加算
 * @description 加算の中の加算を、親の加算にまとめる。
 */
export function resolveAdd(add : App, add_child : App){
    // 引数の中の加算の位置
    const idx = add.args.indexOf(add_child);

    // 引数の中の加算を削除する。
    add_child.remArg();

    // 引数の中の加算の引数に係数をかける。
    add_child.args.forEach(x => x.value.setmul(add_child.value));

    // 引数の中の加算の引数を元の加算の引数に入れる。
    add.insArgs(add_child.args, idx);
}

/**
 * 
 * @param root ルート
 * @description 加算の中の加算を、親の加算にまとめる。
 */
export function* resolveAddAll(root : Term){
    addHtml("加算の整理をする。");

    // すべての加算のリスト
    const add_terms = allTerms(root).filter(x => x.isAdd()) as App[];

    while(add_terms.length != 0){
        // 未処理の加算がある場合

        const add = add_terms.pop()!;

        while(true){
            // 加算の引数の中の加算を探す。
            const add_child = add.args.find(x => x.isAdd()) as App;
            if(add_child == undefined){
                // ない場合

                break;
            }

            // 加算の中の加算を、親の加算にまとめる。
            resolveAdd(add, add_child);

            showRoot(root);
            yield;
        }
    }
}

export function* zeroOneAddMul(root : App){
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
            continue;
        }

        // 引数がない乗算を探す。
        const mul0 = allTerms(root).find(x => x.isMul() && (x as App).args.length == 0);
        if(mul0 != undefined){
            // 引数がない乗算がある場合

            assert(mul0.parent != null, "trim-mul 3");
            if(mul0.parent!.isDiv()){
                // 引数がない乗算が、除算の分子か分母の場合

                // その除算の分子か分母を1で置き換える。
                mul0.replace(new ConstNum(1));
            }
            else if(mul0.parent!.isMul()){
                // 引数のない乗算が、乗算の引数の場合

                // その乗算の引数を取り除く。
                mul0.remArg();
            }
            else{
                assert(false, "trim-mul 5");
            }

            showRoot(root);
            yield;
            continue;
        }

        break;
    }
}

export function* trimMul(root : App){
    addHtml("式の整理をする。");

    root.setParent(null);
    while(true){
        yield* zeroOneAddMul(root);

        // 分母が1の除算を探す。
        const div = allTerms(root).find(x => x.isDiv() && (x as App).args[1].isOne()) as App;
        if(div != undefined){
            // 分母が1の除算がある場合

            // その除算を分子で置き換える。
            div.replace(div.args[0]);

            // 分子の係数に、除算の係数をかける。
            div.args[0].value.setmul(div.value);

            showRoot(root);
            yield;
            continue;
        }

        // 引数に定数を含む乗算のリスト
        const const_muls = allTerms(root).filter(x => x.isMul() && (x as App).args.some(y => y instanceof ConstNum)) as App[];
        if(const_muls.length != 0){

            for(const mul of const_muls){
                // 引数に定数を含む乗算に対し

                // 引数内の定数のリスト
                const nums = mul.args.filter(x => x instanceof ConstNum);

                // 乗算の係数に、引数内の定数の積をかける。
                mul.value.setmul( nums.reduce((acc,cur) => mulR(acc, cur.value), new Rational(1)) );

                // 引数内の定数を取り除く。
                nums.forEach(x => x.remArg());

                showRoot(root);
                yield;
            }

            continue;
        }

        // 引数に0を含む加算のリスト
        const zero_adds = allTerms(root).filter(x => x.isAdd() && (x as App).args.some(y => y.isZero())) as App[];
        if(zero_adds.length != 0){
            for(const add of zero_adds){
                // 引数に0を含む加算に対し

                // 引数内の0のリスト
                const zeros = add.args.filter(x => x.isZero());

                // 引数内の0を取り除く。
                zeros.forEach(x => x.remArg());

                showRoot(root);
                yield;
            }

            continue;
        }

        break;
    }
}

export function* movearg(cmd : App, root : App){
    addHtml("引数の順序を変える。");

    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path&& cmd.args[1] instanceof ConstNum, "move arg");

    const trm = (cmd.args[0] as Path).getTerm(root);
    let idx = trm.parent!.args.indexOf(trm);
    assert(idx != -1);

    const n = (cmd.args[1] as ConstNum).value.int();
    idx += n;

    if(0 < n){
        idx--;
    }

    trm.remArg();
    trm.parent!.insArg(trm, idx);
}

/**
 * 
 * @param cmd コマンド
 * @param root ルート
 * @description 指定した位置に正負が逆の項を挿入する。
 */
export function* addpm(cmd : App, root : App){
    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path, "add pm");

    // 挿入先の加算の位置
    const path = cmd.args[0] as Path;

    // 加算内の引数の位置
    const idx  = last(path.indexes);

    // 挿入先の加算
    const add = path.getTerm(root, true) as App;
    assert(add.isAdd() && idx < add.args.length);

    // 挿入する項
    const trm = cmd.args[1];

    addHtml(`$${trm.tex()}$ の正と負の項を追加する。`)

    // 挿入する項に-1をかけた値
    const trm2 = trm.clone();
    trm2.value.numerator *= -1;

    // 項を指定位置に挿入する。
    add.insArg(trm, idx);

    // -1をかけた値を指定位置の後ろに挿入する。
    add.insArg(trm2, idx + 1);
}

/**
 * 
 * @param cmd コマンド
 * @param root ルート
 * @description 除算を指定した位置で２つに分割する。
 */
export function* splitdiv(cmd : App, root : App){
    addHtml("分数を２つに分割する。");

    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path&& cmd.args[1] instanceof ConstNum, "move arg");

    // 分割する除算
    const div = (cmd.args[0] as Path).getTerm(root) as App;
    assert(div.isDiv());

    // 分割位置
    const idx = (cmd.args[1] as ConstNum).value.int();

    // 分子の加算
    const add = div.args[0] as App;
    assert(add.isAdd());

    // 新しい除算の分子になる加算
    const add2 = new App(operator("+"), []);

    // 元の加算から新しい加算に項を移動する。
    while(idx < add.args.length){
        const trm = add.args[idx];
        trm.remArg();

        add2.addArg(trm);
    }

    // 新しい除算
    const div2 = new App(operator("/"), [ add2, div.args[1].clone() ]);
    div2.value = div.value.clone();

    // 元の除算と新しい除算の加算
    const add3 = new App(operator("+"), []);

    // 元の除算を新しい加算で置き換える。
    div.replace(add3);

    // 新しい加算に2つの除算を追加する。
    add3.addArg(div);
    add3.addArg(div2);
}

export function* factor_out_div(cmd : App, root : App){
    addHtml(`分数から因数をくくり出す。`);

    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path&& cmd.args[1] instanceof ConstNum, "factor out div");
    const path = cmd.args[0] as Path;
    const trm = path.getTerm(root);

    // くくり出す項の親は乗算
    const mul = trm.parent as App;
    assert(mul.isMul());

    // 乗算は除算の分子
    const div = mul.parent as App;
    assert(div.isDiv() && div.args[0] == mul);

    // くくり出す項の数
    const cnt = (cmd.args[1] as ConstNum).value.int();

    // くくり出す項の乗算内の位置
    const idx = last(path.indexes);

    // 括り出す項のリスト
    const trms = mul.args.slice(idx, idx + cnt);

    // 括り出す項を乗算から取り除く。
    trms.forEach(x => x.remArg());

    if(div.parent!.isMul()){
        // 除算の親が乗算の場合

        // 除算の親の乗算
        const div_parent_mul = div.parent as App;

        // 除算の位置
        const div_i = div_parent_mul.args.indexOf(div);
        assert(div_i != -1);

        // 除算の親の乗算に括り出す項を挿入する。
        div_parent_mul.insArgs(trms, div_i + 1);
    }
    else{
        // 除算の親が乗算でない場合

        // 除算の親になる乗算を作る。
        const parent_mul = new App(operator("*"), []);

        // 除算を乗算で置き換える。
        div.replace(parent_mul);
        
        // 乗算に除算を追加する。
        parent_mul.addArg(div);

        // 乗算に括り出す項を追加する。
        parent_mul.addArgs(trms);
    }
}

/**
 * 
 * @param cmd コマンド
 * @param root ルート
 * @description 移項する。
 */
export function* transpose(cmd : App, root : Term){
    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path && cmd.args[1] instanceof Path, "move");
    assert(root instanceof App, "move 2");
    
    // 移動元の位置
    const src_path = cmd.args[0] as Path;

    // 移動先の位置
    const dst_path = cmd.args[1] as Path;

    // 移動する項
    const trm = src_path.getTerm(root as App);

    addHtml(`$${trm.tex()}$ を移項する。`)

    // 移動する項をキャンセルする。
    trm.cancel = true;
    showRoot(root);
    yield;

    // 移動元の項の親
    const trm_parent_add = trm.parent!;

    if(trm_parent_add.isAdd()){
        // 移動元の項の親が加算の場合

        // 移動元の項の親の加算から、移動する項を取り除く。
        trm.remArg();

        if(trm_parent_add.args.length == 1){
            // 移動元の項の親の加算の引数が1個の場合
    
            // 引数が1個だけの加算や乗算を、唯一の引数で置き換える。
            oneArg(trm_parent_add);
        }
    }
    else if(trm_parent_add.isEq()){
        // 移動元の項の親が等式の場合(移動元が辺の場合)

        // 辺の0を入れる。
        trm.replace(new ConstNum(0));
    }
    else{

        assert(false, "move add")
    }

    showRoot(root);
    yield;

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
    trm.value.numerator *= -1;

    // 移動先のインデックス
    const idx = last(dst_path.indexes);

    // 加算の中の指定した位置に挿入する。
    add.insArg(trm, idx);
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
    multiplier.value.setmul(mul.value);

    // 乗数をかけられる加算
    const add = mul.args[1] as App;

    addHtml(`$${multiplier.tex()}$ を $${add.tex()}$ の各項にかける。`)

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
    addHtml(`共通因子をくくり出す。`);

    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path && cmd.args[1] instanceof ConstNum, "greatest common factor");

    const src = cmd.args[0] as Path;
    const cnt = cmd.args[1].value.int();

    const mul = src.getTerm(root) as App;
    assert(mul.isMul(), "gcf 1");

    const mul_parent_add = mul.parent!;
    assert(mul_parent_add.isAdd(), "gcf 2");

    const start_pos = mul_parent_add.args.indexOf(mul);
    assert(start_pos != -1, "gcf 3");

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
}

/**
 * 
 * @param cmd 共通化する項の指定
 * @param root ルート
 * @description 最大の共通因数でくくり出す。
 */
export function* greatestCommonFactor2(cmd : App, root : App){
    addHtml(`共通因子をくくり出す。`);
    assert(cmd.args.length == 2 && cmd.args[0] instanceof Path && cmd.args[1] instanceof ConstNum, "greatest common factor");

    const src = cmd.args[0] as Path;
    const cnt = cmd.args[1].value.int();

    // 共通化する最初の項は乗算
    const mul = src.getTerm(root) as App;
    assert(mul.isMul(), "gcf 1");

    // 共通化する項の親は加算
    const mul_parent_add = mul.parent!;
    assert(mul_parent_add.isAdd(), "gcf 2");

    // 共通化する最初の項の位置
    const start_pos = mul_parent_add.args.indexOf(mul);
    assert(start_pos != -1, "gcf 3");

    // 共通化する項のリスト
    const args = mul_parent_add.args.slice(start_pos, start_pos + cnt) as App[];

    // 比較できるようにstrvalをセットする。
    args.forEach(x => x.setStrVal());

    // 共通化するすべての項を、加算から取り除く。
    args.forEach(x => x.remArg());

    for(const [i, trm] of Array.from(args).entries()){
        if(! trm.isMul()){
            args[i] = new App(operator("*"), [ trm, new ConstNum(1) ]);
            args[i].setStrVal();
        }
    }
    assert(args.length != 0 && args.every(x => x.isMul()), "gcf 4");
    args.forEach(x => normalizeMul(x));

    // 共通化する項の中のすべての乗数
    const all_multipliers : Term[] = [];

    // 共通化する項の中のすべての除数
    const all_divisors : Term[] = [];

    // 共通の乗数のリスト
    let common_multipliers : Term[];

    // 共通の除数のリスト
    let common_divisors: Term[];

    for(const [idx, arg] of args.entries()){
        // 共通化するすべての項に対し

        // 乗数と除数のリスト
        let [multipliers, divisors] = getMultipliersDivisors(arg);

        if(idx == 0){
            // 共通化する最初の項の場合

            // 共通の乗数と除数のリストを、最初の項の乗数と除数のリストで初期化する。
            common_multipliers = multipliers.map(x => x.clone());
            common_divisors    = divisors.map(x => x.clone());

            // 共通の乗数と除数は係数を1にする。
            common_multipliers.forEach(x => x.value.set(1));
            common_divisors.forEach(x => x.value.set(1));
        }
        else{
            // 最初の項でない場合

            // 共通の乗数は、この項の乗数の中に現れるものに限定する。
            common_multipliers = common_multipliers!.filter(x => multipliers.some(y => x.str2() == y.str2()));

            // 共通の除数は、この項の除数の中に現れるものに限定する。
            common_divisors    = common_divisors!.filter(x => divisors.some(y => x.str2() == y.str2()));
        }
        assert(common_multipliers.length != 0 || common_divisors.length != 0, "gcf 5");

        // 共通化する項のすべての乗数と除数をリストに追加する。
        all_multipliers.push(... multipliers);
        all_divisors.push(... divisors);
    }

    // 共通因子
    let common_factor : Term
    if(common_divisors!.length != 0){
        // 共通の除数がある場合

        // 分子
        const numerator   = multiplyArgs(common_multipliers!);

        // 分母
        const denominator = multiplyArgs(common_divisors!);

        // 除算で共通因子を作る。
        common_factor = new App(operator("/"), [ numerator, denominator ]);
    }
    else{
        // 共通の除数がない場合

        // 乗算で共通因子を作る。
        common_factor = multiplyArgs(common_multipliers!);
    }

    // 共通乗数に含まれる乗数はキャンセルする。
    all_multipliers.filter(x => common_multipliers.some(y => x.str2() == y.str2())).forEach(x => x.cancel = true);

    // 共通除数に含まれる除数はキャンセルする。
    all_divisors.filter(x => common_divisors.some(y => x.str2() == y.str2())).forEach(x => x.cancel = true);

    // 共通化するすべての項のみで、新たに加算を作る。
    const add_args = new App(operator("+"), args);

    // 共通因子 × 新しい加算
    const common_factor_add_args = multiply(common_factor, add_args);

    // 共通因子 × 新しい加算を、共通化する項の親の加算に挿入する。
    mul_parent_add.insArg(common_factor_add_args, start_pos);

    if(mul_parent_add.args.length == 1){
        // 共通化する項の親の加算の引数が1個だけの場合

        // 引数が1個だけの加算や乗算を、唯一の引数で置き換える。
        oneArg(mul_parent_add);
    }
}



/**
 * 
 * @param root 
 * @description 乗算や除算の引数の符号をまとめる。
 */
export function* mulSign(root : App){
    addHtml("乗算や除算の引数の符号をまとめる。");

    const muldivs = allTerms(root).filter(x => x.isMul() || x.isDiv()) as App[];

    while(muldivs.length != 0){
        const app = muldivs.pop()!;

        if(app.args.some(x => x.value.sign() == -1)){

            const sgn = app.args.reduce((acc,cur)=> acc * cur.value.sign(), 1);
            app.value.numerator *= sgn;
            app.args.forEach(x => x.value.setAbs());

            showRoot(root);
            yield;
        }
    }
}

export function* verify(cmd : App, root : App){
    assert(cmd.args.length == 1 && cmd.args[0] instanceof App);
    const expr = cmd.args[0] as App;

    if(expr.str() == root.str()){
        msg("verify ok");        
    }
    else{
        msg(`org:[${root.str()}]`);
        msg(`ver:[${expr.str()}]`);
        addDiv("<h1>エラー</h1>")

        makeMathDiv();

        expr.setStrVal();
        expr.setTabIdx();
        const tex = expr.tex();
        render(mathDiv, tex);
        yield;

        assert(false);
    }
}


}