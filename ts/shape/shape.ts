namespace casts{

const infinity = 20;
const strokeWidth = 4;
const thisStrokeWidth = 2;
const angleStrokeWidth = 2;
const angleRadius = 40;
const rightAngleLength = 20;
const gridLineWidth = 1;
const bgColor = "white";
const fgColor = "black";
const selColor = "orange";

declare let MathJax:any;

export let focusedActionIdx : number;

export let textMath : HTMLTextAreaElement;

const defaultUid = "Rb6xnDguG5Z9Jij6XLIPHV4oNge2";
let loginUid : string | null = null;
let guestUid = defaultUid;
let firebase: any;

export let actions : Action[];


class Glb {
    toolType : string = "";
    eventPos! : Vec2;
    view: View | null = null;
    views : View[] = [];
    refMap = new Map<number, Widget>();
    timeline : HTMLInputElement | null = null;
    selSummary : HTMLSelectElement;
    board : HTMLDivElement;
    dicName = new Map<string, Shape>();

    constructor(){
        this.selSummary = $("sel-summary") as HTMLSelectElement;
        this.board      = $div("board");
    }
}


function v2app(v : Vec2) : App {
    return new App(operator("vec"), [new ConstNum(v.x), new ConstNum(v.y)]);
}

export class Action {
    command : App;

    constructor(command : App){
        this.command = command;
    }
}

export class WidgetAction extends Action {
    constructor(command : App){
        super(command);
    }
}


let glb : Glb;


export function addAction(act : Action){
    actions.push(act);
}

/**
 * Viewのイベント処理
 */
export function setViewEventListener(view: View){
    view.svg.addEventListener("click", view.svgClick);
//+    view.svg.addEventListener("pointerdown", view.svgPointerDown);  
//+    view.svg.addEventListener("pointerup"  , view.svgPointerUp);  
    view.svg.addEventListener("pointermove", view.svgPointerMove);  
//+    view.svg.addEventListener("wheel"      , view.svgWheel);
}


/**
 * tool-typeのクリック
 */
function setToolTypeEventListener(){
    const toolTypes = document.getElementsByName("tool-type");
    for(let x of toolTypes){
        x.addEventListener("click", setToolType);
    }
}

/**
 * ShapeのNameのイベント処理
 */
export function setNameEventListener(shape: Shape){
    shape.svgName!.addEventListener("pointerdown", shape.namePointerdown);
    shape.svgName!.addEventListener("pointermove", shape.namePointermove);
    shape.svgName!.addEventListener("pointerup"  , shape.namePointerup);
}


/**
 * Pointのイベント処理
 */
export function setPointEventListener(point: Point){
    point.circle.addEventListener("pointerdown", point.pointerdown);
    point.circle.addEventListener("pointermove", point.pointermove);
    point.circle.addEventListener("pointerup"  , point.pointerup);
}

export function initShape(){
    glb = new Glb();

    setToolTypeEventListener();

    glb.view = new View().make({ Width: 640, Height: 640, ViewBox: "-5 -5 10 10" });

    glb.view.widgets.push(glb.view);
}

function getTimelinePos(){
    if(glb.timeline != null){
        return glb.timeline.valueAsNumber;
    }
    else if(glb.selSummary != null){
        return glb.selSummary.selectedIndex - 1;
    }
    else{
        console.assert(false);
        return 0;
    }
}

export function parseObject(obj: any) : any {
    if(obj == undefined || obj == null || typeof obj != "object"){
        return obj;
    }

    if(Array.isArray(obj)){
        let v = obj.map(x => parseObject(x));
        return v;
    }

    if(obj.ref != undefined){
        let id = parseInt(obj.ref);
        let o = glb.refMap.get(id);
        console.assert(o != undefined);
        return o;
    }

    if(obj.typeName == Vec2.name){
        return new Vec2(obj.x, obj.y);
    }

    switch(obj.typeName){
    case View.name:
        return new View().make(obj);
    
    case Point.name:
        return new Point(obj);

    case LineSegment.name:
        return new LineSegment().make(obj);

    case StraightLine.name:
        return new StraightLine().make(obj);

    case HalfLine.name:
        return new HalfLine().make(obj);
        
    case Rect.name:
        return new Rect().make(obj);

    case Circle.name:
        return new Circle(obj.byDiameter).make(obj);

    case DimensionLine.name:
        return new DimensionLine().make(obj);

    case Triangle.name:
        return new Triangle().make(obj);

    case Midpoint.name:
        return new Midpoint().make(obj);

    case Perpendicular.name:
        return new Perpendicular().make(obj);

    case ParallelLine.name:
        return new ParallelLine().make(obj);

    case Intersection.name:
        return new Intersection().make(obj);

    case Arc.name:
        return new Arc().make(obj);

    case Angle.name:
        return new Angle().make(obj);

    case Image.name:
        return new Image(obj);

/*        
    case TextBlock.name:
        return new TextBlock("").make(obj);

    case Speech.name:
        return new Speech("").make(obj);
    
    case Simulation.name:
        return new Simulation().make(obj);

    case ViewPoint.name:
        return new ViewPoint().make(obj);
    
    case PackageInfo.name:
        return obj;

    case Variable.name:
        return new Variable(obj);
    
    case WidgetSelection.name:
    case "ShapeSelection":
            return new WidgetSelection().make(obj);

    case TextSelection.name:
        return new TextSelection().make(obj);

    case FuncLine.name:
        return new FuncLine().make(obj);

        case Surface.name:
            return new Surface().make(obj);
*/
    default:
        console.assert(false);
        return null as any as Widget;
    }
}

function getImgRef(fileName: string, mode:string){
    // Create a root reference
    const storageRef = firebase.storage().ref();

    let uid: string;
    switch(mode){
    case "r": uid = guestUid; break;
    case "w":
        if(loginUid == null){

            console.assert(false);
        }
        else{

            uid = loginUid; 
            break;
        }
        default: console.assert(false); return;
    }

    return storageRef.child(`/users/${uid}/img/${fileName}`);
}

export function setSvgImg(img: SVGImageElement, fileName: string){
    const imgRef = getImgRef(fileName, "r");

    imgRef.getDownloadURL().then(function(downloadURL: string) {
        msg(`download URL: [${downloadURL}]`);
        
        img.setAttributeNS('http://www.w3.org/1999/xlink','href',downloadURL);
    });
}

function linesIntersection(l1:LineSegment, l2:LineSegment) : Vec2 {
    l1.setVecs();
    l2.setVecs();

    /*
    l1.p1 + u l1.p12 = l2.p1 + v l2.p12

    l1.p1.x + u l1.p12.x = l2.p1.x + v l2.p12.x
    l1.p1.y + u l1.p12.y = l2.p1.y + v l2.p12.y

    l1.p12.x, - l2.p12.x   u = l2.p1.x - l1.p1.x
    l1.p12.y, - l2.p12.y   v = l2.p1.y - l1.p1.y
    
    */
    const m = new Mat2([[l1.p12.x, - l2.p12.x], [l1.p12.y, - l2.p12.y]]);
    const v = new Vec2(l2.p1.x - l1.p1.x, l2.p1.y - l1.p1.y);
    const mi = m.inv();
    const uv = mi.dot(v);
    const u = uv.x;

    return l1.p1.add(l1.p12.mul(u));
}

function lineArcIntersection(line:LineSegment, arc:CircleArc) : Vec2[] {
    // 円/弧の中心
    const center = arc.getCenter();

    // 円/弧の中心から線分に垂線をおろして、その足をfootとする。
    const foot = calcFootOfPerpendicular(center, line);

    // 円/弧の中心から垂線の足までの距離。
    const h = foot.sub(center).len();

    // 円/弧の半径
    let r = arc.getRadius();

    if(r < h ){
        // 半径が垂線の足までの距離より小さい場合

        return [];
    }

    // 垂線の足から交点までの距離
    let t = Math.sqrt(r*r - h * h);

    // 線分の単位方向ベクトル
    let e = line.e;
    
    // 交点の座標
    let p1 = foot.add(e.mul(t));
    let p2 = foot.add(e.mul(-t));

    return [p1, p2];
}

function ArcArcIntersection(arc1:CircleArc, arc2:CircleArc) : Vec2[] {
    // 円/弧の中心
    const c1 = arc1.getCenter();
    const c2 = arc2.getCenter();

    // 円/弧の半径
    const r1 = arc1.getRadius();
    const r2 = arc2.getRadius();

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

function calcFootOfPerpendicular(pos:Vec2, line: LineSegment) : Vec2 {
    const p1 = line.handles[0].pos;
    const p2 = line.handles[1].pos;

    const e = p2.sub(p1).unit();
    const v = pos.sub(p1);
    const h = e.dot(v);

    const foot = p1.add(e.mul(h));

    return foot;
}


export function setToolType(){
    glb.toolType = (document.querySelector('input[name="tool-type"]:checked') as HTMLInputElement).value;
}

function makeToolByType(toolType: string): Shape|undefined {
    const v = toolType.split('.');
    const typeName = v[0];
    const arg = v.length == 2 ? v[1] : null;

    switch(typeName){
        case "Distance":      return new Distance();
        case "Point":         return new Point({pos:new Vec2(0,0)});
        case "LineSegment":   return new LineSegment();
        case "StraightLine":  return new StraightLine();
        case "HalfLine":      return new HalfLine();
        case "BSpline":       return new BSpline();
        case "Rect":          return new Rect().make({isSquare:(arg == "2")}) as Shape;
        case "Circle":        return new Circle(arg == "2");
        case "Arc":           return new Arc();
        case "DimensionLine": return new DimensionLine();
        case "Triangle":      return new Triangle();
        case "Midpoint":      return new Midpoint();
        case "Perpendicular": return new Perpendicular()
        case "ParallelLine":  return new ParallelLine()
        case "Intersection":  return new Intersection();
        case "Angle":         return new Angle();
        case "Image":         return new Image({fileName:"./img/teatime77.png"});
        case "FuncLine":      return new FuncLine();
    }
    assert(false);
}


export class ShapeEvent{
    destination: Shape;
    sources: Shape[];

    constructor(destination: Shape, sources: Shape[]){
        this.destination = destination;
        this.sources = sources;
    }
}

export class EventQueue {
    events : ShapeEvent[] = [];

    addEvent(destination:Shape, source: Shape){
        // 送付先が同じイベントを探す。
        const event = this.events.find(x=>x.destination == destination);

        if(event == undefined){
            // 送付先が同じイベントがない場合

            // イベントを追加する。
            this.events.push( new ShapeEvent(destination, [source]) );
        }
        else{
            // 送付先が同じイベントがある場合

            if(!event.sources.includes(source)){
                // 送付元に含まれない場合

                // 送付元に追加する。
                event.sources.push(source);
            }
        }
    }

    addEventMakeEventGraph(destination:Shape, source: Shape){
        this.addEvent(destination, source);
        destination.makeEventGraph(source);
    }

    processQueue =()=>{
        const processed : Shape[] = [];

        while(this.events.length != 0){
            // 先頭のイベントを取り出す。
            let event = this.events[0];

            if(! processed.includes(event.destination)){
                // 処理済みでない場合

                processed.push(event.destination);

                // イベント処理をする。
                event.destination.processEvent(event.sources);
            }

            // 先頭のイベントを除去する。
            this.events.shift();
        }
    }
}

export abstract class Widget{
    static count: number = 0;
    id: number;
    typeName: string;

    constructor(){
        this.id = Widget.count++;
        this.typeName = this.getTypeName();
    }

    abstract makeAction() : WidgetAction;

    make(obj: any) : Widget {
        if(obj.id != undefined){
            let id = parseInt(obj.id);
            glb.refMap.set(id, this);
        }
        for(let [k, v] of Object.entries(obj)){
            if(k == "listeners" || k == "bindTo"){
                (this as any)[k] = v;
            }
            else{

                (this as any)[k] = parseObject(v);
            }
        }

        return this;
    }

    all(v: Widget[]){
        if(! v.includes(this)){
            v.push(this);
        }
    }

    propertyNames() : string[] {
        return [];
    }

    getValue(name: string){
        let value;

        let getter = (this as any)["get" + name] as Function;
        if(getter == undefined){
            value = (this as any)[name];
        }
        else{
            console.assert(getter.length == 0);
            value = getter.apply(this);
        }
        console.assert(value != undefined);

        return value;
    }

    getTypeName(){
        return this.constructor.name;
    }

    enable(){
        this.setEnable(true);
    }

    disable(){
        this.setEnable(false);
    }

    delete(){        
    }

    setEnable(enable: boolean){        
    }

    summary() : string {
        return this.getTypeName();
    }

    makeObj() : any{
        return {
            id: this.id,
            typeName: this.typeName
        };
    }
}

export class View extends Widget {
    div : HTMLDivElement;
    canvas: HTMLCanvasElement;
    svg : SVGSVGElement;
    div2 : HTMLDivElement;
    defs : SVGDefsElement;
    gridBg : SVGRectElement;
    G0 : SVGGElement;
    G1 : SVGGElement;
    G2 : SVGGElement;
    CTMInv : DOMMatrix | null = null;
    svgRatio: number = 0;
    shapes: Shape[]= [];
    tool : Shape | null = null;
    eventQueue : EventQueue = new EventQueue();
    capture: Shape|null = null;
    AutoHeight: boolean = false;
    ShowGrid : boolean = false;
    GridWidth : number = 1;
    GridHeight : number = 1;
    SnapToGrid: boolean = false;

    Width      : number = 0;
    Height     : number = 0;
    ViewBox    : string = "";
    ShowXAxis  : boolean = false;
    ShowYAxis  : boolean = false;
    BackgroundColor : string = "";

    xyAxis : (LineSegment|null)[] = [ null, null];
    widgets : Widget[] = [];

    constructor(){
        super();

        glb.views.push(this);

        this.div = document.createElement("div");

        this.div.style.position = "relative";
        this.div.style.padding = "0px";
        this.div.style.zIndex = "1";
        this.div.style.cssFloat = "right";
        this.div.style.backgroundColor = bgColor;

        this.canvas = document.createElement("canvas");
        this.canvas.style.position = "absolute";
        this.canvas.style.left = "0px";
        this.canvas.style.top = "0px";
        this.canvas.style.zIndex = "2";
        this.canvas.width  = 1024;
        this.canvas.height = 1024;

        this.div.appendChild(this.canvas);

        this.svg = document.createElementNS("http://www.w3.org/2000/svg","svg") as SVGSVGElement;

        this.svg.style.position = "absolute";
        this.svg.style.left = "0px";
        this.svg.style.top = "0px";

        this.svg.style.zIndex = "3";
        this.svg.style.margin = "0px";

        this.svg.setAttribute("preserveAspectRatio", "none");
        this.svg.setAttribute("transform", "scale(1, -1)");
        //---------- 
        glb.board.appendChild(this.div);
        this.div.appendChild(this.svg);

        this.div2 = document.createElement("div");
        this.div2.style.position = "absolute";
        this.div2.style.left = "0px";
        this.div2.style.top = "0px";
        this.div2.style.pointerEvents = "none";

        this.div.appendChild(this.div2);

        this.defs = document.createElementNS("http://www.w3.org/2000/svg","defs") as SVGDefsElement;
        this.svg.appendChild(this.defs);

        // グリッドの背景の矩形
        this.gridBg = document.createElementNS("http://www.w3.org/2000/svg","rect");
        this.svg.appendChild(this.gridBg);

        this.G0 = document.createElementNS("http://www.w3.org/2000/svg","g");
        this.G1 = document.createElementNS("http://www.w3.org/2000/svg","g");
        this.G2 = document.createElementNS("http://www.w3.org/2000/svg","g");
    
        this.svg.appendChild(this.G0);
        this.svg.appendChild(this.G1);
        this.svg.appendChild(this.G2);
    }

    makeAction() : WidgetAction{
        const app = new App(actionRef("@make_view"), [])
        return new WidgetAction(app);
    }

    make(obj: any) : View {
        console.assert(obj.Width != undefined && obj.Height != undefined && obj.ViewBox != undefined);
        super.make(obj);
        if(this.AutoHeight){
            this.calcHeight();
        }

        this.updateBackgroundColor();
        this.updateWidth();
        this.updateHeight();

        this.updateViewBox();
        this.setShowXAxis(this.ShowXAxis);
        this.setShowYAxis(this.ShowYAxis);

        this.xyAxis.forEach(x => { if(x != null){ x.updateRatio(); }});
    
        setViewEventListener(this);

        return this;
    }

    all(v: Widget[]){
        super.all(v);
        this.xyAxis.filter(x => x != null).forEach(x => x!.all(v));
    }

    propertyNames() : string[] {
        return [ "Width", "Height", "AutoHeight", "ViewBox", "ShowGrid", "GridWidth", "GridHeight", "SnapToGrid", "ShowXAxis", "ShowYAxis", "BackgroundColor" ];
    }

    makeObj() : any {
        let obj = Object.assign(super.makeObj(), {
            "Width"     : this.Width,
            "Height"    : this.Height,
            "AutoHeight": this.AutoHeight,
            "ViewBox"   : this.svg.getAttribute("viewBox"),
            "ShowXAxis" : this.ShowXAxis,
            "ShowYAxis" : this.ShowYAxis,
            "xyAxis"    : this.xyAxis.map(x => (x == null ? null : x.makeObj()))
        });

        if(this.BackgroundColor != ""){
            obj.BackgroundColor = this.BackgroundColor;
        }

        return obj;
    }

    summary() : string {
        return "view";
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        this.div.style.visibility = (enable ? "visible" : "hidden");
    }

    setCTMInv(){
        const CTM = this.svg.getCTM()!;
        if(CTM != null){

            this.CTMInv = CTM.inverse();
        }

        const rc = this.svg.getBoundingClientRect() as DOMRect;
        this.svgRatio = this.svg.viewBox.baseVal.width / rc.width;

        msg(`\n${"-".repeat(10)} update Ratio ${"-".repeat(10)}\n`);
        this.allShapes().forEach(x => x.updateRatio());
    }

    calcHeight(){
        let [x1, y1, w, h] = this.parseViewBox()
        this.Height = this.Width * h / w;
    }

    updateWidth(){
        this.div.style.width  = `${this.Width}px`;
        this.canvas.style.width  = `${this.Width}px`;
        this.svg.style.width  = `${this.Width}px`;
        this.div2.style.width = `${this.Width}px`;
    }

    setWidth(value: number){
        this.Width = value;
        this.updateWidth();

        if(this.AutoHeight){
            this.calcHeight();
            this.updateHeight();
        }

        this.setCTMInv();
    }

    setAutoHeight(value: boolean){
        if(this.AutoHeight == value){
            return;
        }

        this.AutoHeight = value;
        if(this.AutoHeight){
            this.calcHeight();
            this.updateHeight();
            this.setCTMInv();
        }
    }

    setHeight(value: number){
        this.Height = value;
        this.updateHeight();
        this.setCTMInv();
    }

    updateHeight(){
        this.div.style.height  = `${this.Height}px`;
        this.canvas.style.height  = `${this.Height}px`;        
        this.svg.style.height  = `${this.Height}px`;
        this.div2.style.height = `${this.Height}px`;
    }

    setBackgroundColor(value: string){
        this.BackgroundColor = value.trim();
        this.updateBackgroundColor();
    }

    updateBackgroundColor(){
        this.div2.style.backgroundColor = (this.BackgroundColor != "" ? this.BackgroundColor : "transparent");
    }

    parseViewBox(){
        const v = this.ViewBox.split(' ').map(x => x.trim());
        console.assert(v.length == 4);

        const x1 = parseFloat(v[0]);
        const y1 = parseFloat(v[1]);
        const w  = parseFloat(v[2]);
        const h  = parseFloat(v[3]);

        return [x1, y1, w, h];
    }

    getViewBox() : string{
        let [x1, y1, w, h] = this.parseViewBox()

        return `${x1}, ${y1}, ${x1 + w}, ${y1 + h}`;
    }

    setViewBox(value: string){
        const v = value.split(',').map(x => x.trim());
        console.assert(v.length == 4);
        const x1 = parseFloat(v[0]);
        const y1 = parseFloat(v[1]);
        const x2 = parseFloat(v[2]);
        const y2 = parseFloat(v[3]);

        this.ViewBox = `${x1} ${y1} ${x2 - x1} ${y2 - y1}`;

        this.updateViewBox();
    }

    updateViewBox(){
        if(this.AutoHeight){
            this.calcHeight();
            this.updateHeight();
        }

        this.svg.setAttribute("viewBox", this.ViewBox);

        this.setCTMInv();

        this.setGridPattern();
        if(! this.ShowGrid){
            this.gridBg.setAttribute("fill", "transparent");
        }
    }

    setShowGrid(value: boolean){
        if(this.ShowGrid == value){
            return;
        }

        this.ShowGrid = value;

        if(this.ShowGrid){
            this.setGridPattern();
        }
        else{

            this.gridBg.setAttribute("fill", "transparent");
        }
    }

    setGridWidth(value: any){
        this.GridWidth = parseFloat(value);

        this.setGridPattern();
    }

    setGridHeight(value: any){
        this.GridHeight = parseFloat(value);

        this.setGridPattern();
    }

    setSnapToGrid(value: boolean){
        this.SnapToGrid = value;
    }

    setShowXAxis(value: boolean){
        this.ShowXAxis = value;
        this.setShowXYAxis(value, 0);
    }

    setShowYAxis(value: boolean){
        this.ShowYAxis = value;
        this.setShowXYAxis(value, 1);
    }

    setShowXYAxis(show_axis: boolean, idx: number){
        const big_value = Math.max(this.svg.viewBox.baseVal.width, this.svg.viewBox.baseVal.height) * 10000;

        if(show_axis){
            // 軸を表示する場合

            if(this.xyAxis[idx] == null){
                // 軸の線分がない場合

                if(idx == 0){
                    // X軸の場合

                    this.xyAxis[idx] = new LineSegment().makeByPos(-big_value, 0, big_value, 0);
                }
                else{
                    // Y軸の場合

                    this.xyAxis[idx] = new LineSegment().makeByPos(0, -big_value, 0, big_value);
                }

                this.xyAxis[idx]!.setColor(fgColor)
            }
            else{
                // 軸の線分がある場合

                this.xyAxis[idx]!.setColor(fgColor)
            }    

            this.xyAxis[idx]!.line.setAttribute("visibility", "visible");
        }
        else{
            // 軸を表示しない場合

            if(this.xyAxis[idx] != null){
                // 軸の線分がある場合

                this.xyAxis[idx]!.line.setAttribute("visibility", "hidden");
            }
        }
    }

    makeLine(x1: number, y1: number, x2: number, y2: number){
        const line = document.createElementNS("http://www.w3.org/2000/svg","line");
        line.setAttribute("stroke", fgColor);
        line.setAttribute("stroke-width", `${this.toSvg2(strokeWidth)}`);
        line.setAttribute("x1", `${x1}`);
        line.setAttribute("y1", `${y1}`);
        line.setAttribute("x2", `${x2}`);
        line.setAttribute("y2", `${y2}`);

        this.G1.insertBefore(line, this.G1.firstElementChild);

        return line;
    }

    setGridPattern(){
        // 現在のパターンを削除する。
        while(this.defs.childNodes.length != 0){
            if(this.defs.firstChild == null){

                console.assert(false);
            }
            else{

                this.defs.removeChild(this.defs.firstChild);
            }
        }

        // viewBoxを得る。
        const vb = this.svg.viewBox.baseVal;

        const patternId = `pattern-${this.id}`;

        const pattern = document.createElementNS("http://www.w3.org/2000/svg","pattern") as SVGPatternElement;
        pattern.setAttribute("id", patternId);
        pattern.setAttribute("patternUnits", "userSpaceOnUse");
        pattern.setAttribute("x", `${vb.x}`);
        pattern.setAttribute("y", `${vb.y}`);
        pattern.setAttribute("width", `${this.GridWidth}`);
        pattern.setAttribute("height", `${this.GridHeight}`);
    
        this.defs.appendChild(pattern);

        const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
        rect.setAttribute("x", "0");
        rect.setAttribute("y", "0");
        rect.setAttribute("width", `${this.GridWidth}`);
        rect.setAttribute("height", `${this.GridHeight}`);
        rect.setAttribute("fill", "transparent");
        rect.setAttribute("stroke", fgColor);
        rect.setAttribute("stroke-width", `${this.toSvg2(gridLineWidth)}`);
    
        pattern.appendChild(rect);

        // グリッドの背景の矩形をviewBoxに合わせる。
        this.gridBg.setAttribute("x", `${vb.x}`);
        this.gridBg.setAttribute("y", `${vb.y}`);
        this.gridBg.setAttribute("width", `${vb.width}`);
        this.gridBg.setAttribute("height", `${vb.height}`);
    
        this.gridBg.setAttribute("fill", `url(#${patternId})`);
    }

    DomToSvgPos(ev : MouseEvent) : Vec2 {
        var pt = this.svg.createSVGPoint();

        pt.x = ev.clientX; 
        pt.y = ev.clientY;

        const mat = this.svg.getScreenCTM()!.inverse();
        const loc : DOMPoint = pt.matrixTransform(mat);
        msg(`loc:${loc.x} ${loc.y}`);

        return new Vec2(loc.x, loc.y);
    }

    getSvgPoint(ev: MouseEvent | PointerEvent, draggedPoint: Point|null){

        const p = this.DomToSvgPos(ev);
    
        if(this.SnapToGrid){
    
            const ele = document.elementFromPoint(ev.clientX, ev.clientY);
            if(ele == this.svg || ele == this.gridBg || (draggedPoint != null && ele == draggedPoint.circle)){
                p.x = Math.round(p.x / this.GridWidth ) * this.GridWidth;
                p.y = Math.round(p.y / this.GridHeight) * this.GridHeight;
            }
        }
    
        return new Vec2(p.x, p.y);
    }
    
    svgClick = (ev: MouseEvent)=>{
        const pt1 = this.getSvgPoint(ev, null);
        if(this.capture != null){
            return;
        }
    
        if(ev.ctrlKey || glb.toolType == "select"){
    
            // for(let ele = ev.srcElement; obj; obj = ob)
            let clicked_shape : Shape|null = null;
            for(let shape of this.shapes.values()){
                if(Object.values(shape).includes(ev.srcElement)){
                    clicked_shape = shape;
                    break;
                }
                if(shape instanceof Angle && shape.svgElements().includes(ev.srcElement as any)){
                    clicked_shape = shape;
                    break;
                }
            }
    
            if(ev.ctrlKey){
                if(clicked_shape instanceof Point || clicked_shape instanceof LineSegment || clicked_shape instanceof Angle){
    
                }
            }
            
            return;
        }
    
        const pt = this.getSvgPoint(ev, null);
    
        if(this.tool == null){
            this.tool = makeToolByType(glb.toolType)!;
            console.assert(this.tool.getTypeName() == glb.toolType.split('.')[0]);
        }
    
        if(this.tool != null){
    
            this.tool.click(ev, pt);
        }
    }

    svgPointerMove = (ev: PointerEvent)=>{
        if(this.capture != null){
            return;
        }
    
        if(this.tool != null){
            this.tool.pointermove(ev);
        }
    }
    
    getPoint(ev: MouseEvent) : Point | null{
        const pt = this.shapes.find(x => x.constructor.name == "Point" && (x as Point).circle == ev.target) as (Point|undefined);
        return pt == undefined ? null : pt;
    }
    
    getLine(ev: MouseEvent) : LineSegment | null{
        const line = this.shapes.find(x => x instanceof LineSegment && x.line == ev.target && x.handles.length == 2) as (LineSegment|undefined);
        return line == undefined ? null : line;
    }
    
    getCircle(ev: MouseEvent) : Circle | null{
        const circle = this.shapes.find(x => x instanceof Circle && x.circle == ev.target && x.handles.length == 2) as (Circle|undefined);
        return circle == undefined ? null : circle;
    }
    
    getArc(ev: MouseEvent) : Arc | null{
        const arc = this.shapes.find(x => x instanceof Arc && x.arc == ev.target && x.handles.length == 3) as (Arc|undefined);
        return arc == undefined ? null : arc;
    }

    toSvg2(x:number) : number{
        return x * this.svgRatio;
    }

    toSvgRatio() : Vec2 {
        const rc1 = this.svg.getBoundingClientRect() as DOMRect;
        const rc2 = this.div.getBoundingClientRect() as DOMRect;
    
        console.assert(rc1.x == rc2.x && rc1.y == rc2.y && rc1.width == rc2.width && rc1.height == rc2.height);
    
        return new Vec2(this.svg.viewBox.baseVal.width / rc1.width, this.svg.viewBox.baseVal.height / rc1.height) ;
    }
    
    G0toG1(){
        const v = Array.from(this.G0.childNodes.values());
        for(let x of v){
            if(!(x instanceof SVGImageElement)){

                this.G0.removeChild(x);
                this.G1.appendChild(x);
            }
        }
    }


    addWidget(act: Widget){
        let selIdx = getTimelinePos();
    
        this.widgets.splice(selIdx + 1, 0, act);
    
        // 要約を表示する。
        let opt = document.createElement("option");
        opt.innerHTML = act.summary();
        glb.selSummary.add(opt, 1 + selIdx + 1);
    
        opt.selected = true;
    
    /*    
        setTimePosMax( glb.widgets.length - 1 );
        this.updateTimePos(selIdx + 1);
        this.textArea.focus();
    */
    }
    

    getAll() : Widget[] {
        let v: Widget[] = [];
    
        this.widgets.forEach(x => x.all(v));
    
        return v;
    }
    
    allShapes() : Shape[] {
        return this.getAll().filter(x => x instanceof Shape && x.parentView == this) as Shape[];
    }
}

export abstract class Shape extends Widget {
    parentView : View = glb.view!;
    selected: boolean = false;
    EndTime: number | undefined = undefined;
    Color: string = fgColor;

    Name: string;
    namePos = new Vec2(0,0);
    svgName: SVGTextElement | null = null;

    Caption: string = "";
    FontSize : string = "";

    captionPos = new Vec2(0, 0);
    divCaption : HTMLDivElement | null = null;

    processEvent(sources: Shape[]){}
    listeners:Shape[] = [];     //!!! リネーム注意 !!!

    abstract app() : App;

    makeAction() : WidgetAction {
        const command = this.app();

        const eq = new App(operator("="), [ new RefVar(this.Name), command ])
        return new WidgetAction(eq);        
    }

    select(selected: boolean){
        this.selected = selected;

        let color = selected ? selColor : this.Color;
        if(this.svgName != null){

            this.svgName.setAttribute("stroke", color);
            this.svgName.setAttribute("fill", color);
        }

        if(this.divCaption != null){
            
            this.divCaption.style.color = color;
        }
    }

    setColor(c:string){
        this.Color = c;
        this.updateColor();
    }

    updateColor(){
        if(this.svgName != null){

            this.svgName.setAttribute("stroke", this.Color);
            this.svgName.setAttribute("fill", this.Color);
        }

        if(this.divCaption != null){
            
            this.divCaption.style.color = this.Color;
        }
    }

    click =(ev: MouseEvent, pt:Vec2): void => {}
    pointermove = (ev: PointerEvent) : void => {}

    constructor(){
        super();

        let letters : string;
        if(this instanceof Point){
            letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        }
        else if(this instanceof Angle){
            letters = "αβγδεζηθικλμνξοπρστυφχψω";
        }
        else{

            letters = "abcdefghijklmnopqrstuvwxyz";
        }

        const unused_letter = letters.split('').find(c => ! glb.dicName.has(c))!;
        assert(unused_letter != undefined);

        glb.dicName.set(unused_letter, this);

        this.Name = unused_letter;

        this.parentView.shapes.push(this);
    }

    makeObj() : any {
        let obj = Object.assign(super.makeObj(), {
            parentView : this.parentView.makeObj()
        });

        if(this.Color != undefined && this.Color != fgColor){
            obj.Color = this.Color;
        }

        if(this.Name != ""){
            obj.Name    = this.Name;
            obj.namePos = this.namePos;
        }

        if(this.Caption != ""){
            obj.Caption    = this.Caption;
            obj.captionPos = this.captionPos;
        }

        if(this.FontSize != ""){
            obj.FontSize = this.FontSize;
        }

        if(this.listeners.length != 0){
            obj.listeners = this.listeners.map(x => ({ ref: x.id }) );
        }

        if(this.validEndTime()){
            obj.EndTime = this.EndTime;
        }

        return obj;
    }

    make(obj: any) : Widget {
        super.make(obj);

        return this;
    }

    summary() : string {
        if(this.Name != ""){
            return this.Name;
        }

        if(this.Caption != ""){
            return this.Caption.replace(/\$\$/g, "\n$$\n");
        }

        return "";
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        if(this.svgName != null){
            this.svgName.setAttribute("visibility", (enable ? "visible" : "hidden"));
        }

        if(this.divCaption != null){
            this.divCaption.style.visibility = (enable ? "visible" : "hidden");
        }
    }

    delete(){
        super.delete();

        if(this.svgName != null){
            this.svgName.parentElement!.removeChild(this.svgName);
            this.svgName = null;
        }

        if(this.divCaption != null){
            this.divCaption.parentElement!.removeChild(this.divCaption);
            this.divCaption = null;
        }
    }

    finishTool(){
        this.parentView.G0toG1();
    
        let selected_shapes = this.parentView.allShapes().filter(x => x.selected);
        selected_shapes.forEach(x => x.select(false));
    
        console.assert(this.parentView.tool != null);
        this.parentView.addWidget(this.parentView.tool!);
        this.parentView.tool = null;

        const act = this.makeAction();
        addAction(act);
    }

    addListener(shape: Shape){
        console.assert(shape instanceof Shape);
        this.listeners.push(shape);
    }

    bind(pt: Point){
        this.addListener(pt);
        pt.bindTo = this;
    }

    makeEventGraph(src:Shape|null){
        // イベントのリスナーに対し
        for(let shape of this.listeners){
            if(!(shape instanceof Shape)){
                // !!!!!!!!!! ERROR !!!!!!!!!!
                // msg(`this:${this.id} shape:${(shape as any).id} ${(shape as Widget).summary()}`);
                continue;
            }
            
            // ビューのイベントキューのイベントグラフに追加する。
            this.parentView.eventQueue.addEventMakeEventGraph(shape, this);
        }
    }

    toSvg(x:number) : number{
        return x * this.parentView.svgRatio;
    }

    updateRatio(){
        if(this.svgName != null){
            const p = this.parentView.toSvgRatio();
            this.svgName.setAttribute("font-size", `${24 * p.y}`);
            this.svgName.setAttribute("stroke-width", `${0.2 * p.y}`);
        }
    }

    setName(text: string){
        this.Name = text;
        this.updateName();
    }

    setCaption(text: string){
        this.Caption = text;
        // this.updateCaption();
    }

    setFontSize(value: any){
        this.FontSize = value;
        // this.updateCaption();
    }

    updateName(){
        if(this.Name == ""){
            if(this.svgName != null){

                this.svgName.removeEventListener("pointerdown", this.namePointerdown);
                this.svgName.removeEventListener("pointermove", this.namePointermove);
                this.svgName.removeEventListener("pointerup"  , this.namePointerup);

                this.svgName.parentElement!.removeChild(this.svgName);
                this.svgName = null;
            }
        }
        else{
            if(this.svgName == null){

                this.svgName = document.createElementNS("http://www.w3.org/2000/svg","text");
                this.svgName.setAttribute("transform", "scale(1, -1)");
                this.svgName.setAttribute("stroke", this.Color);
                this.svgName.setAttribute("fill", this.Color);
                this.svgName.style.cursor = "pointer";
                this.parentView.G0.appendChild(this.svgName);

                this.updateNamePos();
                this.updateRatio();
        
                setNameEventListener(this);
            }

            this.svgName.textContent = this.Name;
        }
    }

    namePointerdown =(ev: PointerEvent)=>{
        if(glb.toolType != "select"){
            return;
        }

        glb.eventPos = this.parentView.DomToSvgPos(ev);
        this.parentView.capture = this;
        this.svgName!.setPointerCapture(ev.pointerId);
    }

    namePointermove =(ev: PointerEvent)=>{
        if(glb.toolType != "select" || this.parentView.capture != this){
            return;
        }
    }

    namePointerup =(ev: PointerEvent)=>{
        if(glb.toolType != "select"){
            return;
        }

        this.svgName!.releasePointerCapture(ev.pointerId);
    }

    getCenterXY() : Vec2{
        throw new Error();
    }

    getNameXY(){
        const p = this.getCenterXY();

        let x =  p.x + this.namePos.x;
        let y = -p.y + this.namePos.y;

        return [x, y];
    }

    updateNamePos(){
        if(this.svgName != null){

            let [x, y] = this.getNameXY();
            this.svgName.setAttribute("x", `${x}`);
            this.svgName.setAttribute("y", `${y}`);
        }
    }

    getEndTime(){
        return this.validEndTime() ? this.EndTime : 0;
    }

    setEndTime(value: any){
        this.EndTime = value;
    }

    validEndTime(){
        return this.EndTime != undefined && 0 < this.EndTime;
    }
}

class Distance extends Shape {
    p1 : Point | null = null;
    p2 : Point | null = null;

    app() : App {
        assert(this.p1 != null && this.p2 != null);
        return new App(actionRef("@distance"), [this.p1!.app(), this.p2!.app()]);
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        let point = this.parentView.getPoint(ev);
        if(point == null){
            return;
        }

        if(this.p1 == null){
            this.p1 = point;
            this.p1.select(true);
        }
        else{
            this.p2 = point;

            this.finishTool();
        }
    }
}

export abstract class CompositeShape extends Shape {
    handles : Point[] = [];

    all(v: Widget[]){
        super.all(v);
        this.handles.forEach(x => x.all(v));
    }

    addHandle(handle: Point, useThisHandleMove: boolean = true){

        if(useThisHandleMove){

            handle.addListener(this);
        }
        this.handles.push(handle);
    }

    makeObj() : any {
        return Object.assign(super.makeObj() , {
            handles : this.handles.map(x => x.makeObj())
        });
    }

    delete(){
        super.delete();
        this.handles.filter(x => this.id < x.id).forEach(x => x.delete());
    }

    summary() : string {
        const text = super.summary();
        if(text != ""){
            return text;
        }

        return this.handles.map(x => x.summary()).join(' ');
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        this.handles.filter(x => this.id < x.id) .forEach(x => x.setEnable(enable));
    }

    clickHandle(ev: MouseEvent, pt:Vec2) : Point{
        let handle = this.parentView.getPoint(ev);
        if(handle == null){
    
            const line = this.parentView.getLine(ev);
            if(line != null){
    
                handle = new Point({pos:pt});
                line.adjust(handle);
    
                line.bind(handle)
            }
            else{
                const circle = this.parentView.getCircle(ev);
                if(circle != null){
    
                    handle = new Point({pos:pt});
                    circle.adjust(handle);
    
                    circle.bind(handle)
                }
                else{
                    const arc = this.parentView.getArc(ev);
                    if(arc != null){

                        handle = new Point({pos:pt});
                        arc.adjust(handle);
                        arc.bind(handle)    
                    }
                    else{

                        handle = new Point({pos:pt});
                    }
                }
            }
        }
        else{
            handle.select(true);
        }
    
        return handle;
    }
}

export class Point extends Shape {
    pos : Vec2 = new Vec2(NaN, NaN);
    pos3D : string | undefined = undefined;
    Visible : boolean = false;
    bindTo: Shape|undefined;    //!!! リネーム注意 !!!

    circle : SVGCircleElement;

    constructor(obj: any){
        super();

        this.circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        this.circle.setAttribute("fill", this.Color);        
        this.circle.style.cursor = "pointer";

        console.assert(obj.pos != undefined);
        super.make(obj);
        console.assert(! isNaN(this.pos.x));

        setPointEventListener(this);

        this.updateName();
        this.updateColor();

        this.updateRatio();

        this.setPos();
    
        this.parentView.G2.appendChild(this.circle);

        return this;
    }

    app() : App {
        return new App(actionRef("@point"), [v2app(this.pos)]);
    }

    setEnable(enable: boolean){
        super.setEnable(enable);

        let visible = (enable && this.Visible == true);
        this.circle.setAttribute("visibility", (visible ? "visible" : "hidden"));
    }

    updateRatio(){
        super.updateRatio();
        this.circle.setAttribute("r", `${this.toSvg(5)}`);
    }

    propertyNames() : string[] {
        return [ "X", "Y", "Color", "Name", "Caption", "Pos3D", "Visible", "FontSize", "EndTime" ];
    }

    makeObj() : any {
        let obj = Object.assign(super.makeObj(), {
             pos: this.pos
        });

        if(this.pos3D != undefined){
            obj.pos3D = this.pos3D;
        }

        if(this.bindTo != undefined){
            obj.bindTo = { ref: this.bindTo.id };
        }

        if(this.Visible == true){
            obj.Visible = true;
        }

        return obj;
    }

    summary() : string {
        return `点 ${super.summary()}`;
    }

    getX(){
        return this.pos.x;
    }

    setX(value:any){
        this.pos.x =  parseFloat(value);
        this.updatePos();
    }

    getY(){
        return this.pos.y;
    }

    setY(value:any){
        this.pos.y =  parseFloat(value);
        this.updatePos();
    }

    updateColor(){
        super.updateColor();
        this.circle.setAttribute("fill", this.Color);
    }

    getPos3D(){
        return this.pos3D != undefined ? this.pos3D : "";
    }

    setPos3D(value: any){
        let s = (value as string).trim();
        if(s != ""){

            this.pos3D = s;
        }
        else{

            this.pos3D = undefined;
        }
    }

    setVisible(value: any){
        this.Visible = value;
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        this.pos = pt;

        const line = this.parentView.getLine(ev);

        if(line == null){

            this.setPos();
        }
        else{

            line.bind(this)
            line.adjust(this);
        }

        this.finishTool();
    }

    setPos(){
        this.circle.setAttribute("cx", "" + this.pos.x);
        this.circle.setAttribute("cy", "" + this.pos.y);

        this.updateNamePos();
    }

    getCenterXY() : Vec2{
        return this.pos;
    }

    select(selected: boolean){
        if(this.selected != selected){
            super.select(selected);

            if(this.selected){
                this.circle.setAttribute("fill", selColor);
            }
            else{
                this.circle.setAttribute("fill", this.Color);
            }
        }
    }

    private dragPoint(){
        if(this.bindTo != undefined){

            if(this.bindTo instanceof LineSegment){
                this.bindTo.adjust(this);
            }
            else if(this.bindTo instanceof Circle){
                this.bindTo.adjust(this);
            }
            else if(this.bindTo instanceof Arc){
                this.bindTo.adjust(this);
            }
            else{
                console.assert(false);
            }
        }
        else{

            this.setPos();
        }
    }

    processEvent =(sources: Shape[])=>{
        if(this.bindTo != undefined){

            if(this.bindTo instanceof LineSegment || this.bindTo instanceof Circle || this.bindTo instanceof Arc){
                this.bindTo.adjust(this);
            }
        }
    }

    updatePos(){
        this.dragPoint();
        this.makeEventGraph(null);
        this.parentView.eventQueue.processQueue();
    }

    pointerdown =(ev: PointerEvent)=>{
        if(glb.toolType != "select"){
            return;
        }

        this.parentView.capture = this;
        this.circle.setPointerCapture(ev.pointerId);
    }

    pointermove =(ev: PointerEvent)=>{
        if(glb.toolType != "select"){
            return;
        }

        if(this.parentView.capture != this){
            return;
        }

        this.pos = this.parentView.getSvgPoint(ev, this);
        
        this.updatePos();
    }

    pointerup =(ev: PointerEvent)=>{
        if(glb.toolType != "select"){
            return;
        }

        this.circle.releasePointerCapture(ev.pointerId);
        this.parentView.capture = null;

        this.pos = this.parentView.getSvgPoint(ev, this);
        this.updatePos();
    }

    delete(){
        super.delete();
        if(this.circle != null){

            this.circle.parentElement!.removeChild(this.circle);
            this.circle = null!;
        }
    }
}

export abstract class AbstractStraightLine extends CompositeShape {    
    line : SVGLineElement;
    p1: Vec2 = new Vec2(0,0);
    p2: Vec2 = new Vec2(0,0);
    p12: Vec2 = new Vec2(0,0);
    e: Vec2 = new Vec2(0,0);
    len: number = 0;

    Arrow = 0;
    svgArrow : SVGPathElement | null = null;

    constructor(){
        super();
        //---------- 
        this.line = document.createElementNS("http://www.w3.org/2000/svg","line");
        this.line.setAttribute("stroke", this.color());
        this.updateRatio();

        this.parentView.G0.appendChild(this.line);
    }

    makeObj() : any {
        let obj = super.makeObj();

        if(this.Arrow != 0){
            obj.Arrow = this.Arrow;
        }

        return obj;
    }

    summary() : string {
        return `線分 ${super.summary()}`;
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        this.line.setAttribute("visibility", (enable ? "visible" : "hidden"));

        if(this.svgArrow != null){
            this.svgArrow.setAttribute("visibility", (enable ? "visible" : "hidden"));
        }
    }

    updateRatio(){
        super.updateRatio();
        this.line.setAttribute("stroke-width", `${this.toSvg(strokeWidth)}`);
    }

    make(obj: any) : Widget {
        super.make(obj);

        this.line.setAttribute("stroke", this.color());

        for(let p of this.handles){
            console.assert(!isNaN(p.pos.x))
        }

        this.updateRatio();

        this.setVecs();
        this.updateArrow();
        this.updateLinePos();
        this.line.style.cursor = "move";

        return this;
    }

    getCenterXY() : Vec2 {
        const p1 = this.handles[0].pos;
        const p2 = this.handles[1].pos;

        return new Vec2((p1.x + p2.x)/2, (p1.y + p2.y)/2);
    }

    makeByPos(x1: number, y1: number, x2: number, y2: number){
        this.line.style.cursor = "move";
        this.addHandle(new Point({pos:new Vec2(x1, y1)}));
        this.addHandle(new Point({pos:new Vec2(x2, y2)}));
        this.updateLinePos();

        return this;
    }

    propertyNames() : string[] {
        return [ "Color", "Name", "Arrow", "Caption", "FontSize", "EndTime" ];
    }

    setColor(c:string){
        this.Color = c;
        this.line.setAttribute("stroke", c);

        if(this.svgArrow != null){
            this.svgArrow.setAttribute("fill", this.color());
        }
    }

    setArrow(n: number){
        this.Arrow = n;
        this.updateArrow();
    }

    updateArrow(){
        if(this.Arrow == 0){
            if(this.svgArrow != null){

                this.svgArrow.parentElement!.removeChild(this.svgArrow);
                this.svgArrow = null;
            }
        }
        else{

            if(this.svgArrow == null){
                this.svgArrow = document.createElementNS("http://www.w3.org/2000/svg","path");
                this.svgArrow.setAttribute("fill", this.color());

                this.parentView.G0.appendChild(this.svgArrow);

                this.updateArrowPos();
            }
        }
    }

    updateArrowPos(){
        if(this.svgArrow != null){
            let p1 = this.handles[1].pos;

            let sz = this.toSvg(10);
            let n = new Vec2(this.e.y, - this.e.x);

            let a1 = p1.add(this.e.mul( sz));
            let a2 = p1.add(this.e.mul(-sz));

            let b1 = a2.add(n.mul( sz));
            let b2 = a2.add(n.mul(-sz));

            let d = `M${a1.x} ${a1.y} L${b1.x} ${b1.y} L${b2.x} ${b2.y} Z`;
            this.svgArrow.setAttribute("d", d);
        }
    }
    
    select(selected: boolean){
        if(this.selected != selected){
            super.select(selected);

            let color = this.selected ? selColor : fgColor;

            this.line.setAttribute("stroke", color);

            if(this.svgArrow != null){
                this.svgArrow.setAttribute("fill", color);
            }    
        }
    }

    setPoints(p1:Vec2, p2:Vec2){
        this.line.setAttribute("x1", "" + p1.x);
        this.line.setAttribute("y1", "" + p1.y);

        this.line.setAttribute("x2", "" + p2.x);
        this.line.setAttribute("y2", "" + p2.y);

        if(this.handles.length != 0){
            this.handles[0].pos = p1;

            if(this.handles.length == 2){
                this.handles[1].pos = p2;
                this.handles[1]

                this.setVecs();
            }
        }
    }

    updateLinePos(){
        let pos1 : Vec2, pos2 : Vec2;

        if(this.handles.length == 1){
            pos1 = this.handles[0].pos;
            pos2 = this.handles[0].pos;
        }
        else{

            this.setVecs();

            if(this instanceof LineSegment){
                pos1 = this.p1;
                pos2 = this.p2;
            }
            else if(this instanceof StraightLine){
                pos1 = this.p1.sub(this.p12.mul(10000));
                pos2 = this.p1.add(this.p12.mul(10000));                
            }
            else if(this instanceof HalfLine){
                pos1 = this.p1;
                pos2 = this.p1.add(this.p12.mul(10000));
            }
            else{
                throw new MyError();
            }
        }

        this.line.setAttribute("x1", "" + pos1.x);
        this.line.setAttribute("y1", "" + pos1.y);

        this.line.setAttribute("x2", "" + pos2.x);
        this.line.setAttribute("y2", "" + pos2.y);
    }

    processEvent =(sources: Shape[])=>{
        for(let src of sources){
            if(src == this.handles[0]){

                const handle = this.handles[0];
                this.line.setAttribute("x1", "" + handle.pos.x);
                this.line.setAttribute("y1", "" + handle.pos.y);
            }
            else if(src == this.handles[1]){
                
                const handle = this.handles[1];
                this.line.setAttribute("x2", "" + handle.pos.x);
                this.line.setAttribute("y2", "" + handle.pos.y);
            }
            else{
                console.assert(src instanceof Rect || src instanceof ParallelLine);
            }
        }

        this.setVecs();

        this.updateNamePos();
        this.updateArrowPos();
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        this.addHandle(this.clickHandle(ev, pt));

        this.line.setAttribute("x2", "" + pt.x);
        this.line.setAttribute("y2", "" + pt.y);
        if(this.handles.length == 1){

            this.line.setAttribute("x1", "" + pt.x);
            this.line.setAttribute("y1", "" + pt.y);
        }
        else{
            this.line.style.cursor = "move";

            this.updateLinePos();

            this.finishTool();
        }    
    }

    pointermove =(ev: PointerEvent) : void =>{
        const pt = this.parentView.getSvgPoint(ev, null);

        this.line!.setAttribute("x2", "" + pt.x);
        this.line!.setAttribute("y2", "" + pt.y);
    }

    setVecs(){
        this.p1 = this.handles[0].pos;
        this.p2 = this.handles[1].pos;
        this.p12 = this.p2.sub(this.p1);
        this.e = this.p12.unit();
        this.len = this.p12.len();
    }

    adjust(handle: Point) {
        let posInLine;

        if(this.len == 0){
            posInLine = 0;
        }
        else{
            posInLine = this.e.dot(handle.pos.sub(this.p1)) / this.len;
        }
        handle.pos = this.p1.add(this.p12.mul(posInLine));
        handle.setPos();
    }

    delete(){
        super.delete();
        this.line.parentElement!.removeChild(this.line);
    }

    color(){
        return this.Color == undefined ? fgColor : this.Color;
    }
}

export class LineSegment extends AbstractStraightLine {

    app() : App{
        return new App(actionRef("@line_segment"), [v2app(this.p1), v2app(this.p2)]);
    }

}

export class StraightLine extends AbstractStraightLine {

    app() : App{
        return new App(actionRef("@straight_line"), [v2app(this.p1), v2app(this.p2)]);
    }

}

export class HalfLine extends AbstractStraightLine {

    app() : App{
        return new App(actionRef("@half_line"), [v2app(this.p1), v2app(this.p2)]);
    }

}

export class BSpline extends CompositeShape {  
    static six = 1 / 6;  
    static Bs : Float64Array[];
    paths: SVGPathElement[];
    points: Vec2[] = [];

    constructor(){
        super();

        if(BSpline.Bs == undefined){

            BSpline.Bs = [];

            for(let i = 0; i < 10; i++){
                let s  = i * 0.1;
                let b0 = this.B0(0 + s);
                let b1 = this.B1(1 + s);
                let b2 = this.B2(2 + s);
                let b3 = this.B3(3 + s);

                BSpline.Bs.push(new Float64Array([b0, b1, b2, b3]));
            }
        }

        this.paths = [];
        const colors = [ "green", "red", fgColor]
        for(let idx of range(3)){

            let path = document.createElementNS("http://www.w3.org/2000/svg","path");

            path.setAttribute("fill", "none");
            path.setAttribute("stroke", colors[idx]);
            if(idx == 1){

                path.setAttribute("stroke-width", `${2 * this.toSvg(thisStrokeWidth)}`);
            }
            else{

                path.setAttribute("stroke-width", `${this.toSvg(thisStrokeWidth)}`);
            }

            this.paths.push(path);
            this.parentView.G0.appendChild(path);
        };
    }

    app() : App{
        assert(false);
        return new App(actionRef("@bspline"), []);
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        this.addHandle(this.clickHandle(ev, pt));

        this.points.push( this.parentView.getSvgPoint(ev, null) );

        if(this.handles.length == 2){

            msg(`b-spline ${this.points.length}`);
            this.drawPath();
            this.finishTool();
        }
    }

    pointermove =(ev: PointerEvent) : void =>{
        const pt = this.parentView.getSvgPoint(ev, null);

        this.points.push(pt);
        this.drawPath();
    }

    drawPath(){
        const d0 = "M" + this.points.map(p => `${p.x},${p.y}`).join(" ");
        this.paths[0].setAttribute("d", d0);

        const n = 10;
        const v = [];
        const v3 = [];

        for(let idx = 0; idx < this.points.length ;idx += n ){
            let p0 = this.points[idx];
            let p1 : Vec2;
            let p2 : Vec2;
            let p3 : Vec2;

            if(idx + n < this.points.length){
                p1 = this.points[idx + n];
            }
            else{
                p1 = p0;
            }

            if(idx + 2 * n < this.points.length){
                p2 = this.points[idx + 2 * n];
            }
            else{
                p2 = p1;
            }

            if(idx + 3 * n < this.points.length){
                p3 = this.points[idx + 3 * n];
            }
            else{
                p3 = p2;
            }
    

            for(let i = 0; i < 10; i++){
                let [b0, b1, b2, b3] = BSpline.Bs[i];

                let x = p0.x * b3 + p1.x * b2 + p2.x * b1 + p3.x * b0; 
                let y = p0.y * b3 + p1.y * b2 + p2.y * b1 + p3.y * b0; 
                v.push([x,y]);
            }

            let p02 = p0.divide(2/3, p1);
            let p11 = p1.divide(1/3, p2);
            let p12 = p1.divide(2/3, p2);
            let p21 = p2.divide(1/3, p3);

            let a   = p02.divide(0.5, p11);
            let b   = p12.divide(0.5, p21);

            v3.push(`M${a.x} ${a.y} C ${p11.x} ${p11.y}, ${p12.x} ${p12.y}, ${b.x} ${b.y}`);
        }

        if(2 <= v.length){

            const d1 = "M" + v.map(([x,y]) => `${x},${y}`).join(" ");
            this.paths[1].setAttribute("d", d1);
        }

        if(v3.length != 0){

            const d2 = v3.join(" ");
            this.paths[2].setAttribute("d", d2);
        }
    }

    B0(t: number){
        return BSpline.six * t * t * t;
    }

    B1(t: number){
        const t2 = t * t;
        return BSpline.six * (- 3 * t * t2 + 12 * t2 - 12 * t + 4 );
    }

    B2(t: number){
        const t2 = t * t;
        return BSpline.six * ( 3 * t * t2 - 24 * t2 + 60 * t - 44 );
    }

    B3(t: number){
        const t4 = t - 4
        return - BSpline.six * t4 * t4 * t4;
    }
}

export class Polygon extends CompositeShape {
    lines : Array<LineSegment> = [];


    app() : App{
        return new App(actionRef("@polygon"), this.lines.map(x => x.app()));
    }

    all(v: Widget[]){
        super.all(v);
        this.lines.forEach(x => x.all(v));
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        this.lines.forEach(x => x.setEnable(enable));
    }
}

export class Rect extends Polygon {
    isSquare: boolean = true;
    h : number = -1;
    inSetRectPos : boolean = false;

    constructor(){
        super();
    }

    app() : App{
        if(this.isSquare){

            return new App(actionRef("@square"), this.lines.map(x => x.app()));
        }
        else{

            return new App(actionRef("@rect"), this.lines.map(x => x.app()));
        }
    }

    makeObj() : any {
        return Object.assign(super.makeObj(), {
            isSquare: this.isSquare,
            lines: this.lines.map(x => x.makeObj())
        });
    }

    summary() : string {
        return this.isSquare ? "正方形" : "矩形";
    }

    setRectPos(pt: Vec2|null, idx: number, clicked:boolean){
        if(this.inSetRectPos){
            return;
        }
        this.inSetRectPos = true;

        const p1 = this.handles[0].pos; 

        let p2;

        if(this.handles.length == 1){

            p2 = pt!;
        }
        else{

            p2 = this.handles[1].pos; 
        }

        const p12 = p2.sub(p1);

        const e = (new Vec2(- p12.y, p12.x)).unit();

        let h;
        if(this.isSquare){

            h = p12.len();
        }
        else{

            if(this.h == -1 || idx == 2){

                let pa;
                if(this.handles.length < 4){
        
                    pa = pt!;
        
                }
                else{
        
                    pa = this.handles[2].pos; 
                }
        
                const p0a = pa.sub(p1);
                h = e.dot(p0a);
    
                if(this.handles.length == 4){
                    this.h = h;
                }
            }
            else{
                h = this.h;
            }
        }

        const eh = e.mul(h);
        const p3 = p2.add(eh);
        const p4 = p3.add(p1.sub(p2));

        const line1 = this.lines[0];
        line1.setPoints(p1, p2);

        const line2 = this.lines[1];
        line2.setPoints(p2, p3);

        const line3 = this.lines[2];
        line3.setPoints(p3, p4);

        const line4 = this.lines[3];
        line4.setPoints(p4, p1);

        if(clicked){
            if(this.handles.length == 2 && this.isSquare){

                line1.addHandle(this.handles[1], false);
                line2.addHandle(this.handles[1], false);

                line1.line.style.cursor = "move";
                
                this.addHandle(new Point({pos:p3}), false);
            }

            switch(this.handles.length){
            case 1:
                line1.addHandle(this.handles[0], false);
                break;
            case 2:
                line1.addHandle(this.handles[1], false);
                line2.addHandle(this.handles[1], false);

                line1.line.style.cursor = "move";

                break;
            case 3:
                line2.addHandle(this.handles[2], false);
                line2.line.style.cursor = "move";

                const handle4 = new Point({pos:p4});
                this.addHandle(handle4, false);

                line3.addHandle(this.handles[2], false);
                line3.addHandle(handle4, false);
                line3.line.style.cursor = "move";

                line4.addHandle(handle4, false);
                line4.addHandle(this.handles[0], false);
                line4.line.style.cursor = "move";
                break;
            }
        }

        if(3 <= this.handles.length){

            this.handles[2].pos = p3;
            this.handles[2].setPos();
    
            if(this.handles.length == 4){

                this.handles[3].pos = p4;
                this.handles[3].setPos();        
            }
        }

        this.inSetRectPos = false;
    }

    makeEventGraph(src:Shape|null){
        super.makeEventGraph(src);

        if(src == this.handles[0] || src == this.handles[1]){

            this.parentView.eventQueue.addEventMakeEventGraph(this.handles[2], this);
        }
        else{
            console.assert(src == this.handles[2]);
        }

        for(let line of this.lines){

            this.parentView.eventQueue.addEventMakeEventGraph(line, this);
        }
    }

    processEvent =(sources: Shape[])=>{
        for(let source of sources){
            console.assert(source.constructor.name == "Point");
            let i = this.handles.indexOf(source as Point);
            console.assert([0, 1, 2].includes(i));
        }

        const handle = sources[0] as Point;

        const idx = this.handles.indexOf(handle);
        this.setRectPos(handle.pos, idx, false);
    }

    click =(ev: MouseEvent, pt:Vec2): void =>{
        if(this.lines.length == 0){

            for(let i = 0; i < 4; i++){

                const line = new LineSegment();
                this.lines.push(line);
            }
        }

        this.addHandle(this.clickHandle(ev, pt));

        this.setRectPos(pt, -1, true);

        if(this.handles.length == 4){

            for(let line of this.lines){
                console.assert(line.handles.length == 2);
                line.setVecs();
            }
            this.finishTool();
        }    
    }

    pointermove =(ev: PointerEvent) : void =>{
        const pt = this.parentView.getSvgPoint(ev, null);

        this.setRectPos(pt, -1, false);
    }
}

abstract class CircleArc extends CompositeShape {

    getRadius(){
        return NaN;
    }

    getCenter(){
        return this.handles[0].pos;
    }
}

export class Circle extends CircleArc {
    byDiameter:boolean;
    center: Vec2|null = null;
    radius: number = this.toSvg(1);
    
    circle: SVGCircleElement;

    constructor(by_diameter: boolean){
        super();

        this.byDiameter = by_diameter;

        this.circle = document.createElementNS("http://www.w3.org/2000/svg","circle");
        this.circle.setAttribute("fill", "none");// "transparent");
        this.circle.setAttribute("stroke", this.Color);
        this.circle.setAttribute("fill-opacity", "0");
        this.circle.style.cursor = "move";

        this.updateRatio();
        
        this.parentView.G0.appendChild(this.circle);    
    }

    app() : App{
        return new App(actionRef("@circle"), [ this.handles[0].app() ]);        
    }

    summary() : string {
        return "円";
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        this.circle.setAttribute("visibility", (enable ? "visible" : "hidden"));
    }

    updateRatio(){
        super.updateRatio();
        this.circle.setAttribute("stroke-width", `${this.toSvg(strokeWidth)}`);
    }

    makeObj() : any {
        return Object.assign(super.makeObj(), {
            byDiameter: this.byDiameter,
            center: this.center,
            radius: this.radius,
        });
    }

    propertyNames() : string[] {
        return [ "Color" ];
    }

    make(obj: any) : Widget {
        super.make(obj);

        this.circle.setAttribute("cx", "" + this.center!.x);
        this.circle.setAttribute("cy", "" + this.center!.y);
        this.circle.setAttribute("r", "" + this.radius);

        return this;
    }

    select(selected: boolean){
        if(this.selected != selected){
            super.select(selected);

            if(this.selected){
                this.circle.setAttribute("stroke", selColor);
            }
            else{
                this.circle.setAttribute("stroke", this.Color);
            }
        }
    }

    setColor(c:string){
        this.Color = c;
        this.circle.setAttribute("stroke", this.Color);
    }

    setCenter(pt: Vec2){
        this.center = this.handles[0].pos.add(pt).mul(0.5);

        this.circle.setAttribute("cx", "" + this.center.x);
        this.circle.setAttribute("cy", "" + this.center.y);
    }

    getRadius(){
        return this.radius;
    }

    setRadius(pt: Vec2){
        this.radius = this.center!.dist(pt);
        this.circle!.setAttribute("r", "" +  this.radius );
    }

    processEvent =(sources: Shape[])=>{
        for(let src of sources){
            if(src == this.handles[0]){

                if(this.byDiameter){

                    this.setCenter(this.handles[1].pos);
                }
                else{
        
                    this.center = this.handles[0].pos;
                    this.circle.setAttribute("cx", "" + this.handles[0].pos.x);
                    this.circle.setAttribute("cy", "" + this.handles[0].pos.y);
                }
        
                this.setRadius(this.handles[1].pos);
            }
            else if(src == this.handles[1]){

                if(this.byDiameter){
                    this.setCenter(this.handles[1].pos);
                }

                this.setRadius(this.handles[1].pos);
            }
            else{
                console.assert(false);
            }
        }
    }

    click =(ev: MouseEvent, pt:Vec2): void =>{
        this.addHandle(this.clickHandle(ev, pt));

        if(this.handles.length == 1){

            this.center = pt;

            this.circle.setAttribute("cx", "" + pt.x);
            this.circle.setAttribute("cy", "" + pt.y);
            this.circle.setAttribute("r", "" + this.radius);
        }
        else{
            if(this.byDiameter){

                this.setCenter(pt);
            }
    
            this.setRadius(pt);
    
            this.finishTool();
        }
    }

    pointermove =(ev: PointerEvent) : void =>{
        const pt = this.parentView.getSvgPoint(ev, null);

        if(this.byDiameter){

            this.setCenter(pt);
        }
        this.setRadius(pt);
    }

    adjust(handle: Point) {
        const v = handle.pos.sub(this.center!);
        const theta = Math.atan2(v.y, v.x);

        handle.pos = new Vec2(this.center!.x + this.radius * Math.cos(theta), this.center!.y + this.radius * Math.sin(theta));

        handle.setPos();
    }
}

export class DimensionLine extends CompositeShape {
    arcs: SVGPathElement[];
    lines : SVGLineElement[];

    constructor(){
        super();

        this.arcs = [];
        this.lines = [];

        for(let i = 0; i < 2; i++){

            const arc = document.createElementNS("http://www.w3.org/2000/svg","path");

            arc.setAttribute("fill", "none");
            arc.setAttribute("stroke", fgColor);
            arc.style.cursor = "pointer";
            arc.style.zIndex = "-2";

            this.parentView.G0.appendChild(arc);

            this.arcs.push(arc);

            const line = document.createElementNS("http://www.w3.org/2000/svg","line");
            line.setAttribute("stroke", fgColor);
    
            this.parentView.G0.appendChild(line);
    
            this.lines.push(line);
        }

        this.updateRatio();
    }

    app() : App{
        assert(false);
        return new App(actionRef("@dimension_line"), []);        
    }

    summary() : string {
        return "寸法線";
    }

    setEnable(enable: boolean){
        super.setEnable(enable);

        const visibility = (enable ? "visible" : "hidden");
        this.arcs.forEach(x => x.setAttribute("visibility", visibility));
        this.lines.forEach(x => x.setAttribute("visibility", visibility));
    }

    updateRatio(){
        super.updateRatio();
        for(let arc of this.arcs){
            arc.setAttribute("stroke-width", `${this.toSvg(thisStrokeWidth)}`);
        }
        for(let line of this.lines){
            line.setAttribute("stroke-width", `${this.toSvg(thisStrokeWidth)}`);
        }
    }

    make(obj: any) : Widget {
        super.make(obj);
        this.drawPath(this.handles[2].pos);

        return this;
    }

    propertyNames() : string[] {
        return [ "EndTime" ];
    }

    processEvent =(sources: Shape[])=>{
        this.drawPath(this.handles[2].pos);
    }

    click =(ev: MouseEvent, pt:Vec2): void =>{
        this.addHandle(this.clickHandle(ev, pt));

        if(this.handles.length == 3){
    
            this.finishTool();
        }
    }

    pointermove =(ev: PointerEvent) : void =>{
        if(this.handles.length != 2){
            return;
        }

        this.drawPath(this.parentView.getSvgPoint(ev, null));
    }

    drawPath(p3: Vec2){
        const p1 = this.handles[0].pos;
        const p2 = this.handles[1].pos;

        const p21 = p1.sub(p2);
        const p23 = p3.sub(p2);
        const l1 = p21.unit().dot(p23);
        const p4 = p2.add(p21.unit().mul(l1));

        const v = p3.sub(p4);
        const r = v.len();
        const r2 = Math.min(r, p21.len() / 2);

        const p1c = p1.add(v);
        const p1d = p1c.add(p21.unit().mul(-r2));
        const d1 = `M${p1.x} ${p1.y} Q ${p1c.x} ${p1c.y} ${p1d.x} ${p1d.y}`;

        this.arcs[0].setAttribute("d", d1);

        const p2c = p2.add(v);
        const p2d = p2c.add(p21.unit().mul(r2));
        const d2 = `M${p2.x} ${p2.y} Q ${p2c.x} ${p2c.y} ${p2d.x} ${p2d.y}`;

        this.arcs[1].setAttribute("d", d2);


        const line_len = Math.min(l1, p21.len() / 2) - r;
        if(0 < line_len){

            this.lines[0].setAttribute("x1", "" + p1d.x);
            this.lines[0].setAttribute("y1", "" + p1d.y);

            const p5 = p1d.add(p21.unit().mul(- line_len))
            this.lines[0].setAttribute("x2", "" + p5.x);
            this.lines[0].setAttribute("y2", "" + p5.y);


            this.lines[1].setAttribute("x1", "" + p2d.x);
            this.lines[1].setAttribute("y1", "" + p2d.y);

            const p6 = p2d.add(p21.unit().mul(line_len))
            this.lines[1].setAttribute("x2", "" + p6.x);
            this.lines[1].setAttribute("y2", "" + p6.y);

            this.lines.forEach(x => x.setAttribute("visibility", "visible"));
        }
        else{
            this.lines.forEach(x => x.setAttribute("visibility", "hidden") );
        }

    }
}

export class Triangle extends Polygon {
    makeObj() : any {
        return Object.assign(super.makeObj(), {
            lines: this.lines.map(x => x.makeObj()) 
        });
    }

    app() : App{
        assert(false);
        return new App(actionRef("@triangle"), []);                
    }

    summary() : string {
        return "三角形";
    }

    click =(ev: MouseEvent, pt:Vec2): void =>{
        const line = new LineSegment();

        if(this.lines.length == 0){
            line.addHandle(this.clickHandle(ev, pt));
        }
        else{

            const lastLine = last(this.lines);
            const handle = this.clickHandle(ev, pt);
            lastLine.addHandle(handle);
            lastLine.updateLinePos();
            lastLine.line.style.cursor = "move";

            line.addHandle(handle);
        }

        if(this.lines.length == 2){

            const handle1 = this.lines[0].handles[0];

            line.addHandle(handle1);
            line.line.style.cursor = "move";

            this.finishTool();
        }

        this.lines.push(line);
        line.updateLinePos();
    }

    pointermove =(ev: PointerEvent) : void =>{
        const lastLine = last(this.lines);
        lastLine.pointermove(ev);
    }
}

export class Midpoint extends CompositeShape {
    midpoint : Point | null = null;

    app() : App{
        assert(false);
        return new App(actionRef("@"), []);        
    }

    makeObj() : any {
        return Object.assign(super.makeObj(), {
            midpoint: this.midpoint!.makeObj()
        });
    }

    all(v: Widget[]){
        super.all(v);
        console.assert(this.midpoint != null);
        this.midpoint!.all(v);
    }

    summary() : string {
        return "中点";
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        this.midpoint!.setEnable(enable);
    }

    calcMidpoint(){
        const p1 = this.handles[0].pos;
        const p2 = this.handles[1].pos;

        return new Vec2((p1.x + p2.x)/2, (p1.y + p2.y)/2);
    }

    makeEventGraph(src:Shape|null){
        super.makeEventGraph(src);

        this.parentView.eventQueue.addEventMakeEventGraph(this.midpoint!, this);
    }

    processEvent =(sources: Shape[])=>{
        this.midpoint!.pos = this.calcMidpoint();
        this.midpoint!.setPos();
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        this.addHandle(this.clickHandle(ev, pt));

        if(this.handles.length == 2){

            this.midpoint = new Point({pos:this.calcMidpoint()});

            this.finishTool();
        }
    }
}


export class Perpendicular extends CompositeShape {
    line : LineSegment | null = null;
    foot : Point | null = null;
    perpendicular : LineSegment | null = null;
    inHandleMove: boolean = false;

    app() : App{
        assert(false);
        return new App(actionRef("@"), []);        
    }
    
    makeObj() : any {
        return Object.assign(super.makeObj(), {
            line: this.line!.makeObj(),
            foot: this.foot!.makeObj(),
            perpendicular: this.perpendicular!.makeObj()
        });
    }

    all(v: Widget[]){
        super.all(v);
        this.foot!.all(v);
        this.perpendicular!.all(v);
    }

    summary() : string {
        return "垂線";
    }

    setEnable(enable: boolean){
        super.setEnable(enable);

        this.foot!.setEnable(enable);
        this.perpendicular!.setEnable(enable);
    }

    makeEventGraph(src:Shape|null){
        super.makeEventGraph(src);

        this.parentView.eventQueue.addEventMakeEventGraph(this.foot!, this);
    }

    processEvent =(sources: Shape[])=>{
        if(this.inHandleMove){
            return;
        }
        this.inHandleMove = true;

        this.foot!.pos = calcFootOfPerpendicular(this.handles[0].pos, this.line!);
        this.foot!.setPos();

        this.perpendicular!.setPoints(this.handles[0].pos, this.foot!.pos);

        this.inHandleMove = false;
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        if(this.handles.length == 0){

            this.addHandle(this.clickHandle(ev, pt));
        }
        else {

            this.line = this.parentView.getLine(ev);
            if(this.line == null){
                return;
            }

            this.line.addListener(this);

            this.foot = new Point({pos:calcFootOfPerpendicular(this.handles[0].pos, this.line!)});

            this.perpendicular = new LineSegment();
            this.perpendicular.line.style.cursor = "move";
            this.perpendicular.addHandle(this.handles[0]);
            this.perpendicular.addHandle(this.foot, false);

            this.perpendicular.setVecs();
            this.perpendicular.updateLinePos();

            this.finishTool();
        }
    }
}

export class ParallelLine extends CompositeShape {
    line1 : LineSegment | null = null;
    line2 : LineSegment | null = null;

    app() : App{
        assert(false);
        return new App(actionRef("@"), []);        
    }

    all(v: Widget[]){
        super.all(v);
        this.line1!.all(v);
        this.line2!.all(v);
    }
    
    makeObj() : any {
        return Object.assign(super.makeObj(), {
            line1: this.line1!.makeObj(),
            line2: this.line2!.makeObj(),
        });
    }

    summary() : string {
        return "平行線";
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        
        this.line2!.setEnable(enable);
    }

    calcParallelLine(){
        let pos = this.handles[0].pos;
        const p1 = pos.add(this.line1!.e.mul(infinity));
        const p2 = pos.sub(this.line1!.e.mul(infinity));

        this.line2!.setPoints(p1, p2);
    }

    makeEventGraph(src:Shape|null){
        super.makeEventGraph(src);

        this.parentView.eventQueue.addEventMakeEventGraph(this.line2!, this);
    }

    processEvent =(sources: Shape[])=>{
        this.calcParallelLine();
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        if(this.line1 == null){

            this.line1 = this.parentView.getLine(ev);
            if(this.line1 == null){
                return;
            }

            this.line1.select(true);
            this.line1.addListener(this);
        }
        else {

            let point = this.parentView.getPoint(ev);
            if(point == null){
                return;
            }

            this.addHandle(point);

            this.line2 = new LineSegment();
            this.line2.line.style.cursor = "move";

            this.line2.addHandle(new Point({pos:new Vec2(0,0)}));
            this.line2.addHandle(new Point({pos:new Vec2(0,0)}));
            this.calcParallelLine();
            for(let handle of this.line2.handles){
                handle.setPos();
            }

            this.finishTool();
        }
    }
}

export class Intersection extends Shape {
    lines : LineSegment[] = [];
    arcs    : CircleArc[] = [];
    intersections : Point[] = [];

    app() : App{
        assert(false);
        return new App(actionRef("@"), []);        
    }

    makeObj() : any {
        let obj = Object.assign(super.makeObj(), {
            lines: this.lines.map(x => x.makeObj()),
            arcs : this.arcs.map(x => x.makeObj()),
            intersections: this.intersections.map(x => x.makeObj())
        });

        return obj;
    }

    all(v: Widget[]){
        super.all(v);
        this.intersections.forEach(x => x.all(v));
    }

    summary() : string {
        return "交点";
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        
        this.intersections.forEach(x => x.setEnable(enable));
    }

    makeEventGraph(src:Shape|null){
        super.makeEventGraph(src);

        for(let pt of this.intersections){
            this.parentView.eventQueue.addEventMakeEventGraph(pt, this);
        }
    }

    processEvent =(sources: Shape[])=>{
        let points : Vec2[] = [];

        if(this.lines.length == 2){
            points.push( linesIntersection(this.lines[0], this.lines[1]) );
        }
        else if(this.lines.length == 1 && this.arcs.length == 1){
            points = lineArcIntersection(this.lines[0], this.arcs[0]);
        }
        else if(this.arcs.length == 2){
            points = ArcArcIntersection(this.arcs[0], this.arcs[1]);
        }

        for(let [i,pt] of points.entries()){
            this.intersections[i].pos = pt;
            this.intersections[i].setPos();
        }
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        const line = this.parentView.getLine(ev);
        
        if(line != null){
            this.lines.push(line);

            if(this.lines.length == 1){

                line.select(true);
            }
        }
        else{
            const circle = this.parentView.getCircle(ev);
            if(circle != null){

                this.arcs.push(circle);
                circle.select(true);
            }
            else{
                const arc = this.parentView.getArc(ev);
                if(arc != null){

                    this.arcs.push(arc);
                    arc.select(true);
                }
            }    
        }

        if(this.lines.length == 2){
            const v = linesIntersection(this.lines[0], this.lines[1]);
            this.intersections.push(new Point({pos:v}));
        }
        else if(this.lines.length == 1 && this.arcs.length == 1){

            let points = lineArcIntersection(this.lines[0], this.arcs[0]);

            if(points.length != 0){

                points.forEach(p => this.intersections.push(new Point({pos:p})));
            }
        }
        else if(this.arcs.length == 2){

            let points = ArcArcIntersection(this.arcs[0], this.arcs[1]);

            if(points.length != 0){

                points.forEach(p => this.intersections.push(new Point({pos:p})));
            }
        }

        if(this.lines.length + this.arcs.length == 2){
            this.lines.forEach(x => x.addListener(this));
            this.arcs.forEach(x => x.addListener(this));

            this.finishTool();
        }
    }

    pointermove = (ev: PointerEvent) : void => {
    }
}

function calcLargeArcSweepFlag(q1: Vec2, q2: Vec2){
        // 線分上の点の角度
        let theta1 = Math.atan2(q1.y, q1.x);
        let theta2 = Math.atan2(q2.y, q2.x);

        if(theta1 < 0){
            theta1 += 2 * Math.PI;
        }
        if(theta2 < 0){
            theta2 += 2 * Math.PI;
        }
        
        let deltaTheta = theta2 - theta1;
        if(deltaTheta < 0){
            deltaTheta += 2 * Math.PI;
        }

        const largeArcSweepFlag = (Math.PI < deltaTheta ? 1 : 0);

        return [ theta1, theta2, deltaTheta, largeArcSweepFlag];
}

export class Arc extends CircleArc {
    arc   : SVGPathElement;

    constructor(){
        super();
        this.arc = document.createElementNS("http://www.w3.org/2000/svg","path");

        this.arc.setAttribute("fill", "none");
        this.arc.setAttribute("stroke", this.Color);
        this.arc.setAttribute("stroke-width", `${this.toSvg(strokeWidth)}`);
        this.arc.style.cursor = "pointer";

        this.parentView.G0.appendChild(this.arc);
    }

    app() : App{
        assert(false);
        return new App(actionRef("@"), []);        
    }

    make(obj: any) : Widget {
        super.make(obj);
        this.drawArc(null);

        return this;
    }

    summary() : string {
        return "弧";
    }

    propertyNames() : string[] {
        return [ "Color", "EndTime" ];
    }

    select(selected: boolean){
        if(this.selected != selected){
            super.select(selected);

            if(this.selected){
                this.arc.setAttribute("stroke", selColor);
            }
            else{
                this.arc.setAttribute("stroke", this.Color);
            }
        }
    }

    setColor(c:string){
        this.Color = c;

        this.arc.setAttribute("stroke", this.Color);
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        this.arc.setAttribute("visibility", (enable ? "visible" : "hidden"));
    }

    processEvent =(sources: Shape[])=>{
        this.drawArc(null);
    }

    getRadius(){
        let [p0, p1] = [ this.handles[0].pos, this.handles[1].pos ];
        return p1.sub(p0).len();
    }

    adjust(handle: Point) {
        let [p0, p1] = [ this.handles[0].pos, this.handles[1].pos ];
        let radius = this.getRadius();

        const v = handle.pos.sub(p0);
        const theta = Math.atan2(v.y, v.x);

        handle.pos = new Vec2(p0.x + radius * Math.cos(theta), p0.y + radius * Math.sin(theta));

        handle.setPos();
    }

    click =(ev: MouseEvent, pt:Vec2): void =>{
        this.addHandle(this.clickHandle(ev, pt));

        if(this.handles.length == 3){
            this.drawArc(null);

            this.finishTool();
        }
    }

    drawArc(pt: Vec2 | null){
        let [p0, p1] = [ this.handles[0].pos, this.handles[1].pos ];
        let p2 = (pt != null ? pt : this.handles[2].pos);

        const q1 = p1.sub(p0);
        const q2 = p2.sub(p0);

        let [ theta1, theta2, deltaTheta, largeArcSweepFlag] = calcLargeArcSweepFlag(q1, q2);

        let r = this.getRadius();

        let x = p0.x + r * Math.cos(theta2);
        let y = p0.y + r * Math.sin(theta2);

        const d = `M${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArcSweepFlag} 1 ${x} ${y}`;

        this.arc.setAttribute("d", d);
        this.arc.setAttribute("stroke", this.Color);

        if(this.handles.length == 3){

            this.handles[2].pos = new Vec2(x, y);
            this.handles[2].setPos();
        }
    }

    pointermove =(ev: PointerEvent) : void =>{
        const pt = this.parentView.getSvgPoint(ev, null);

        if(this.handles.length == 2){

            this.drawArc(pt);
        }
    }

    delete(){
        super.delete();
        this.arc.parentElement!.removeChild(this.arc);
    }
}

enum AngleMark {
    rightAngle,
    arc,
    arc2,
    arc3,
    prime,
    prime2,
    prime3,
}

export class Angle extends Shape {
    lines : LineSegment[] = [];
    Mark: AngleMark = AngleMark.arc;
    handleIdx: number[] = [];

    downPos: Vec2[] = [];
    arcs   : SVGPathElement[] = [];
    primes : SVGLineElement[] = [];

    constructor(){
        super();
    }

    app() : App{
        assert(false);
        return new App(actionRef("@"), []);        
    }
    
    makeObj() : any {
        return Object.assign(super.makeObj(), {
            lines: this.lines.map(x => x.makeObj()),
            Mark : this.Mark,
            handleIdx: Array.from(this.handleIdx)
        });
    }

    make(obj: any) : Widget {
        super.make(obj);
        this.updateRatio();

        this.drawAngleArc();

        return this;
    }

    svgElements(){
        return (this.arcs as SVGGraphicsElement[]).concat(this.primes)
    }

    propertyNames() : string[] {
        return [ "Mark", "Color", "Name", "Caption", "FontSize" ];
    }

    summary() : string {
        return "角度";
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        this.svgElements().forEach(x => x.setAttribute("visibility", (enable ? "visible" : "hidden")));
    }

    delete(){        
        super.delete();
        this.svgElements().forEach(x => x.parentElement!.removeChild(x));
    }

    setMark(mark: AngleMark){
        this.Mark = mark;
        msg(`mark:${mark}`);

        this.drawAngleArc();
    }

    setColor(c:string){
        this.Color = c;
        for(let arc of this.arcs){

            arc.setAttribute("stroke", c);
        }
    }

    select(selected: boolean){
        if(this.selected != selected){
            super.select(selected);

            let color = (this.selected ? selColor : this.Color);
            this.svgElements().forEach(x => x.setAttribute("stroke", color));
        }
    }

    updateRatio(){
        super.updateRatio();
        for(let arc of this.arcs){
            arc.setAttribute("stroke-width", `${this.toSvg(angleStrokeWidth)}`);
        }
        for(let prime of this.primes){
            prime.setAttribute("stroke-width", `${this.toSvg(angleStrokeWidth)}`);
        }
    }

    getCenterXY() : Vec2{
        // 交点
        return linesIntersection(this.lines[0], this.lines[1]);
    }

    matchArcs(){
        let num_arc = this.numArc();
        while(num_arc < this.arcs.length){
            let arc = this.arcs.pop()!;
            arc.parentElement!.removeChild(arc);
        }

        while(this.arcs.length < num_arc){
            let arc = document.createElementNS("http://www.w3.org/2000/svg","path");

            arc.setAttribute("fill", "none");
            arc.setAttribute("stroke", this.Color);
            arc.setAttribute("stroke-width", `${this.toSvg(angleStrokeWidth)}`);
            arc.style.cursor = "pointer";
    
            this.parentView.G0.appendChild(arc);
            this.arcs.push(arc);
        }

        let num_prime = this.numPrime();
        while(num_prime < this.primes.length){
            let prime = this.primes.pop()!;
            prime.parentElement!.removeChild(prime);
        }

        while(this.primes.length < num_prime){
            let prime = document.createElementNS("http://www.w3.org/2000/svg","line");
            prime.setAttribute("stroke", this.Color);
            prime.setAttribute("stroke-width", `${this.toSvg(angleStrokeWidth)}`);
            prime.style.cursor = "pointer";
    
            this.parentView.G0.appendChild(prime);
            this.primes.push(prime);
        }

        return [num_arc, num_prime];
    }

    drawRightAngle(p: Vec2, q1: Vec2, q2: Vec2){
        const r = this.toSvg(rightAngleLength);
        const p1 = p.add(q1.mul(r));
        const p2 = p.add(q2.mul(r));
        const p3 = p1.add(q2.mul(r));

        const ps = [[p1, p3], [p2, p3]];
        for(let [i, prime] of this.primes.entries()){
            prime.setAttribute("x1", `${ps[i][0].x}`);
            prime.setAttribute("y1", `${ps[i][0].y}`);
            prime.setAttribute("x2", `${ps[i][1].x}`);
            prime.setAttribute("y2", `${ps[i][1].y}`);
        }
    }

    drawAngleArc(){
        let [num_arc, num_prime] = this.matchArcs();

        const line1 = this.lines[0];
        const line2 = this.lines[1];

        // 交点
        const p = linesIntersection(this.lines[0], this.lines[1]);

        // 交点から線分上の点までの単位ベクトル
        const q1 = line1.handles[this.handleIdx[0]].pos.sub(p).unit();
        const q2 = line2.handles[this.handleIdx[1]].pos.sub(p).unit();

        if(this.Mark == AngleMark.rightAngle){
            // 直角の場合

            this.drawRightAngle(p, q1, q2);
            return;
        }

        let [ theta1, theta2, deltaTheta, largeArcSweepFlag] = calcLargeArcSweepFlag(q1, q2);


        for(let [i, arc] of this.arcs.entries()){

            const r = this.toSvg(angleRadius) * (1 + 0.1 * i);
            const p1 = p.add(q1.mul(r));
            const p2 = p.add(q2.mul(r));

            const d = `M${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArcSweepFlag} 1 ${p2.x} ${p2.y}`;

            arc.setAttribute("d", d);
        }

        for(let [i, prime] of this.primes.entries()){
            let theta = theta1 + deltaTheta * (i + 1) / (num_prime + 1);

            const r = this.toSvg(angleRadius);

            const x1 = p.x + r * 0.9 * Math.cos(theta);
            const y1 = p.y + r * 0.9 * Math.sin(theta);

            const x2 = p.x + r * 1.1 * Math.cos(theta);
            const y2 = p.y + r * 1.1 * Math.sin(theta);

            prime.setAttribute("x1", `${x1}`);
            prime.setAttribute("y1", `${y1}`);
            prime.setAttribute("x2", `${x2}`);
            prime.setAttribute("y2", `${y2}`);
        }
    }

    numArc(){
        switch(this.Mark){
            case AngleMark.rightAngle:
                return 0;
            case AngleMark.arc :
            case AngleMark.prime:
            case AngleMark.prime2:
            case AngleMark.prime3:
                return 1;
            case AngleMark.arc2:
                return 2;
            case AngleMark.arc3:
                return 3;
        }
    }

    numPrime(){
        switch(this.Mark){
            case AngleMark.rightAngle: return 2;
            case AngleMark.prime:   return 1;
            case AngleMark.prime2:  return 2;
            case AngleMark.prime3:  return 3;
            default:                return 0;
        }
    }

    processEvent =(sources: Shape[])=>{
        this.drawAngleArc();
        this.updateNamePos();
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        const line = this.parentView.getLine(ev);
        
        if(line != null){
            this.lines.push(line);

            this.downPos.push(pt);

            if(this.lines.length == 1){


                line.select(true);
            }
            else{

                // 交点
                const p = linesIntersection(this.lines[0], this.lines[1]);
                
                for(let [i, pt] of this.downPos.entries()){
                    const head_side = (0 < pt.sub(p).dot(this.lines[i].p12)  );
                    this.handleIdx.push(head_side ? 1 : 0);
                }       

                this.drawAngleArc();
        
                for(let line2 of this.lines){

                    line2.addListener(this);
                }

                this.finishTool();
            }
        }
    }

    pointermove = (ev: PointerEvent) : void => {
    }
}

export class Image extends CompositeShape {
    fileName: string = "";
    image: SVGImageElement;

    constructor(obj: any){
        super();
        super.make(obj);

        this.image = document.createElementNS("http://www.w3.org/2000/svg", "image") as SVGImageElement;

        this.image.setAttribute("preserveAspectRatio", "none");
        // setSvgImg(this.image, this.fileName);
        this.image.setAttributeNS('http://www.w3.org/1999/xlink','href', this.fileName);

        this.parentView.G0.appendChild(this.image);
    }

    app() : App{
        assert(false);
        return new App(actionRef("@"), []);        
    }

    makeObj() : any {
        return Object.assign(super.makeObj(), {
            fileName: this.fileName
        });
    }

    setEnable(enable: boolean){
        super.setEnable(enable);
        this.image.setAttribute("visibility", (enable ? "visible" : "hidden"));
    }

    summary() : string {
        return "画像";
    }

    load =(ev:Event)=>{

        let w: number;
        let h: number;

        if(this.handles.length == 2){

            w = Math.abs( this.handles[1].pos.x - this.handles[0].pos.x );
            h = Math.abs( this.handles[1].pos.y - this.handles[0].pos.y );
        }
        else{

            const rc = this.image.getBoundingClientRect();
            msg(`img loaded w:${rc.width} h:${rc.height}`);

            // 縦横比 = 縦 / 横
            const ratio = rc.height / rc.width;

            // viewBoxを得る。
            const vb = this.parentView.svg.viewBox.baseVal;

            // 縦横比を保って幅がsvgの半分になるようにする。
            w = vb.width / 2;
            h = ratio * vb.width / 2;
        }

        this.image.setAttribute("width", `${w}`);
        this.image.setAttribute("height", `${h}`);

        let pos = this.handles[0].pos;

        this.image.setAttribute("x", `${pos.x}`);
        this.image.setAttribute("y", `${this.getY() - h}`);

        if(this.handles.length == 1){

            this.addHandle(new Point({pos:new Vec2(pos.x + w, pos.y + h)}));
        }
    }

    getY() : number {
        return   this.handles[0].pos.y;
    } 

    processEvent =(sources: Shape[])=>{
        for(let src of sources){
            if(src == this.handles[0]){

                let pos = this.handles[0].pos;

                let w = this.image.width.baseVal.value;
                let h = this.image.height.baseVal.value;

                this.image.setAttribute("x", `${pos.x}`);
                this.image.setAttribute("y", `${this.getY() - h}`);

                let pt1 = this.handles[1];
                pt1.pos.x = pos.x + w;
                pt1.pos.y = pos.y + h;
                pt1.setPos();
            }
            else if(src == this.handles[1]){
                let pt0 = this.handles[0];
                let pt1 = this.handles[1];

                const w = pt1.pos.x - pt0.pos.x;
                const h = pt1.pos.y - pt0.pos.y;

                this.image.setAttribute("y", `${this.getY() - h}`);                
                this.image.setAttribute("width", `${w}`);
                this.image.setAttribute("height", `${h}`);
            }
            else{
                console.assert(false);
            }
        }
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        this.addHandle(this.clickHandle(ev, pt));

        this.image.setAttribute("x", "" + this.handles[0].pos.x);
        this.image.setAttribute("y", "" + this.handles[0].pos.y);
        this.finishTool();
    }
}

export class FuncLine extends Shape {  
    path: SVGPathElement;
    points: Vec2[] = [];
    Script: string = `    
    in  float idx;
    
    out float x;
    out float y;
    
    void main(void ) {
        x = -2.0 + 4.0 * idx / 16.0;
        y = x * x;
    }`;

    constructor(){
        super();

        this.path = document.createElementNS("http://www.w3.org/2000/svg","path");
        this.path.setAttribute("stroke-width", `${this.toSvg(strokeWidth)}`);

        this.path.setAttribute("fill", "none");
        this.path.setAttribute("stroke", this.Color);

        this.parentView.G0.appendChild(this.path);
    }

    app() : App{
        assert(false);
        return new App(actionRef("@"), []);        
    }

    makeObj() : any {
        return Object.assign(super.makeObj(), {
            Script: this.Script
        });
    }

    make(obj: any) : Widget {
        super.make(obj);

        return this;
    }

    propertyNames() : string[] {
        return [ "Script" ];
    }

    setScript(val: string){
        this.Script = val;
        this.drawPath();
    }

    click =(ev: MouseEvent, pt:Vec2): void => {
        this.finishTool();
    }

    drawPath(){
        const d0 = "M" + this.points.map(p => `${p.x},${p.y}`).join(" ");
        this.path.setAttribute("d", d0);
    }
}


function addPoint(v : Vec2){
    
}

function addLineSegment(p1 : Point, p2 : Point){

}


function addHalfLine(p1 : Point, p2 : Point){
    
}

function addCircle(p : Point, radius : number){
}

function addAngle(){
}

function setLength(p1 : Point, p2 : Point){

}

}