namespace casts {
//
const fgColor = "black";
const strokeWidth = 4;

const refData = new Map<string, Term | ShapeM>();

function toTerm(x : Term | ShapeM) : Term {
    assert(x instanceof Term);
    return x as Term;
}

function calc(trm : Term) : number {
    if(trm instanceof Rational){
        return trm.fval();
    }
    else if(trm instanceof ConstNum){
        return trm.value.fval();
    }
    else if(trm instanceof RefVar){
        const data = refData.get(trm.name);
        if(data == undefined){
            throw new MyError();
        }
        else if(data instanceof Term){
            return calc(data);
        }
        else{
            throw new MyError("unimplemented");
        }
    }
    else if(trm instanceof App){
        const app = trm;
        if(app.isApp("sqrt")){
            assert(app.args.length == 1);
            return Math.sqrt(calc(app.args[0]));
        }
        else{
            throw new MyError("unimplemented");
        }
    }
    throw new MyError("unimplemented");
}

class ShapeM {
    color : string = "black";    
}

class PointM extends ShapeM {
    x : Term;
    y : Term;

    point : SVGCircleElement;

    constructor(x : Term, y : Term){
        super();
        this.x = x;
        this.y = y;

        this.point = document.createElementNS("http://www.w3.org/2000/svg","circle");
        this.point.setAttribute("cx", `${calc(this.x)}`);
        this.point.setAttribute("cy", `${calc(this.y)}`);
        this.point.setAttribute("fill", this.color);        
        this.point.setAttribute("r", `${movie.toSvg2(5)}`);

        msg(`point cx:${calc(this.x)} cy:${calc(this.y)} r:${movie.toSvg2(5)}`)
        movie.svg.appendChild(this.point);
    }
}

abstract class AbstractStraightLineM extends ShapeM {
    line : SVGLineElement;

    constructor(){
        super();
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


        this.line.setAttribute("x1", `${calc(p1.x)}`);
        this.line.setAttribute("y1", `${calc(p1.y)}`);

        this.line.setAttribute("x2", `${calc(p2.x)}`);
        this.line.setAttribute("y2", `${calc(p2.y)}`);

        msg(`line:(${calc(p1.x)}, ${calc(p1.y)}) (${calc(p2.x)}, ${calc(p2.y)})`)
        movie.svg.appendChild(this.line);
    }
}

class StraightLineM extends AbstractStraightLineM {
}

class HalfLineM extends AbstractStraightLineM {
}

abstract class CircleArcM extends ShapeM {
}

class CircleM extends CircleArcM {
    center : PointM;
    radius : Term;

    circle: SVGCircleElement;

    constructor(center_ref : RefVar, radius : Term){
        super();
        this.center = refData.get(center_ref.name) as PointM;
        assert(this.center instanceof PointM);
        this.radius = radius;

        this.circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        this.circle.setAttribute("fill", "none");
        this.circle.setAttribute("stroke", this.color);
        this.circle.setAttribute("stroke-width", `${movie.toSvg2(strokeWidth)}`);
        this.circle.setAttribute("fill-opacity", "0");
        this.circle.style.cursor = "move";

        this.circle.setAttribute("cx", `${calc(this.center.x)}`);
        this.circle.setAttribute("cy", `${calc(this.center.y)}`);
        this.circle.setAttribute("r", `${calc(radius)}`);

        msg(`circle cx:${calc(this.center.x)} cy:${calc(this.center.y)} r:${calc(radius)}`)
        movie.svg.appendChild(this.circle);
    }
}

class AngleM extends ShapeM {
}

class TriangleM extends ShapeM {
    points : PointM[];
    lines  : LineSegmentM[];

    constructor(p0_ref : RefVar, p1_ref : RefVar, p2_ref : RefVar){
        super();
        const p0 = refData.get(p0_ref.name) as PointM;
        const p1 = refData.get(p1_ref.name) as PointM;
        const p2 = refData.get(p2_ref.name) as PointM;

        this.points = [ p0, p1, p2];
        assert(this.points.every(x => x instanceof PointM));

        this.lines = [ new LineSegmentM(p0, p1), new LineSegmentM(p1, p2), new LineSegmentM(p2, p0)];
    }
}

class Movie {
    width      : number = 0;
    height     : number = 0;
    svg : SVGSVGElement;
    CTMInv : DOMMatrix | null = null;
    svgRatio: number = 0;
    lines : string[] = [];
    speech! : Speech;

    constructor(width : number, height : number, x1 : number, y1 : number, x2 : number, y2 : number){
        this.width = width;
        this.height = height;

        this.svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
        this.svg.style.backgroundColor = "cornsilk";
        this.svg.style.width  = `${this.width}px`;
        this.svg.style.height = `${this.height}px`;
        this.svg.setAttribute("viewBox", `${x1} ${y1} ${x2 - x1} ${y2 - y1}`);

        document.body.appendChild(this.svg);

        this.setCTMInv();
    }

    toSvg2(x:number) : number{
        return x * this.svgRatio;
    }

    setCTMInv(){
        const CTM = this.svg.getCTM()!;
        if(CTM != null){

            this.CTMInv = CTM.inverse();
        }

        const rc = this.svg.getBoundingClientRect();
        this.svgRatio = this.svg.viewBox.baseVal.width / rc.width;

        msg(`\n${"-".repeat(10)} update Ratio ${"-".repeat(10)}\n`);
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
        const text = speech_texts.find(x => x.startsWith(`# ${this.speech.lang2}`));
        if(text == undefined){
            msg(`no translation:${speech_texts[0]}`);
            return;
        }
        this.speech.speak(text.substring(6));
        // speak(text.substring(6));
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
                    refData.set(ref.name, val);
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