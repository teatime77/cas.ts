namespace casts {
//
const scale = 1;
const margin = scale * 20;
const textMargin = scale * 5;
const strokeWidth = scale * 1;
const fontSize = scale * 16;
const rowWidthLimit = scale * 500;

const borderWidth = 3;

function F(x : number) : string {
    return x.toFixed();
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

        this.minX += ev.offsetX - this.downX;
        this.minY += ev.offsetY - this.downY;

        this.root.svg.setAttribute("x", `${this.minX}`);
        this.root.svg.setAttribute("y", `${this.minY}`);

        this.downX = NaN;
        this.downY = NaN;
    }

    onPointerMove(ev: PointerEvent){
        // タッチによる画面スクロールを止める
        ev.preventDefault(); 

        if(isNaN(this.downX)){
            return;
        }

        const x = this.minX + ev.offsetX - this.downX;
        const y = this.minY + ev.offsetY - this.downY;

        this.root.svg.setAttribute("x", `${x}`);
        this.root.svg.setAttribute("y", `${y}`);
    }

    BoundingFromScale(scale : number) : [number, number]{
        const bnd_x = 0.5 * (this.viewWidth  + 6) * (1.0 - scale);
        const bnd_y = 0.5 * (this.viewHeight + 6) * (1.0 - scale);

        return [bnd_x, bnd_y]
    }

    onWheel(ev: WheelEvent){
        if(0 < ev.deltaY){
            this.scale *= 1.01;
        }
        else{
            this.scale /= 1.01;
        }

        this.update();
    }

    update(){
        this.root.clearSize();
        this.root.getWidth();
        this.root.getHeight();
        this.root.setAppearance();
        this.root.setXY(this.minX, this.minY);
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

    abstract getWidth() : number;
    abstract getHeight() : number;
    abstract setXY(x : number, y : number) : void;

    constructor(){
        this.id = itemId++;
    }

    getDisplay() : void {
        let ret : [Display, number];

        const depth = this.level - mapSVG.scale;
        if(3 < depth){
            ret = [Display.hide, 0];
        }
        else if(1 < depth){
            // 1 < depth <= 3
            const r = 0.5 * (depth - 1);
            ret = [Display.title, 1 - r];
        }
        else{
            if(this instanceof TextMap){

                ret = [Display.full, 1];
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

        if(ret[1] == 0){

            this.visible = false;
        }
        else{

            this.visible = (this.parent instanceof MapSVG || this.parent.visible);
        }

        [this.display, this.ratio] = ret;
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
            assert(this.ratio != 0 && !isNaN(this.width) && !isNaN(this.height));

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

            if(this.display == Display.partial || this.display == Display.full){

                this.visibleRows = this.rows.map(row => row.filter(item => item.visible));
                this.visibleRows = this.visibleRows.filter(row => row.length != 0);
            }
            else{
                this.visibleRows = [];
            }
        }
    }

    margin() : number {
        return this.ratio * margin;
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
            nest += "    ";

            for(const row of this.visibleRows){
                for(const item of row){
                    item.dmp(nest);
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

    getWidth() : number {
        assert(this.visible);

        if(isNaN(this.width)){

            this.width = this.titleWidth();
        }

        assert(!isNaN(this.width));
        return this.width;
    }

    getHeight() : number {
        assert(this.visible);

        if(isNaN(this.height)){

            this.height = this.titleHeight();
        }

        assert(!isNaN(this.height));
        return this.height;
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
    visibleRows! : MapItem[][];

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

    getWidth() : number {
        assert(this.visible);

        if(isNaN(this.width)){

            let title_width = this.titleWidth();

            switch(this.display){
            case Display.title:
                this.width = title_width;
                break;

            case Display.partial:
            case Display.full:
                if(this.visibleRows.length == 0){

                    this.width = title_width;
                }
                else{

                    let row_widths = this.visibleRows.map(row => sum(row.map(item => item.getWidth())) + margin * this.ratio * (row.length + 1));
                    row_widths.unshift(title_width);

                    this.width = Math.max(... row_widths);
                }
                break;

            default:
                assert(false);
                break;
            }
        }

        assert(!isNaN(this.width));
        return this.width;
    }

    getHeight() : number {
        assert(this.visible);

        if(isNaN(this.height)){

            let title_height = this.titleHeight();

            switch(this.display){
            case Display.title:
                this.height = title_height;
                break;

            case Display.partial:
            case Display.full:
                if(this.visibleRows.length == 0){

                    this.height = title_height;
                }
                else{

                    const row_heights = this.visibleRows.map(row => Math.max(... row.map(item => item.getHeight())));
                    const row_heights_sum = sum(row_heights);
                    this.height = title_height + row_heights_sum + this.ratio * margin * (this.visibleRows.length + 1);
                }
                break;

            default:
                assert(false);
                break;
            }
        }

        assert(!isNaN(this.height));
        return this.height;
    }

    setXY(x : number, y : number) : void {
        assert(this.visible);
        this.left = x;
        this.top  = y;

        this.svg.setAttribute("x", `${x}`);
        this.svg.setAttribute("y", `${y}`);

        assert(this.ratio != 0);
        const r_margin = this.ratio * margin;

        this.setXYAttribute(0, 0);

        if(this.display == Display.partial || this.display == Display.full){

            let offset_y = this.titleHeight() + r_margin;

            for(const row of this.visibleRows){
                let offset_x = r_margin;
                for(const item of row){
                    item.setXY(offset_x, offset_y);

                    offset_x += item.width + r_margin;
                }

                const max_height = Math.max(... row.map(item => item.height));
                offset_y += max_height + r_margin;
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