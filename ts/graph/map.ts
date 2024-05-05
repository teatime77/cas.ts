namespace casts {
//
const scale = 1;
const margin = scale * 10;
const textMargin = scale * 5;
const strokeWidth = scale * 1;
const fontSize = scale * 10;

const borderWidth = 3;

class Size {
    width : number;
    height : number;

    constructor(width : number, height : number){
        this.width  = width;
        this.height = height;
    }
}

enum Display {
    hide,
    title,
    partial,
    full,
    unknown
}

function displayText(display : Display) : string {
    switch(display){
    case Display.hide    : return "hide";
    case Display.title   : return "title";
    case Display.partial : return "partial";
    case Display.full    : return "full";
    case Display.unknown : return "unknown";
    }
}


export class MapSVG {
    svg : SVGSVGElement;
    root : Region;
    scale : number = 1;
    downX : number = NaN;
    downY : number = NaN;

    minX : number = 0;
    minY : number = 0;
    viewWidth!  : number;
    viewHeight! : number;

    constructor(obj : any){
        this.svg = $("map-svg") as any as SVGSVGElement;
        this.setViewSize();

        window.addEventListener("resize", this.onWindowResize.bind(this));

        this.root = new Region(this, obj);
    }

    setViewSize(){
        this.viewWidth  = document.documentElement.clientWidth  - 2 * borderWidth;
        this.viewHeight = document.documentElement.clientHeight - 2 * borderWidth;

        this.svg.style.width = `${this.viewWidth}px`;
        this.svg.style.height = `${this.viewHeight}px`;
    }

    onWindowResize(ev : UIEvent){
        this.setViewSize();
        this.update();
    }

    onPointerDown(ev: PointerEvent){
        ev.preventDefault(); 
        const x0 = (ev.offsetX - this.minX).toFixed();
        const y0 = (ev.offsetY - this.minY).toFixed();
        const x1 = ((ev.offsetX - this.minX)/this.scale).toFixed();
        const y1 = ((ev.offsetY - this.minY)/this.scale).toFixed();
        const x2 = ev.offsetX.toFixed();
        const y2 = ev.offsetY.toFixed();


        msg(`down scale:${mapSVG.scale.toFixed(2)} (${x0} ${y0}) (${x1} ${y1}) offset:(${x2} ${y2}) view:${this.viewWidth} ${this.viewHeight}`);

        if(ev.button == 0){

            this.downX = ev.offsetX;
            this.downY = ev.offsetY;
        }
        else{

            this.downX = NaN;
            this.downY = NaN;
        }
    }

    onPointerUp(ev: PointerEvent){
        ev.preventDefault(); 

        if(isNaN(this.downX)){
            return;
        }

        this.minX += ev.offsetX - this.downX;
        this.minY += ev.offsetY - this.downY;

        this.root.setXY(this.minX, this.minY);

        this.downX = NaN;
        this.downY = NaN;
    }

    onPointerMove(ev: PointerEvent){
        // タッチによる画面スクロールを止める
        ev.preventDefault(); 

        if(isNaN(this.downX)){
            return;
        }

        const x = this.minX + (ev.offsetX - this.downX);
        const y = this.minY + (ev.offsetY - this.downY);

        this.root.setXY(x, y);
    }

    BoundingFromScale(scale : number) : [number, number]{
        const bnd_x = 0.5 * (this.viewWidth  + 6) * (1.0 - scale);
        const bnd_y = 0.5 * (this.viewHeight + 6) * (1.0 - scale);

        return [bnd_x, bnd_y]
    }

    update(){
        this.root.clearSize();
        this.root.setWH();
        this.root.setAppearance();
        this.root.setXY(this.minX, this.minY);
        // this.root.dmp("");
    }
}

let itemId = 0;

abstract class MapItem {
    id : number;
    parent! : Region | MapSVG;
    display! : Display;
    ratio   : number = NaN;
    level! : number;
    title! : string;

    text! : SVGTextElement;
    rect! : SVGRectElement;
    visible : boolean = false;
    textBox! : DOMRect;

    left   : number = NaN;
    top    : number = NaN;
    width  : number = NaN;
    height : number = NaN;

    abstract setXY(x : number, y : number) : void;

    constructor(){
        this.id = itemId++;
    }

    getDisplay() : void {
        let ret : [Display, number];

        const depth = this.level - mapSVG.scale;
        if(2 < depth){
            ret = [Display.hide, 0];
        }
        else if(1 < depth){
            // 1 < depth <= 2
            ret = [Display.title, 2 - depth];
        }
        else{
            if(this instanceof TextMap){

                ret = [Display.title, 1];
            }
            else{

                if(0 < depth){
                    // 0 <= depth <= 1
                    ret = [Display.partial, 1 - depth];
                }
                else{
                    ret = [Display.full, 1];
                }
            }
        }
        assert(0 <= ret[1] && ret[1] <= 1);
        [this.display, this.ratio] = ret;

        this.visible = (this.display != Display.hide);
    }

    titleRatio() : number {
        assert(this.visible);
        if(this.display == Display.partial || this.display == Display.full){
            return 1;
        }
        else{
            return this.ratio;
        }
    }

    titleWidth() : number {
        assert(this.visible);
        return this.titleRatio() * (textMargin + this.textBox.width + textMargin);
    }

    titleHeight() : number {
        assert(this.visible);
        return this.titleRatio() * (textMargin + this.textBox.height + textMargin);
    }

    init(parent : Region | MapSVG, obj : any){
        this.parent = parent;
        this.title = obj["title"];

        this.text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        this.text.setAttribute("stroke", "black");
        this.text.setAttribute("stroke-width", `${strokeWidth}`);
        this.text.setAttribute("font-size", `${fontSize}pt`);
        this.text.setAttribute("font-family", "serif");
        this.text.textContent = this.title;

        this.rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.rect.setAttribute("fill", "transparent");
        this.rect.setAttribute("stroke-width", `${strokeWidth}`);
        this.rect.setAttribute("visibility", "hidden");
        this.rect.setAttribute("width" , `10000`);
        this.rect.setAttribute("height", `10000`);
        this.rect.setAttribute("rx", `10`);
        this.rect.setAttribute("ry", `10`);
        const color = (this instanceof Region ? "blue" : "black");
        this.rect.setAttribute("stroke", color);

        if(parent instanceof MapSVG){

            this.level = 1;
        }
        else{

            this.level = parent.level + 1;
        }

        if(this instanceof Region){

            this.svg.appendChild(this.text);
            this.svg.appendChild(this.rect);
        }
        else{

            parent.svg.appendChild(this.text);
            parent.svg.appendChild(this.rect);
        }

        this.textBox = this.text.getBBox();
    }

    setAppearance(){
        if(this.visible){
            assert(!isNaN(this.width) && !isNaN(this.height));

            if(this.display == Display.title){

                this.text.setAttribute("font-size", `${this.ratio * fontSize}pt`);
            }
            else{

                this.text.setAttribute("font-size", `${fontSize}pt`);
            }
            this.rect.setAttribute("width" , `${this.width}`);
            this.rect.setAttribute("height", `${this.height}`);

            if(this instanceof Region){
                if(this.display == Display.partial || this.display == Display.full){

                    this.children.forEach(x => x.setAppearance());
                }
            }
        }

        const value = this.visible ? "visible" : "hidden";

        this.text.setAttribute("visibility", value);
        this.rect.setAttribute("visibility", value);
    
        if(this instanceof Region){

            if(this.display == Display.partial || this.display == Display.full){

                this.svg.setAttribute("visibility", value);
            }
        }
    }

    clearSize(){
        this.getDisplay();
        this.left   = NaN;
        this.top    = NaN;
        this.width  = NaN;
        this.height = NaN;

        this.text.setAttribute("visibility", "hidden");
        this.rect.setAttribute("visibility", "hidden");

        if(this instanceof Region){
            this.svg.setAttribute("visibility", "hidden");

            this.children.forEach(x => x.clearSize());
        }
    }

    setWH() : Size {
        assert(this.visible);

        if(isNaN(this.width)){

            const title_width = this.titleWidth();
            const title_height = this.titleHeight();

            switch(this.display){
            case Display.hide:
                throw new Error();
            
            case Display.title:
                this.width  = title_width;
                this.height = title_height;
                break;
            
            case Display.partial:
            case Display.full:
                if(this instanceof Region){
                    const ratio_margin = this.ratio * margin;

                    const sizes = this.rows.map(row => row.map(item => item.setWH()));

                    const row_heights = sizes.map(row => Math.max(... row.map(item => item.height)));
                    const row_widths = sizes.map(row => sum(row.map(item => item.width)) + ratio_margin * (row.length + 1));

                    this.height = title_height + sum(row_heights) + ratio_margin * (row_heights.length + 1);
                    this.width  = Math.max(title_width, Math.max(... row_widths));
                }
                break;

            default:
                throw new Error();
            }
        }
        assert(!isNaN(this.width) && !isNaN(this.height));

        return new Size(this.width, this.height);
    }

    setXYAttribute(x : number, y : number){
        const title_ratio = this.titleRatio();

        this.text.setAttribute("x", `${x + title_ratio * textMargin}`);
        this.text.setAttribute("y", `${y + title_ratio * (textMargin + this.textBox.height)}`);

        this.rect.setAttribute("x", `${x}`);
        this.rect.setAttribute("y", `${y}`);
    }

    dmp(nest : string){
        if(nest == ""){
            msg(`scale:${mapSVG.scale.toFixed(2)} --------------------------------------------------`);
        }
        assert(this.visible && !isNaN(this.width) && !isNaN(this.height));
        const t = (this instanceof Region ? "reg" : "txt");
        const x = this.left.toFixed();
        const y = this.top.toFixed();
        const w = this.width.toFixed();
        const h = this.height.toFixed();
        msg(`${nest}${t} lvl:${this.level} id:${this.id} xywh:${x} ${y} ${w} ${h} ${this.title} ${displayText(this.display)} ${this.ratio.toFixed(2)}`);

        if(this instanceof Region){
            if(this.display == Display.partial || this.display == Display.full){

                nest += "    ";

                for(const row of this.rows){
                    for(const item of row){
                        item.dmp(nest);
                    }
                }
            }
        }
    }
    lines(nest : string){
        msg(`${nest}${this.title}`);
        if(this instanceof Region){
            nest += "  ";
            this.children.forEach(x => x.lines(nest));
        }
    }
}

class TextMap extends MapItem {
    constructor(parent : Region | MapSVG, obj : any){
        super();
        this.init(parent, obj);
    }

    setXY(x : number, y : number) : void {
        assert(this.visible);
        this.left = x;
        this.top  = y;

        this.setXYAttribute(x, y);
    }
}

class Region extends MapItem {
    svg : SVGSVGElement;
    children : MapItem[];
    rows : MapItem[][] = [];

    constructor(parent : Region | MapSVG, obj : any){
        super();
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        parent.svg.appendChild(this.svg);
        this.init(parent, obj);

        this.children = Array.from(obj["children"]).map(x => makeMap(this, x));

        for(let i = 0; i < this.children.length; i += 3){
            this.rows.push(this.children.slice(i, i + 3));
        }

        this.svg.addEventListener("wheel", this.onWheel.bind(this) );
    }

    onWheel(ev: WheelEvent){
        ev.stopPropagation();

        if(! this.visible){
            msg("wheel:svg0 hide");
            return;
        }

        const ox = ev.offsetX;
        const oy = ev.offsetY;
        const [x1, y1, w1, h1] = [this.left, this.top, this.width, this.height];
        if(w1 == 0 || h1 == 0){
            msg("wheel:svg1 hide");
            return;
        }

        const rx1 = ((ox - x1)/w1).toFixed(2);
        const ry1 = ((oy - y1)/h1).toFixed(2);
        assert(!isNaN((ox - x1)/w1) && !isNaN((oy - y1)/h1));

        if(0 < ev.deltaY){
            mapSVG.scale *= 1.02;
        }
        else{
            mapSVG.scale /= 1.02;
        }

        mapSVG.update();
        if(! this.visible){
            msg("wheel:svg2 hide");
            return;
        }

        const [x2, y2, w2, h2] = [this.left, this.top, this.width, this.height];
        if(w2 == 0 || h2 == 0){
            msg("wheel:svg3 hide");
            return;
        }

        // (ox - x1)/w1 = (ox - x2)/w2
        // (ox - x1)w2/w1 = ox - x2
        //    x2 = ox - (ox - x1)   w2 / w1
        const X2 = ox - (ox - x1) * w2 / w1;

        // (oy - y1)/h1 = (oy - y2)/h2
        // (oy - y1)h2/h1 = oy - y2
        //    y2 = oy - (oy - y1)   h2 / h1
        const Y2 = oy - (oy - y1) * h2 / h1;

        // const rx2 = (ox - X2)/w2;
        // const ry2 = (oy - y2)/h2;

        mapSVG.minX += X2 - x2;
        mapSVG.minY += Y2 - y2;
        mapSVG.root.setXY(mapSVG.minX, mapSVG.minY);

        const [x3, y3, w3, h3] = [this.left, this.top, this.width, this.height];
        assert(w3 != 0 && h3 != 0);

        const rx3 = ((ox - x3)/w3).toFixed(2);
        const ry3 = ((oy - y3)/h3).toFixed(2);
        assert(!isNaN((ox - x3)/w3) && !isNaN((oy - y3)/h3));

        msg(`wheel rxy1:${rx1} ${ry1} rxy3:${rx3} ${ry3} ${this.title}`)
    }

    setXY(x : number, y : number) : void {
        assert(this.visible);
        this.left = x;
        this.top  = y;

        this.setXYAttribute(x, y);

        if(this.display == Display.partial || this.display == Display.full){
            const ratio_margin = this.ratio * margin;

            let offset_y = y + this.titleHeight() + ratio_margin;

            for(const row of this.rows){
                let offset_x = x + ratio_margin;
                for(const item of row){
                    item.setXY(offset_x, offset_y);

                    offset_x += item.width + ratio_margin;
                }

                const max_height = Math.max(... row.map(item => item.height));
                offset_y += max_height + ratio_margin;
            }
        }
    }
}

function makeMap(parent : Region | MapSVG, obj : any){
    if(obj["children"] == undefined){
        return new TextMap(parent, obj);
    }
    else{
        return new Region(parent, obj);
    }
}

let mapSVG : MapSVG;

function lineToNestTitle(line : string) : [number, string] {
    if(line[0] != ' '){
        return [0, line];
    }

    const k = line.split('').findIndex(x => x != ' ');
    assert(k % 4 == 0);
    return [k / 4, line.substring(k)];
}

function lineToObj(nest_titles:[number, string][]) : [number, any] {
    const [nest, title] = nest_titles.shift()!;
    let obj : any = { "title" : title };

    while(nest_titles.length != 0 && nest < nest_titles[0][0]){
        const [nest2, obj2] = lineToObj(nest_titles);
        assert(nest + 1 == nest2);

        if(obj["children"] == undefined){
            obj["children"] = [];
        }
        obj["children"].push(obj2);
    }

    return [nest, obj];
}

function setMapEventListener(map : MapSVG){
    map.svg.addEventListener("pointerdown", map.onPointerDown.bind(map));
    map.svg.addEventListener("pointerup"  , map.onPointerUp.bind(map));
    map.svg.addEventListener("pointermove", map.onPointerMove.bind(map));
    // map.svg.addEventListener("wheel"      , map.onWheel.bind(map));
}

export async function bodyOnLoadMap(){
    // const map = await fetchJson(`../data/map.json`);

    const text = await fetchText(`../data/map.txt`);
    const lines = text.split('\r\n');
    const nest_titles = lines.map(x => lineToNestTitle(x));
    let map : any = {
        "title" : "",
        "children":[]
    };

    while(nest_titles.length != 0){
        const [nest, obj] = lineToObj(nest_titles);
        assert(nest == 0);
        map["children"].push(obj);
    }


    mapSVG = new MapSVG(map);
    mapSVG.update();
    msg(``);
    mapSVG.root.lines("");

    setMapEventListener(mapSVG);
}


}