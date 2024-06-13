namespace casts {

const fgColor = "black";
const focusColor = "red";
const strokeWidth = 4;
const fontSize = 10;
let rangeDic : { [id : number] : Range } = {};

function toPointM(trm : Term) : PointM{
    let pt : PointM | undefined;

    if(trm instanceof RefVar){
        pt = trm.getEntity() as PointM;
    }
    else if(trm instanceof App){
        pt = trm.entity as PointM;
    }

    if(pt instanceof PointM){
        return pt;
    }
    else{
        throw new MyError();
    }
}

class PointM extends ShapeM {
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
    }

    focus(is_focused : boolean){
        super.focus(is_focused);
        const color = is_focused ? focusColor : this.color;
        this.point.setAttribute("fill", color);
    }

    getCenterXY() : Vec2{
        return new Vec2(this.x.calc(), this.y.calc());
    }
}

abstract class AbstractStraightLineM extends ShapeM {
    p1 : PointM;
    p2 : PointM;
    line : SVGLineElement;

    constructor(p1_ref : Term, p2_ref : Term){
        super(movie);

        if(p1_ref instanceof RefVar){

        }
        this.p1 = toPointM(p1_ref);
        this.p2 = toPointM(p2_ref);

        this.line = document.createElementNS("http://www.w3.org/2000/svg","line");
        this.line.setAttribute("stroke", this.color);
        this.line.setAttribute("stroke-width", `${movie.toSvg2(strokeWidth)}`);
        movie.svg.appendChild(this.line);
    }

    getCenterXY() : Vec2{
        const points = [this.p1, this.p2];

        const xs = points.map(pt => pt.x.calc());
        const ys = points.map(pt => pt.y.calc());

        const cx = sum(xs) / xs.length;
        const cy = sum(ys) / ys.length;

        return new Vec2(cx, cy);
    }
}

class LineSegmentM extends AbstractStraightLineM {
    constructor(p1_ref : Term, p2_ref : Term){
        super(p1_ref, p2_ref);
        this.recalcShape();
    }

    recalcShape() : void {        
        this.line.setAttribute("x1", `${this.p1.x.calc()}`);
        this.line.setAttribute("y1", `${this.p1.y.calc()}`);

        this.line.setAttribute("x2", `${this.p2.x.calc()}`);
        this.line.setAttribute("y2", `${this.p2.y.calc()}`);
    }
}

class LineM extends AbstractStraightLineM {
    constructor(p1_ref : Term, p2_ref : Term){
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
    }
}

abstract class CircleArcM extends ShapeM {
    center : PointM;

    constructor(center_ref : RefVar){
        super(movie);
        this.center = center_ref.getEntity() as PointM;
        assert(this.center instanceof PointM);
    }

    getCenterXY() : Vec2{
        return new Vec2(this.center.x.calc(), this.center.y.calc());
    }
}

class CircleM extends CircleArcM {
    radius : Term;

    circle: SVGCircleElement;

    constructor(center_ref : RefVar, radius : Term){
        super(center_ref);
        this.radius = radius;

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
    }
}


class ArcM extends CircleArcM {
    radius : Term;
    start  : Term;
    end    : Term;

    arc: SVGPathElement;

