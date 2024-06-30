namespace casts {

const fgColor = "black";
const focusColor = "red";
const strokeWidth = 4;
const fontSize = 10;
let rangeDic : { [id : number] : Range } = {};
let data_id : string = "1";
const rangeInterval = 3;
const angleRadius = 4;
let ViewSizeLine : string = "";

function radian(degree : number) : number {
    return degree * Math.PI / 180;
}

function toPointM(trm : Term) : PointM{
    const shape = trm.getEntity() as ShapeM;

    if(shape instanceof PointM){
        return shape;
    }
    else if(shape instanceof FootOfPerpendicularM){
        return shape.foot;
    }
    else{
        throw new MyError();
    }
}

function meanPos(points: PointM[]) : Vec2 {
    const xs = points.map(pt => pt.x.calc());
    const ys = points.map(pt => pt.y.calc());

    const cx = sum(xs) / xs.length;
    const cy = sum(ys) / ys.length;

    return new Vec2(cx, cy);
}

function isDrawing(trm : Term) : boolean {
    if(trm.isEq()){
        const app = trm as App;
        if(app.args[1] instanceof App){
            const rhs = app.args[1] as App;            
            if(isSystemName(rhs.fncName)){
                return true;
            }
        }
    }

    return false;
}

function isAction(trm : Term) : boolean {
    return trm instanceof App && trm.fncName[0] == '@';
}

export class PointM extends ShapeM {
    x : Term;
    y : Term;

    point : SVGCircleElement;

    constructor(x : Term, y : Term){
        super(movie);
        this.x = x;
        this.y = y;

        this.point = document.createElementNS("http://www.w3.org/2000/svg","circle");
        this.point.setAttribute("fill", this.color);        
        this.point.setAttribute("r", `${movie.toSvg2(5)}`);
        this.recalcShape();

        msg(`point cx:${this.x.calc()} cy:${this.y.calc()} r:${movie.toSvg2(5)}`)
        movie.svg.appendChild(this.point);
    }

    recalcShape() : void {        
        this.point.setAttribute("cx", `${this.x.calc()}`);
        this.point.setAttribute("cy", `${this.y.calc()}`);

        this.updateCaptionPos();
    }

    hide(){
        this.point.setAttribute("visibility", "hidden");
    }

    focus(is_focused : boolean){
        super.focus(is_focused);
        const color = is_focused ? focusColor : this.color;
        this.point.setAttribute("fill", color);
    }

    getCenterXY() : Vec2{
        return new Vec2(this.x.calc(), this.y.calc());
    }

    toVec() : Vec2 {
        const x = this.x.calc();
        const y = this.y.calc();
    
        return new Vec2(x, y);    
    }
}

export abstract class AbstractStraightLineM extends ShapeM {
    p1 : PointM;
    p2 : PointM;
    line : SVGLineElement;

    constructor(p1_ref : Term | PointM, p2_ref : Term | PointM){
        super(movie);

        if(p1_ref instanceof Term){

            this.p1 = toPointM(p1_ref);
        }
        else{

            this.p1 = p1_ref;
        }

        if(p2_ref instanceof Term){

            this.p2 = toPointM(p2_ref);
        }
        else{

            this.p2 = p2_ref;
        }

        this.line = document.createElementNS("http://www.w3.org/2000/svg","line");
        this.line.setAttribute("stroke", this.color);
        this.line.setAttribute("stroke-width", `${movie.toSvg2(strokeWidth)}`);
        movie.svg.appendChild(this.line);
    }

    getCenterXY() : Vec2{
        return meanPos([this.p1, this.p2]);
    }
}

export class LineSegmentM extends AbstractStraightLineM {
    constructor(p1_ref : Term | PointM, p2_ref : Term | PointM){
        super(p1_ref, p2_ref);
        this.recalcShape();
    }

    recalcShape() : void {        
        this.line.setAttribute("x1", `${this.p1.x.calc()}`);
        this.line.setAttribute("y1", `${this.p1.y.calc()}`);

        this.line.setAttribute("x2", `${this.p2.x.calc()}`);
        this.line.setAttribute("y2", `${this.p2.y.calc()}`);

        this.updateCaptionPos();
    }
}

class LineM extends AbstractStraightLineM {
    constructor(p1_ref : Term | PointM, p2_ref : Term | PointM){
        super(p1_ref, p2_ref);
        this.recalcShape();
    }

    recalcShape() : void {     
        const x1 = this.p1.x.calc();
        const y1 = this.p1.y.calc();
        const x2 = this.p2.x.calc();
        const y2 = this.p2.y.calc();
           
        this.line.setAttribute("x1", `${x1 - 10000 * (x2 - x1)}`);
        this.line.setAttribute("y1", `${y1 - 10000 * (y2 - y1)}`);

        this.line.setAttribute("x2", `${x1 + 10000 * (x2 - x1)}`);
        this.line.setAttribute("y2", `${y1 + 10000 * (y2 - y1)}`);

        this.updateCaptionPos();
    }
}

class HalfLineM extends AbstractStraightLineM {
    constructor(p1_ref : Term, p2_ref : Term){        
        super(p1_ref, p2_ref);
        this.recalcShape();
    }

    recalcShape() : void {     
        const x1 = this.p1.x.calc();
        const y1 = this.p1.y.calc();
        const x2 = this.p2.x.calc();
        const y2 = this.p2.y.calc();
           
        this.line.setAttribute("x1", `${x1}`);
        this.line.setAttribute("y1", `${y1}`);

        this.line.setAttribute("x2", `${x1 + 10000 * (x2 - x1)}`);
        this.line.setAttribute("y2", `${y1 + 10000 * (y2 - y1)}`);

        this.updateCaptionPos();
    }
}

export abstract class CircleArcM extends ShapeM {
    center : PointM;
    radius : Term;

    constructor(center : PointM, radius : Term){
        super(movie);
        this.center = center;
        assert(this.center instanceof PointM);
        this.radius = radius;
    }

    getCenterXY() : Vec2{
        return new Vec2(this.center.x.calc(), this.center.y.calc());
    }
}

class CircleM extends CircleArcM {

    circle: SVGCircleElement;

    constructor(center : Term, radius : Term){
        super(center.getEntity() as PointM, radius);

        this.circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        this.circle.setAttribute("fill", "none");
        this.circle.setAttribute("stroke", this.color);
        this.circle.setAttribute("stroke-width", `${movie.toSvg2(strokeWidth)}`);
        this.circle.setAttribute("fill-opacity", "0");
        this.circle.style.cursor = "move";

        this.recalcShape();

        msg(`circle cx:${this.center.x.calc()} cy:${this.center.y.calc()} r:${radius.calc()}`)
        movie.svg.appendChild(this.circle);
    }

    recalcShape() : void {        
        this.circle.setAttribute("cx", `${this.center.x.calc()}`);
        this.circle.setAttribute("cy", `${this.center.y.calc()}`);
        this.circle.setAttribute("r" , `${this.radius.calc()}`);

        this.updateCaptionPos();
    }
}


class ArcM extends CircleArcM {
    start  : Term;
    end    : Term;

    arc: SVGPathElement;

    constructor(center : PointM, radius : Term, start : Term, end : Term){
        super(center, radius);
        this.start  = start;
        this.end    = end;

        this.arc = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.arc.setAttribute("fill", "none");
        this.arc.setAttribute("stroke", this.color);
        this.arc.setAttribute("stroke-width", `${movie.toSvg2(strokeWidth)}`);
        // this.arc.setAttribute("fill-opacity", "0");
        this.arc.style.cursor = "move";

        this.recalcShape();
        movie.svg.appendChild(this.arc);
    }

    recalcShape() : void {        
        const cx = this.center.x.calc();
        const cy = this.center.y.calc();
        const r  = this.radius.calc();
        const start_th = radian(this.start.calc());
        const end_th = radian(this.end.calc());
        const x1 = cx + r * Math.cos(start_th);
        const y1 = cy + r * Math.sin(start_th);
        const x2 = cx + r * Math.cos(end_th);
        const y2 = cy + r * Math.sin(end_th);
        const large_arc_flag = Math.abs(end_th - start_th) < Math.PI ? 0 : 1;
        const sweep_flag = start_th < end_th ? 1 : 0;

        const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large_arc_flag} ${sweep_flag} ${x2} ${y2}`
        this.arc.setAttribute("d", d);

        msg(`arc cx:${cx} cy:${cy} r:${r} th:${(start_th*180/Math.PI).toFixed()}-${(end_th*180/Math.PI).toFixed()}`)
        this.updateCaptionPos();
    }
}

function makeAngleParams(points : PointM[]) : [PointM, ConstNum, ConstNum, ConstNum]{
    const poss = points.map(x => x.toVec());

    const center = points[1];
    const radius = new ConstNum(angleRadius);

    const p10 = poss[0].sub(poss[1]);
    const start_th = Math.atan2(p10.y, p10.x);
    const start = new ConstNum(start_th);

    const p12 = poss[2].sub(poss[1]);
    const end_th = Math.atan2(p12.y, p12.x);
    const end = new ConstNum(end_th);

    return [center, radius, start, end];
}

class AngleM extends ArcM {
    points : PointM[];
    
    constructor(points_ref : Term[]){
        const points = points_ref.map(x => x.getEntity()) as PointM[];
        assert(points.every(x => x instanceof PointM));

        const [center, radius, start, end] = makeAngleParams(points);
        super(center, radius, start, end);
        this.points = points;

        this.recalcShape();
    }

    recalcShape() : void {       
        if(this.points == undefined){
            // If this is called from the constructor of ArcM
            return;
        }
        const [center, radius, start, end] = makeAngleParams(this.points);
        this.radius.copyValue(radius);
        this.start.copyValue(start);
        this.end.copyValue(end);
        super.recalcShape();
    }
}

class TriangleM extends ShapeM {
    points : PointM[];
    lines  : LineSegmentM[];

    constructor(p0_ref : RefVar, p1_ref : RefVar, p2_ref : RefVar){
        super(movie);
        const p0 = p0_ref.getEntity() as PointM;
        const p1 = p1_ref.getEntity() as PointM;
        const p2 = p2_ref.getEntity() as PointM;

        this.points = [ p0, p1, p2];
        assert(this.points.every(x => x instanceof PointM));

        this.lines = [ new LineSegmentM(p0_ref, p1_ref), new LineSegmentM(p1_ref, p2_ref), new LineSegmentM(p2_ref, p0_ref)];
    }

    recalcShape() : void {        
    }

    getCenterXY() : Vec2{
        const xs = this.points.map(pt => pt.x.calc());
        const ys = this.points.map(pt => pt.y.calc());

        const cx = sum(xs) / xs.length;
        const cy = sum(ys) / ys.length;

        return new Vec2(cx, cy);
    }
}

class IntersectionM extends ShapeM {
    shape1 : AbstractStraightLineM | CircleArcM;
    shape2 : AbstractStraightLineM | CircleArcM;
    points  : PointM[] = [];

    constructor(ref1 : Term, ref2 : Term){
        super(movie);

        this.shape1 = ref1.getEntity() as AbstractStraightLineM | CircleArcM;
        this.shape2 = ref2.getEntity() as AbstractStraightLineM | CircleArcM;

        if(this.shape1 instanceof CircleArcM && this.shape2 instanceof AbstractStraightLineM){
            const tmp   = this.shape1;
            this.shape1 = this.shape2;
            this.shape2 = tmp;
        }        

        this.recalcShape();
    }

    recalcPoints(ps : Vec2[]){
        while(this.points.length < ps.length){
            this.points.push( new PointM(Zero(), Zero()) );
        }

        for(const [i, point] of this.points.entries()){
            point.x.value.set(ps[i].x);
            point.y.value.set(ps[i].y);
            point.recalcShape();    
        }
    }

    recalcShape() : void {
        if(this.shape1 instanceof AbstractStraightLineM && this.shape2 instanceof AbstractStraightLineM){
            const pos = linesIntersectionM(this.shape1, this.shape2);
            this.recalcPoints([pos]);
        }
        else if(this.shape1 instanceof AbstractStraightLineM && this.shape2 instanceof CircleArcM){
            const ps = lineArcIntersectionM(this.shape1, this.shape2);
            this.recalcPoints(ps);
        }
        else if(this.shape1 instanceof CircleArcM && this.shape2 instanceof CircleArcM){
            const ps = ArcArcIntersectionM(this.shape1, this.shape2);
            this.recalcPoints(ps);
        }
        else{
            throw new MyError();
        }
    }

    getCenterXY() : Vec2{
        return meanPos(this.points);
    }
}

class FootOfPerpendicularM extends ShapeM {
    point : PointM;
    line  : AbstractStraightLineM;
    foot  : PointM;

    constructor(point_ref : Term, line_ref : Term){
        super(movie);
        this.point = point_ref.getEntity() as PointM;
        this.line  = line_ref.getEntity() as AbstractStraightLineM;
        this.foot  = new PointM(Zero(), Zero());

        this.recalcShape();
    }

    recalcShape() : void {
        const foot_pos = calcFootOfPerpendicularM(this.point, this.line);
        this.foot.x.value.set(foot_pos.x);
        this.foot.y.value.set(foot_pos.y);
        this.foot.recalcShape();
    }

    getCenterXY() : Vec2{
        return this.foot.getCenterXY();
    }
}

class Parallel extends LineM {
    line1  : AbstractStraightLineM;
    point1  : PointM;
    point2  : PointM;

    constructor(line_ref : Term, point_ref : Term){
        const line1  = line_ref.getEntity() as AbstractStraightLineM;
        const point1 = point_ref.getEntity() as PointM;
        const point2 = new PointM(Zero(), Zero());
        super(point1, point2);
        this.line1 = line1;
        this.point1 = point1;
        this.point2 = point2;

        this.recalcShape();
    }

    recalcShape() : void {
        if(this.line1 == undefined){
            // If this is called from the constructor of LineM
            return;
        }
        const p12 = this.line1.p2.toVec().sub(this.line1.p1.toVec());
        const point2_pos = this.point1.toVec().add(p12);
        this.point2.x.value.set(point2_pos.x);
        this.point2.y.value.set(point2_pos.y);
        this.point2.recalcShape();

        super.recalcShape();
    }
}

class ThumbLine extends PointM {
    line  : AbstractStraightLineM;
    value : Term;

    constructor(line : AbstractStraightLineM, value : Term){
        super(Zero(), Zero());
        this.line  = line;
        this.value = value;
    }

    recalcShape() : void {
        if(this.line == undefined){
            // If this is called from the constructor of PointM
            return;
        }
        const p1 = this.line.p1.toVec();
        const p2 = this.line.p2.toVec();
        const e12 = p2.sub(p1).unit();
        const value = this.value.calc();
        const pos = p1.add(e12.mul(value));
        this.x.value.set(pos.x);
        this.y.value.set(pos.y);
        super.recalcShape();
    }
}


class Mark {
    shape : ShapeM;
    start : number;
    end!  : number;

    constructor(shape : ShapeM, start : number){        
        this.shape = shape;
        this.start = start;
    }
}

class Range extends Entity {
    rootLeftVar : Variable;
    startTime : number;
    start : Term;
    end   : Term;
    value! : ConstNum | PointM;
    interval : number;
    finished : boolean = false;
    lineIdx : number;

    constructor(root_left_var: Variable, start : Term, end : Term, interval : number = rangeInterval){
        super();
        this.startTime = new Date().getTime();
        this.rootLeftVar = root_left_var;
        this.start = start;
        this.end   = end;
        this.interval = interval;        
        this.lineIdx = movie.lineIdx;
    }

    getRatio() : number {
        const duration_sec = (new Date().getTime() - this.startTime) / 1000;
        const ratio = Math.min(1, duration_sec / this.interval);
        if(ratio == 1){
            this.finished = true;
        }

        return ratio;
    }

    getNumber() : number {
        const ratio = this.getRatio();

        if(this.start instanceof Term && this.end instanceof Term){
            return (1 - ratio) * this.start.calc() + ratio * this.end.calc();
        }
        throw new MyError();
    }

    get() : ConstNum | PointM {
        const ratio = this.getRatio();

        if(this.start instanceof App && this.start.entity instanceof PointM && this.end instanceof App && this.end.entity instanceof PointM){
            const x = (1 - ratio) * this.start.entity.x.calc() + ratio * this.end.entity.x.calc();
            const y = (1 - ratio) * this.start.entity.y.calc() + ratio * this.end.entity.y.calc();
            if(this.value == undefined){
                this.value = new PointM(new ConstNum(x), new ConstNum(y));
            }
            else{
                (this.value as PointM).x.value.set(x);
                (this.value as PointM).y.value.set(y);
            }
            return this.value;
        }
        else{
            throw new MyError();
        }
    }
}

class Length extends Entity {
    points : PointM[];

    constructor(p1 : Term, p2 : Term){
        super();
        this.points = [p1, p2].map(x => x.getEntity()) as PointM[];
        assert(this.points.every(x => x instanceof PointM));
    }

    getNumber() : number {
        const poss = this.points.map(x => x.toVec());
        return poss[0].sub(poss[1]).len();
    }
}

class Movie extends ViewM {
    lines : string[] = [];
    lineIdx : number = 0;
    speech! : Speech;
    marks : Mark[] = [];
    current : App | undefined;
    texDiv! : HTMLDivElement;

    constructor(){
        super();
    }

    setViewSize(args : string){
        const params = args.split(",").map(x => x.trim()).map(x => parseFloat(x)) as [number,number,number,number,number,number];
        assert(params.length == 6);
        this.initView(...params);
    }
    
    async saveMovie(){
        const lines = this.lines.slice();
        lines.unshift(ViewSizeLine);
        lines.unshift(`#pos:${JSON.stringify(captionShift)}`);
        lines.unshift("from lib import *");

        const data = {
            "command" : "write-movie",
            "id"      : data_id,
            "text"    : lines.join("\n")
        };
    
        const res =  await postData("/db", data);
        const status = res["status"];
        msg(`write movie status:[${status}]`);
    }

    toSvg2(x:number) : number{
        return x * this.svgRatio;
    }

    makeLine(x1: number, y1: number, x2: number, y2: number){
        const line = document.createElementNS("http://www.w3.org/2000/svg","line");
        line.setAttribute("stroke", fgColor);
        line.setAttribute("stroke-width", `${this.toSvg2(strokeWidth)}`);
        line.setAttribute("x1", `${x1}`);
        line.setAttribute("y1", `${y1}`);
        line.setAttribute("x2", `${x2}`);
        line.setAttribute("y2", `${y2}`);

        this.svg.appendChild(line);

        return line;
    }

    speakM(speech_texts : string[]){
        const line = speech_texts.find(x => x.startsWith(`# ${this.speech.lang2}`));
        if(line == undefined){
            msg(`no translation:${speech_texts[0]}`);
            return;
        }
        const text = line.substring(6);

        this.marks = [];
        const mark_stack : Mark[] = [];
        let speech_text : string = "";
        for(let i = 0; i < text.length; ){
            const c = text.charAt(i);
            if(c == '@'){
                let j = i + 1;
                for(; j < text.length && text.charAt(j) != '{'; j++);
                const name = text.substring(i + 1, j);
                const va = getVariable(name);
                const shape = va.getEntity() as ShapeM;
                assert(shape instanceof ShapeM);
                const mark = new Mark(shape, i);
                this.marks.push(mark);
                mark_stack.push(mark);

                i = j + 1;
            }
            else if(c == '}'){
                assert(mark_stack.length != 0);
                const mark = mark_stack.pop()!;
                mark.end = i;

                i++;
            }
            else{
                speech_text += c;

                i++;
            }
        }
        this.speech.callback = this.onBoundary.bind(this);
        
        this.speech.speak(speech_text);
        // speak(text.substring(6));
    }

    onBoundary(idx:number) : void {
        msg(`idx:${idx} marks:${this.marks.length}`);
        this.marks.filter(x => !x.shape.focused && x.start <= idx && idx < x.end).forEach(x => x.shape.focus(true));
        this.marks.filter(x =>  x.shape.focused && x.end   <= idx               ).forEach(x => x.shape.focus(false));
    }

    async getLines(){

        const texts = await fetchText(`../data/script/${data_id}.py`);
        this.lines = texts.replaceAll('\r', "").split('\n');
        
        const head = this.lines.shift();
        assert(head!.startsWith("from"));

        if(this.lines[0].startsWith("#pos:")){

            const pos = this.lines.shift()!;
            captionShift = JSON.parse(pos.substring(5));
        }
        
        if(this.lines[0].startsWith("#view")){
            const line = this.lines.shift()!;
            ViewSizeLine = line;
            this.setViewSize(line.substring(5).trim());
        }
    }

    *stepRanges(){
        while(true){
            const ranges = Object.values(rangeDic).filter(x => !x.finished);
            if(ranges.length == 0){
                break;
            }
            const changed_vars = new Set<Variable>(ranges.map(x => x.rootLeftVar));
            for(const va of variables){
                if(changed_vars.has(va)){
                    updateShape(va.expr);
                    variables.filter(x => x.depVars.includes(va)).forEach(x => changed_vars.add(x));
                }
            }

            yield;
        }
    }

    texWidth() : number {
        return movieWidth - this.width;
    }

    addTexDiv(){
        this.texDiv = document.createElement("div");
        this.texDiv.style.width = `${this.texWidth()}px`;
        $div("katex-div").style.display = "";
        $div("katex-div").appendChild(this.texDiv);
    }

    getEqTerms(root : App, trm : Term) : Term[] {
        const str = trm.strid();
        msg(`[${str}]---`)
        allTerms(root).forEach(x => msg(`[${x.strid()}]`));
        const trms = allTerms(root).filter(x => x.strid() == str);

        return trms
    }

    getEqTerm(root : App, trm : Term) : Term {
        const trms = this.getEqTerms(root, trm);
        if(trms.length == 1){
            return trms[0];
        }
        throw new MyError();
    }

    getAt(root : App, at : App) : Term {
        if(at.args.length == 1){
            return this.getEqTerm(root, at.args[0])
        }
        else{
            const trms = this.getEqTerms(root, at.args[0]);

            if(at.args[1] instanceof ConstNum){
                const idx = at.args[1].value.int() - 1;
                if(0 <= idx && idx < trms.length){
                    return trms[idx];
                }            
            }
        }

        throw new MyError();
    }

    doAction(cmd : App){
        if(this.current == undefined){
            throw new MyError();
        }

        if(cmd.fncName == "@highlight"){
            if(cmd.args.length == 1 && cmd.args[0] instanceof App && cmd.args[0].fncName == "@at"){
                if(this.current != undefined){

                    const trm = this.getAt(this.current, cmd.args[0]);
                    trm.colored = true;
                    const tex = this.current.tex();
                    renderKatexSub(this.texDiv, tex);
                    return;
                }
            }
        }
        else if(cmd.fncName == "@resolveAddMul"){
            const trm = this.getEqTerm(this.current, cmd.args[0]);
            // expr = SimplifyNestedAddMul.fromCommand(cmd);
        }

        throw new MyError();
    }

    drawShape(app:App){
        assert(app.isEq() && app.args.length == 2);
        if(app.args[1] instanceof RefVar){
            assert(false);
            const ref = app.args[0] as RefVar;
            assert(ref instanceof RefVar);
            const rhs = app.args[1];

            const va = getVariable(rhs.name);
            va.rename(ref.name);
        }
        else{
            const rhs = app.args[1] as App;
            assert(rhs instanceof App);
            setRefVars(rhs);

            if(app.args[0].isList()){
                const lst = app.args[0] as App;

                const va = new Variable(`dummy-${variables.length}`, rhs);
                setEntity(va, rhs);
                if(! (rhs.entity instanceof IntersectionM)){
                    throw new MyError();
                }

                assert(lst.args.length == rhs.entity.points.length)
                for(const [i, point] of rhs.entity.points.entries()){
                    const ref = lst.args[i] as RefVar;
                    assert(ref instanceof RefVar);
                    if(ref.name == "_"){
                        point.hide();
                        continue;
                    }

                    const va2 = new Variable(ref.name, Zero());
                    va2.entity = point;
                    va2.depVars.push(va);

                    point.name = ref.name;
                    point.makeCaptionDiv();
                }
            }
            else{
                assert(app.args[0] instanceof RefVar);

                const ref = app.args[0] as RefVar;

                const va = new Variable(ref.name, rhs);
                ref.refVar = va;
                setEntity(va, rhs);
                if(rhs instanceof App && rhs.entity instanceof ShapeM){
                    
                    if(rhs.entity instanceof ShapeM){
                        rhs.entity.name = ref.name;
                        rhs.entity.makeCaptionDiv();
                    }
                }
                else{
                    throw new MyError();
                }
            }
        }
    }

    *showFlow(root : App){
        this.current = root;
        root.setParent(null);
        root.setTabIdx();
    
        const node = makeFlow(root);
        const phrases : PhraseF[] = [];
        node.makeSpeech(phrases);
    
        let text = "";
        for(const phrase of phrases){
            phrase.start = text.length;
            for(const word of phrase.words){
                if(word != ""){
                    if(text != ""){
                        text += " ";
                    }
                    text += word;
                }
            }
            phrase.end = text.length;
        }
    
        let speech = new Speech(undefined);
        speech.speak(text);

        this.addTexDiv();
        for(const s of node.genTex(speech)){
            renderKatexSub(this.texDiv, s);
            yield;
        }
    
        while(speech != null && speech.speaking){
            yield;
        }
    }

    *run(){
        this.lineIdx = 0;
        while(this.lineIdx < this.lines.length){
            const line = this.lines[this.lineIdx].trim();
            if(line.length == 0){
                this.lineIdx++;
                continue
            }
            else if(line.startsWith("#")){
                yield* this.stepRanges();

                const speech_texts : string[] = [ line ];
                while(this.lineIdx < this.lines.length && this.lines[this.lineIdx].trim().startsWith("#")){
                    speech_texts.push( this.lines[this.lineIdx].trim() );
                    this.lineIdx++;
                }
                movie.speakM(speech_texts);
                while(movie.speech.speaking){
                    yield;
                }
                continue;
            }
            msg(`parse:${line}`);
            const expr = parseMath(line);
            if(expr instanceof App){
                const app = expr;
                if(isAction(app)){
                    // コマンドの場合

                    this.doAction(app);
                }
                else if(isDrawing(app)){
                    // 図形描画の場合

                    this.drawShape(app);
                }
                else if(app.fncName == "focus"){
                    assert(app.args.length == 1 && app.args[0] instanceof RefVar);
                    const ref = app.args[0] as RefVar;
                    const data = ref.getEntity() as ShapeM;
                    assert(data instanceof ShapeM);
                    data.focus(true);
                }
                else{
                    // 数式の場合

                    yield* this.showFlow(app);
                }
            }
            else{
                assert(false);
            }

            this.lineIdx++;
        }
    }
}

