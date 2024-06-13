namespace casts {
//
function Point2Vec(pt : PointM) : Vec2 {
    const x = pt.x.calc();
    const y = pt.y.calc();

    return new Vec2(x, y);
}

export function linesIntersectionM(l1:AbstractStraightLineM, l2:AbstractStraightLineM) : Vec2 {
    const l1_p1 = Point2Vec(l1.p1);
    const l1_p2 = Point2Vec(l1.p2);

    const l2_p1 = Point2Vec(l2.p1);
    const l2_p2 = Point2Vec(l2.p2);

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

}