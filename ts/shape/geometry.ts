namespace casts {
//

export function linesIntersectionM(l1:AbstractStraightLineM, l2:AbstractStraightLineM) : Vec2 {
    const l1_p1 = l1.p1.toVec();
    const l1_p2 = l1.p2.toVec();

    const l2_p1 = l2.p1.toVec();
    const l2_p2 = l2.p2.toVec();

    const l1_p12 = l1_p2.sub(l1_p1);
    const l2_p12 = l2_p2.sub(l2_p1);

    /*
    l1.p1 + u l1.p12 = l2.p1 + v l2.p12

    l1.p1.x + u l1.p12.x = l2.p1.x + v l2.p12.x
    l1.p1.y + u l1.p12.y = l2.p1.y + v l2.p12.y

    l1.p12.x, - l2.p12.x   u = l2.p1.x - l1.p1.x
    l1.p12.y, - l2.p12.y   v = l2.p1.y - l1.p1.y
    
    */
    const m = new Mat2([[l1_p12.x, - l2_p12.x], [l1_p12.y, - l2_p12.y]]);
    const v = new Vec2(l2_p1.x - l1_p1.x, l2_p1.y - l1_p1.y);
    const mi = m.inv();
    const uv = mi.dot(v);
    const u = uv.x;

    return l1_p1.add(l1_p12.mul(u));
}


export function calcFootOfPerpendicularM(pos:PointM, line: AbstractStraightLineM) : Vec2 {
    const p1 = line.p1.toVec();
    const p2 = line.p2.toVec();

    const e = p2.sub(p1).unit();
    const v = pos.toVec().sub(p1);
    const h = e.dot(v);

    const foot = p1.add(e.mul(h));

    return foot;
}

export function lineArcIntersectionM(line:AbstractStraightLineM, arc:CircleArcM) : Vec2[] {
    // 円/弧の中心
    const center_pos = arc.getCenterXY();

    // 円/弧の中心から線分に垂線をおろして、その足をfootとする。
    const foot = calcFootOfPerpendicularM(arc.center, line);

    // 円/弧の中心から垂線の足までの距離。
    const h = foot.sub(center_pos).len();

    // 円/弧の半径
    let r = arc.radius.calc();

    if(r < h ){
        // 半径が垂線の足までの距離より小さい場合

        return [];
    }

    // 垂線の足から交点までの距離
    let t = Math.sqrt(r*r - h * h);

    // 線分の単位方向ベクトル
    const e = line.p2.toVec().sub(line.p1.toVec()).unit();
    
    // 交点の座標
    let p1 = foot.add(e.mul(t));
    let p2 = foot.add(e.mul(-t));

    return [p1, p2];
}

export function ArcArcIntersectionM(arc1:CircleArcM, arc2:CircleArcM) : Vec2[] {
    // 円/弧の中心
    const c1 = arc1.getCenterXY();
    const c2 = arc2.getCenterXY();

    // 円/弧の半径
    const r1 = arc1.radius.calc();
    const r2 = arc2.radius.calc();

    // 円/弧の中心の距離
    const L = c1.dist(c2);

    // r1*r1 - t*t = r2*r2 - (L - t)*(L - t)
    //             = r2*r2 - L*L + 2Lt - t*t
    // r1*r1 = r2*r2 - L*L + 2Lt
    const t = (r1*r1 - r2*r2 + L*L)/ (2 * L);

    // 円/弧の交点から、円/弧の中心を結ぶ直線におろした垂線の長さの二乗
    const h2 = r1*r1 - t*t;
    if(h2 < 0){
        return [];
    }

    const h = Math.sqrt(h2);

    // c1→c2の単位ベクトル
    const e1 = c2.sub(c1).unit();

    // e1の法線ベクトル
    const e2 = new Vec2(- e1.y, e1.x);

    // 円/弧の交点から、円/弧の中心を結ぶ直線におろした垂線の足
    const foot = c1.add(e1.mul(t));
    
    // 交点の座標
    let p1 = foot.add(e2.mul(h));
    let p2 = foot.add(e2.mul(-h));

    return [p1, p2];
}


}