let movie : Movie;

function setEntity(va : Variable, trm : Term) : void {
    if(trm instanceof App){
        const app = trm;
        app.args.forEach(x => setEntity(va, x));

        if(isShapeName(app.fncName)){
            // 図形の名前の場合

            if(app.fncName == "Point"){
                assert(app.args.length == 2);
                app.entity = new PointM(app.args[0], app.args[1])
            }
            else if(app.fncName == "Thumb"){
                assert(app.args.length == 2);
                const shape = app.args[0].getEntity();
                if(shape instanceof AbstractStraightLineM){

                    app.entity = new ThumbLine(shape, app.args[1])
                }
                else{

                    throw new MyError();
                }
            }
            else if(app.fncName == "LineSegment"){
                assert(app.args.length == 2);
                app.entity = new LineSegmentM(app.args[0], app.args[1])
            }
            else if(app.fncName == "HalfLine"){
                assert(app.args.length == 2);
                app.entity = new HalfLineM(app.args[0], app.args[1])
            }
            else if(app.fncName == "Line"){
                assert(app.args.length == 2);
                app.entity = new LineM(app.args[0], app.args[1])
            }
            else if(app.fncName == "Parallel"){
                assert(app.args.length == 2);
                app.entity = new Parallel(app.args[0], app.args[1])
            }
            else if(app.fncName == "Circle"){
                assert(app.args.length == 2);
                app.entity = new CircleM(app.args[0], app.args[1])
            }
            else if(app.fncName == "Arc"){
                assert(app.args.length == 4);
                const center = app.args[0].getEntity() as PointM;
                const radius = app.args[1];
                const start  = app.args[2];
                const end    = app.args[3];
                app.entity = new ArcM(center, radius, start, end);
            }
            else if(app.fncName == "Angle"){
                assert(app.args.length == 3);
                app.entity = new AngleM(app.args)
            }
            else if(app.fncName == "Triangle"){
                assert(app.args.length == 3  && app.args.every(x => x instanceof RefVar));
                const arg_refs = app.args as RefVar[];
                app.entity = new TriangleM(arg_refs[0], arg_refs[1], arg_refs[2]);
            }
            else if(app.fncName == "Intersection"){
                assert(app.args.length == 2);
                app.entity = new IntersectionM(app.args[0], app.args[1]);
            }
            else if(app.fncName == "Foot"){
                assert(app.args.length == 2);
                app.entity = new FootOfPerpendicularM(app.args[0], app.args[1])
            }
            else{
                throw new MyError();
            }
        }
        else if(app.fncName == "range"){
            assert(app.args.length == 2);
            const rng = new Range(va, app.args[0], app.args[1]);
            app.entity = rng;
            rangeDic[app.id] = rng;
        }
        else if(app.fncName == "length"){
            assert(app.args.length == 2);
            app.entity = new Length(app.args[0], app.args[1]);
        }
    }
}