    constructor(center_ref : RefVar, radius : Term, start : Term, end : Term){
        super(center_ref);
        this.center = center_ref.getEntity() as PointM;
        assert(this.center instanceof PointM);
        this.radius = radius;
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
        const start_th = this.start.calc();
        const end_th = this.end.calc();
        const x1 = cx + r * Math.cos(start_th);
        const y1 = cy + r * Math.sin(start_th);
        const x2 = cx + r * Math.cos(end_th);
        const y2 = cy + r * Math.sin(end_th);

        const d = `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
        this.arc.setAttribute("d", d);

        msg(`arc cx:${cx} cy:${cy} r:${r}`)
    }
}

class AngleM extends ShapeM {
    recalcShape() : void {        
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

    constructor(root_left_var: Variable, start : Term, end : Term, interval : number = 1){
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

class Movie extends ViewM {
    lines : string[] = [];
    lineIdx : number = 0;
    speech! : Speech;
    marks : Mark[] = [];

    constructor(width : number, height : number, x1 : number, y1 : number, x2 : number, y2 : number){
        super(width, height, x1, y1, x2, y2);
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
        const texts = await fetchText(`../data/script/1.py`);
        this.lines = texts.replaceAll('\r', "").split('\n');
        
        const head = this.lines.shift();
        assert(head!.startsWith("from"));
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
                yield;
                continue;
            }
            msg(`parse:${line}`);
            const expr = parseMath(line);
            if(expr instanceof App){
                const app = expr;
                if(app.isEq()){
    
                    assert(app.args.length == 2 && app.args[0] instanceof RefVar);
                    const ref = app.args[0] as RefVar;
                    const rhs = app.args[1] as App;
                    assert(rhs instanceof App);
                    const va = new Variable(ref.name, rhs);
                    variables.push(va);
                    ref.refVar = va;
                    setRefVars(app);
                    setEntity(va, rhs);
                    if(rhs instanceof App && rhs.entity instanceof ShapeM){

                        setDepends(ref, app.args[1]);
                        if(ref.depends.length != 0){
                            msg(`${ref.name} depends ${ref.depends.join(" ")}`);
                        }
                        
                        if(rhs.entity instanceof ShapeM){
                            rhs.entity.name = ref.name;
                            rhs.entity.makeCaptionDiv();
                        }
                    }
                    else{
                        throw new MyError();
                    }
                }
                else if(app.fncName == "focus"){
                    assert(app.args.length == 1 && app.args[0] instanceof RefVar);
                    const ref = app.args[0] as RefVar;
                    const data = ref.getEntity() as ShapeM;
                    assert(data instanceof ShapeM);
                    data.focus(true);
                }
                else{
                    assert(false);
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

function setDepends(ref : RefVar, expr : Term){
    const refs = allTerms(expr).filter(x => x instanceof RefVar && !(x.parent instanceof App && x.parent.fnc == x) && !ref.depends.includes(x.name)) as RefVar[];
    const ref_names = refs.map(x => x.name);

    ref.depends = ref.depends.concat(ref_names);
}

function setEntity(va : Variable, trm : Term) : void {
    if(trm instanceof App){
        const app = trm;
        app.args.forEach(x => setEntity(va, x));

        if(isShapeName(app.fncName)){

            if(app.fncName == "Point"){
                assert(app.args.length == 2);
                app.entity = new PointM(app.args[0], app.args[1])
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
            else if(app.fncName == "Circle"){
                assert(app.args.length == 2 && app.args[0] instanceof RefVar);
                app.entity = new CircleM(app.args[0] as RefVar, app.args[1])
            }
            else if(app.fncName == "Arc"){
                assert(app.args.length == 4 && app.args[0] instanceof RefVar);
                const center = app.args[0] as RefVar;
                const radius = app.args[1];
                const start  = app.args[2];
                const end    = app.args[3];
                app.entity = new ArcM(center, radius, start, end);
            }
            else if(app.fncName == "Triangle"){
                assert(app.args.length == 3  && app.args.every(x => x instanceof RefVar));
                const arg_refs = app.args as RefVar[];
                app.entity = new TriangleM(arg_refs[0], arg_refs[1], arg_refs[2]);
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
    movie.speech = new Speech();
    
    await movie.getLines();
    await doGenerator(movie.run(), 1);
}

export async function bodyOnLoadMovie(){
    await includeDialog();

    movie = new Movie(480, 480, -5, -5, 5, 5);

    await asyncInitSpeech();

    $dlg("speech-dlg").show();

    $("start-movie").addEventListener("click", startMovie);
}   
}