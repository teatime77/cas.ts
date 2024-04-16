namespace casts {
//
const margin = 20;
const textMargin = 5;
const border_width = 3;

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

        this.viewWidth = document.documentElement.clientWidth   - 2 * border_width;
        this.viewHeight = document.documentElement.clientHeight - 2 * border_width;

        this.svg.style.width = `${this.viewWidth}px`;
        this.svg.style.height = `${this.viewHeight}px`;

        this.updateViewBox(0, 0);

        this.root = new Region(this, obj);
    }

    getViewBox(dx : number, dy : number) : [number, number, number, number] {
        const x = this.minX + dx * this.scale;
        const y = this.minY + dy * this.scale;
        const w = this.viewWidth  * this.scale;
        const h = this.viewHeight * this.scale;

        return [x, y, w, h];
    }

    updateViewBox(dx : number, dy : number){
        const [x, y, w, h] = this.getViewBox(dx, dy);
        this.svg.setAttribute("viewBox", `${x.toFixed()} ${y.toFixed()} ${w.toFixed()} ${h.toFixed()}`);         
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

        this.minX -= (ev.offsetX - this.downX) * this.scale;
        this.minY -= (ev.offsetY - this.downY) * this.scale;

        this.updateViewBox(0, 0);

        this.downX = NaN;
        this.downY = NaN;
    }

    onPointerMove(ev: PointerEvent){
        // タッチによる画面スクロールを止める
        ev.preventDefault(); 

        if(isNaN(this.downX)){
            return;
        }

        const client_dx = ev.offsetX - this.downX;
        const client_dy = ev.offsetY - this.downY;

        this.updateViewBox(-(ev.offsetX - this.downX), -(ev.offsetY - this.downY));
    }

    onWheel(ev: WheelEvent){
        const [min_x, min_y, view_w, view_h] = this.getViewBox(0, 0);

        const rx = ev.offsetX / this.viewWidth;
        const ry = ev.offsetY / this.viewHeight;

        const x = min_x + rx * view_w;
        const y = min_y + ry * view_h;

        if(0 < ev.deltaY){
            this.scale *= 1.05;
        }
        else{
            this.scale /= 1.05;
        }

        const [min_x2, min_y2, view_w2, view_h2] = this.getViewBox(0, 0);

        this.minX = x - rx * view_w2;
        this.minY = y - ry * view_h2;

        if(view_w2 < this.viewWidth){
            this.minX = 0;
        }
        if(view_h2 < this.viewHeight){
            this.minY = 0;
        }

        this.updateViewBox(0, 0);

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
        this.text.setAttribute("stroke-width", `1`);
        this.text.setAttribute("font-size", "10");
        this.text.textContent = this.title;

        this.rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.rect.setAttribute("fill", "transparent");
        this.rect.setAttribute("stroke", "black");
        this.rect.setAttribute("stroke-width", `1`);
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
    // g : SVGGElement;
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
        const row_width_limit = 500;
        this.children.forEach(x => x.calcSize());

        let row_top = margin + this.textBox.height + margin;

        let max_row_width = margin + this.textBox.width + margin;

        let pending = this.children.slice();
        while(pending.length != 0){

            let row : MapItem[] = [];
            let row_left = margin;
            while(pending.length != 0){
                const item = pending.shift()!;

                if(row.length != 0 && row_width_limit < row_left + item.width + margin){
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