namespace casts {
//
const scale = 0.2;
const margin = scale * 20;
const textMargin = scale * 5;
const strokeWidth = scale * 1;
const fontSize = scale * 10;
const rowWidthLimit = scale * 500;

const borderWidth = 3;

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
        const border = 3;

        const offsetX = ev.offsetX;
        const offsetY = ev.offsetY;
        msg("");
        msg(`offset:${offsetX.toFixed()} ${offsetY.toFixed()} min:${this.minX.toFixed()} ${this.minY.toFixed()} scale:${(100 * this.scale).toFixed(1)} view:${this.viewWidth} ${this.viewHeight}`);

        const bnd = this.svg.getBoundingClientRect();
        const bnd_x = 0.5 * (this.viewWidth  + 6) * (1.0 - this.scale);
        const bnd_y = 0.5 * (this.viewHeight + 6) * (1.0 - this.scale);
        msg(`bound:${bnd.x.toFixed()} ${bnd.y.toFixed()} ${bnd.width.toFixed()} ${bnd.height.toFixed()} bound-diff:${(bnd_x - bnd.x).toFixed()} ${(bnd_y - bnd.y).toFixed()}`);

        const cli_x = bnd.x + (border + offsetX) * this.scale;
        const cli_y = bnd.y + (border + offsetY) * this.scale;
        const cli_x_diff = (cli_x - ev.clientX).toFixed();
        const cli_y_diff = (cli_y - ev.clientY).toFixed();
        msg(`client:${ev.clientX.toFixed()} ${ev.clientY.toFixed()} client-diff:${cli_x_diff} ${cli_y_diff}`);

        // client = bound + (border + offset) * scale
        // offset = (client - bound) / scale - border
        // bound = 0.5 * (view + 2 * border) * (1 - scale)

        if(0 < ev.deltaY){
            this.scale *= 1.05;
        }
        else{
            this.scale /= 1.05;
        }

        const Cx = offsetX - this.minX;
        const Cy = offsetY - this.minY;

        const [bnd_x2, bnd_y2] = this.BoundingFromScale(this.scale);

        const offset_x2 = (ev.clientX - bnd_x2) / this.scale - border;
        const offset_y2 = (ev.clientY - bnd_y2) / this.scale - border;

        this.minX = offset_x2 - Cx;
        this.minY = offset_y2 - Cy;
        
        this.svg.setAttribute("transform", `scale(${this.scale}, ${this.scale})`);

        this.root.svg.setAttribute("x", `${this.minX}`);
        this.root.svg.setAttribute("y", `${this.minY}`);

        msg(`bnd2:${bnd_x2.toFixed()} ${bnd_y2.toFixed()} offset2:${offset_x2.toFixed()} ${offset_y2.toFixed()}`)
    }
}

abstract class MapItem {
    title! : string;

    text! : SVGTextElement;
    rect! : SVGRectElement;
    textBox! : DOMRect;
    left  : number = 0;
    top   : number = 0;
    width!  : number;
    height! : number;

    init(parent : Region | MapSVG, obj : any){
        this.title = obj["title"];

        this.text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        this.text.setAttribute("x", `10000`);
        this.text.setAttribute("y", `10000`);
        this.text.setAttribute("stroke", "black");
        this.text.setAttribute("stroke-width", `${strokeWidth}`);
        this.text.setAttribute("font-size", `${fontSize}`);
        this.text.textContent = this.title;

        this.rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.rect.setAttribute("fill", "transparent");
        this.rect.setAttribute("stroke", "black");
        this.rect.setAttribute("stroke-width", `${strokeWidth}`);
        // this.rect.setAttribute("fill-opacity", `0`);      

        if(this instanceof Region){

            this.svg.appendChild(this.text);
            this.svg.appendChild(this.rect);
        }
        else{

            parent.svg.appendChild(this.text);
            parent.svg.appendChild(this.rect);
        }

        this.textBox = this.text.getBBox();

        this.setWH(this.textBox.width, this.textBox.height);
    }

    calcSize(){        
    }

    setXY(x : number, y : number){
        this.left = x;
        this.top  = y;

        this.text.setAttribute("x", `${textMargin + x}`);
        this.text.setAttribute("y", `${y + this.textBox.height}`);

        this.rect.setAttribute("x", `${x}`);
        this.rect.setAttribute("y", `${y}`);
    }

    setWH(width : number, height : number){        
        if(this instanceof TextMap){

            this.width  = textMargin + width  + textMargin;
            this.height = textMargin + height + textMargin;
        }
        else{

            this.width = width;
            this.height = height;
        }

        this.rect.setAttribute("width" , `${this.width}`);
        this.rect.setAttribute("height", `${this.height}`);
    }

    dmp(nest : string){
        msg(`${nest}item ${this.left.toFixed()} ${this.top.toFixed()} ${this.title}`);
    }
}

class TextMap extends MapItem {
    constructor(parent : Region | MapSVG, obj : any){
        super();
        this.init(parent, obj);
    }
}

class Region extends MapItem {
    svg : SVGSVGElement;
    children : MapItem[];

    constructor(parent : Region | MapSVG, obj : any){
        super();
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        parent.svg.appendChild(this.svg);
        this.init(parent, obj);

        this.children = Array.from(obj["children"]).map(x => makeMap(this, x));
    }

    calcSize(){
        this.children.forEach(x => x.calcSize());

        let row_top = margin + this.textBox.height + margin;

        let max_row_width = margin + this.textBox.width + margin;

        let pending = this.children.slice();
        while(pending.length != 0){

            let row : MapItem[] = [];
            let row_left = margin;
            while(pending.length != 0){
                const item = pending.shift()!;

                if(row.length != 0 && rowWidthLimit < row_left + item.width + margin){
                    pending.unshift(item);
                    break;
                }

                item.setXY(row_left, row_top);

                row_left += item.width + margin;
                row.push(item);
            }

            const row_width = sum(row.map(x => x.width)) + margin * (row.length + 1);

            if(max_row_width < row_width){

                max_row_width = row_width;
            }

            const row_height = Math.max( ... row.map(x => x.height) );
            row_top += row_height + margin;
        }

        this.setWH(max_row_width, row_top);
    }

    setXY(x : number, y : number){        
        this.left = x;
        this.top  = y;

        this.svg.setAttribute("x", `${x}`);
        this.svg.setAttribute("y", `${y}`);

        this.text.setAttribute("x", `${margin}`);
        this.text.setAttribute("y", `${margin}`);
    }

    dmp(nest : string){
        msg(`${nest}group ${this.left.toFixed()} ${this.top.toFixed()} ${this.title}`);

        nest += "    ";
        this.children.forEach(x => x.dmp(nest));

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

    mapSVG.root.calcSize();
    mapSVG.root.setXY(0, 0);

    mapSVG.root.dmp("");

    setMapEventListener(mapSVG);
}


}