function updateShape(trm : Term) {
    if(trm instanceof App){
        const app = trm;
        trm.args.forEach(x => updateShape(x));
        if(app.entity instanceof ShapeM){
            app.entity.recalcShape();
        }
    }
}

async function startMovie(ev:MouseEvent){
    movie.speech = new Speech(movie.subtitle);
    
    await movie.getLines();
    await doGenerator(movie.run(), 1);
}

function* startPlaySub(startTime : number, lines: string[]){
    for(let line of lines){
        line = line.trim();
        if(line.length == 0){
            yield;
            continue;
        }
        msg(`[${line}]`);
        movie.speech.speak(line);
        while(movie.speech.speaking){
            yield;
        }

        const duration_sec = (new Date().getTime() - startTime) / 1000;
        msg(`${duration_sec.toFixed(1)}秒`)
    }
}

async function startPlay(ev:MouseEvent){
    const startTime = new Date().getTime();

    movie.speech = new Speech(movie.subtitle);
    setVoice("ja-JP", "Microsoft Nanami Online (Natural) - Japanese (Japan)");

    const texts = await fetchText(`../data/demo.txt`);
    const lines = texts.replaceAll('\r', "").split('\n');

    const iterator = startPlaySub(startTime, lines);
    const timer_id = setInterval(()=>{
        if(iterator.next().done){
            // ジェネレータが終了した場合
    
            clearInterval(timer_id);

            const duration_sec = (new Date().getTime() - startTime) / 1000;
            msg(`ジェネレータ 終了 ${duration_sec.toFixed(1)}秒`)
        }        
    }, 10);
}

export async function bodyOnLoadMovie(){
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const id = params.get("id");
    if(id != null){
        data_id = id;
    }

    await includeDialog();

    movie = new Movie();

    await asyncInitSpeech();

    $dlg("speech-dlg").show();

    $("start-movie").addEventListener("click", startMovie);
    $("start-play").addEventListener("click", startPlay);
    $("save-movie").addEventListener("click", movie.saveMovie.bind(movie));
}   
}