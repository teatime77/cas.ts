namespace casts {
//
const fgColor = "black";
const focusColor = "red";
const strokeWidth = 4;
const fontSize = 10;

function toTerm(x : Term | ShapeM) : Term {
    assert(x instanceof Term);
    return x as Term;
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
        this.point.setAttribute("cx", `${this.x.calc()}`);
        this.point.setAttribute("cy", `${this.y.calc()}`);
        this.point.setAttribute("fill", this.color);        
        this.point.setAttribute("r", `${movie.toSvg2(5)}`);

        msg(`point cx:${this.x.calc()} cy:${this.y.calc()} r:${movie.toSvg2(5)}`)
        movie.svg.appendChild(this.point);
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
    line : SVGLineElement;

    constructor(){
        super(movie);
        this.line = document.createElementNS("http://www.w3.org/2000/svg","line");
        this.line.setAttribute("stroke", this.color);
        this.line.setAttribute("stroke-width", `${movie.toSvg2(strokeWidth)}`);
    }
}

class LineSegmentM extends AbstractStraightLineM {
    p1 : PointM;
    p2 : PointM;

    constructor(p1 : PointM, p2 : PointM){
        super();
        this.p1 = p1;
        this.p2 = p2;


        this.line.setAttribute("x1", `${p1.x.calc()}`);
        this.line.setAttribute("y1", `${p1.y.calc()}`);

        this.line.setAttribute("x2", `${p2.x.calc()}`);
        this.line.setAttribute("y2", `${p2.y.calc()}`);

        msg(`line:(${p1.x.calc()}, ${p1.y.calc()}) (${p2.x.calc()}, ${p2.y.calc()})`)
        movie.svg.appendChild(this.line);
    }
}

class StraightLineM extends AbstractStraightLineM {
}

class HalfLineM extends AbstractStraightLineM {
}

abstract class CircleArcM extends ShapeM {
    center : PointM;

    constructor(center_ref : RefVar){
        super(movie);
        this.center = refData[center_ref.name] as PointM;
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

        this.circle.setAttribute("cx", `${this.center.x.calc()}`);
        this.circle.setAttribute("cy", `${this.center.y.calc()}`);
        this.circle.setAttribute("r", `${radius.calc()}`);

        msg(`circle cx:${this.center.x.calc()} cy:${this.center.y.calc()} r:${radius.calc()}`)
        movie.svg.appendChild(this.circle);
    }
}


class ArcM extends CircleArcM {
    radius : Term;
    start  : Term;
    end    : Term;

    arc: SVGPathElement;

    constructor(center_ref : RefVar, radius : Term, start : Term, end : Term){
        super(center_ref);
        this.center = refData[center_ref.name] as PointM;
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

        const cx = this.center.x.calc();
        const cy = this.center.y.calc();
        const r  = radius.calc();
        const start_th = start.calc();
        const end_th = end.calc();
        const x1 = cx + r * Math.cos(start_th);
        const y1 = cy + r * Math.sin(start_th);
        const x2 = cx + r * Math.cos(end_th);
        const y2 = cy + r * Math.sin(end_th);

        const d = `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
        this.arc.setAttribute("d", d);

        msg(`arc cx:${cx} cy:${cy} r:${r}`)
        movie.svg.appendChild(this.arc);
    }
}

class AngleM extends ShapeM {
}

class TriangleM extends ShapeM {
    points : PointM[];
    lines  : LineSegmentM[];

    constructor(p0_ref : RefVar, p1_ref : RefVar, p2_ref : RefVar){
        super(movie);
        const p0 = refData[p0_ref.name] as PointM;
        const p1 = refData[p1_ref.name] as PointM;
        const p2 = refData[p2_ref.name] as PointM;

        this.points = [ p0, p1, p2];
        assert(this.points.every(x => x instanceof PointM));

        this.lines = [ new LineSegmentM(p0, p1), new LineSegmentM(p1, p2), new LineSegmentM(p2, p0)];
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

class Movie extends ViewM {
    lines : string[] = [];
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
                const shape = refData[name] as ShapeM;
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

    async run(){
        this.speech = new Speech();
    
        await this.getLines();

        while(this.lines.length != 0){
            const line = this.lines.shift()!.trim();
            if(line.length == 0){
                continue
            }
            else if(line.startsWith("#")){
                const speech_texts : string[] = [ line ];
                while(this.lines.length != 0 && this.lines[0].trim().startsWith("#")){
                    speech_texts.push( this.lines.shift()!.trim() );
                }
                movie.speakM(speech_texts);
                continue;
            }
            msg(`parse:${line}`);
            const expr = parseMath(line);
            if(expr instanceof App){
                const app = expr;
                if(app.isEq()){
    
                    assert(app.args.length == 2 && app.args[0] instanceof RefVar);
                    const ref = app.args[0] as RefVar;
                    const val = exec(app.args[1]);
                    refData[ref.name] = val;
                    if(val instanceof ShapeM){
                        val.name = ref.name;
                        val.makeCaptionDiv();
                    }
                }
                else if(app.fncName == "focus"){
                    assert(app.args.length == 1 && app.args[0] instanceof RefVar);
                    const ref = app.args[0] as RefVar;
                    const data = refData[ref.name] as ShapeM;
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
        }
    }
}

let movie : Movie;

function exec(trm : Term) : Term | ShapeM {
    if(trm instanceof App){
        const app = trm;
        const args = app.args.map(x => exec(x));

        if(app.fncName == "Point"){
            assert(args.length == 2);
            return new PointM(toTerm(args[0]), toTerm(args[1]))
        }
        else if(app.fncName == "Circle"){
            assert(args.length == 2 && args[0] instanceof RefVar);
            return new CircleM(args[0] as RefVar, toTerm(args[1]))
        }
        else if(app.fncName == "Arc"){
            assert(args.length == 4 && args[0] instanceof RefVar);
            const center = toTerm(args[0]) as RefVar;
            const radius = toTerm(args[1]);
            const start  = toTerm(args[2]);
            const end    = toTerm(args[3]);
            return new ArcM(center, radius, start, end);
        }
        else if(app.fncName == "Triangle"){
            assert(args.length == 3  && args.every(x => x instanceof RefVar));
            const arg_refs = args.map(x => x as RefVar);
            return new TriangleM(arg_refs[0], arg_refs[1], arg_refs[2]);
        }
        else if(app.fncName == "sqrt"){
            return app;
        }
        else{
            throw new MyError();
        }
    }
    else if(trm instanceof ConstNum || trm instanceof RefVar){
        return trm;
    }
    else{
        throw new MyError();
    }
}

async function startMovie(ev:MouseEvent){
    await movie.run();
}

export async function bodyOnLoadMovie(){
    await includeDialog();

    movie = new Movie(480, 480, -5, -5, 5, 5);

    await asyncInitSpeech();

    $dlg("speech-dlg").show();

    $("start-movie").addEventListener("click", startMovie);
}   
}