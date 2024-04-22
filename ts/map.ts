namespace casts {
//
const scale = 1;
const margin = scale * 20;
const textMargin = scale * 5;
const strokeWidth = scale * 1;
const fontSize = scale * 16;

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
    viewWidth : number;
    viewHeight : number;

    constructor(obj : any){
        this.svg = $("map-svg") as any as SVGSVGElement;

        this.viewWidth  = document.documentElement.clientWidth  - 2 * borderWidth;
        this.viewHeight = document.documentElement.clientHeight - 2 * borderWidth;

        this.svg.style.width = `${this.viewWidth}px`;
        this.svg.style.height = `${this.viewHeight}px`;

        this.root = new Region(this, obj);
    }

    onPointerDown(ev: PointerEvent){
        ev.preventDefault(); 

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

        this.minX -= ev.offsetX - this.downX;
        this.minY -= ev.offsetY - this.downY;

        this.setViewBox(this.minX, this.minY);
        // this.root.svg.setAttribute("x", `${this.minX}`);
        // this.root.svg.setAttribute("y", `${this.minY}`);

        this.downX = NaN;
        this.downY = NaN;
    }

    onPointerMove(ev: PointerEvent){
        // タッチによる画面スクロールを止める
        ev.preventDefault(); 

        if(isNaN(this.downX)){
            return;
        }

        const x = this.minX - (ev.offsetX - this.downX);
        const y = this.minY - (ev.offsetY - this.downY);

        this.setViewBox(x, y);
        // this.root.svg.setAttribute("x", `${x}`);
        // this.root.svg.setAttribute("y", `${y}`);
    }

    BoundingFromScale(scale : number) : [number, number]{
        const bnd_x = 0.5 * (this.viewWidth  + 6) * (1.0 - scale);
        const bnd_y = 0.5 * (this.viewHeight + 6) * (1.0 - scale);

        return [bnd_x, bnd_y]
    }

    onWheel(ev: WheelEvent){
        if(0 < ev.deltaY){
            this.scale *= 1.02;
        }
        else{
            this.scale /= 1.02;
        }

        this.update();
    }

    setViewBox(x : number, y : number){
        const w = this.viewWidth ;// / this.scale;
        const h = this.viewHeight;// / this.scale 
        this.svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
    }

    update(){
        this.root.clearSize();
        this.root.setWH();
        this.root.setAppearance();
        this.setViewBox(this.minX, this.minY);
        this.root.setXY(0, 0);
        this.root.dmp("");
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
        // if(this.display == Display.hide){

        //     this.visible = false;
        // }
        // else{

        //     this.visible = (this.parent instanceof MapSVG || this.parent.visible);
        // }
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
        this.rect.setAttribute("stroke", "black");
        this.rect.setAttribute("stroke-width", `${strokeWidth}`);
        // this.rect.setAttribute("fill-opacity", `0`);      
        this.rect.setAttribute("visibility", "hidden");
        this.rect.setAttribute("width" , `10000`);
        this.rect.setAttribute("height", `10000`);

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
    }

    setXY(x : number, y : number) : void {
        assert(this.visible);
        this.left = x;
        this.top  = y;

        this.svg.setAttribute("x", `${x}`);
        this.svg.setAttribute("y", `${y}`);

        this.setXYAttribute(0, 0);

        if(this.display == Display.partial || this.display == Display.full){
            const ratio_margin = this.ratio * margin;

            let offset_y = this.titleHeight() + ratio_margin;

            for(const row of this.rows){
                let offset_x = ratio_margin;
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

export async function bodyOnLoadMap(){
    const map = await fetchJson(`../data/map.json`);
    mapSVG = new MapSVG(map);
    mapSVG.update();

    setMapEventListener(mapSVG);
}


}