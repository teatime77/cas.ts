namespace casts {
//
const margin = 20;
const textMargin = 5;


class MapSVG {
    svg : SVGSVGElement;
    // g : SVGGElement;
    // g : SVGGElement;
    root : Region;

    constructor(obj : any){
        this.svg = $("map-svg") as any as SVGSVGElement;

        // this.g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        // this.svg.appendChild(this.g);

        this.root = new Region(this, obj);
        // this.svg.setAttribute("transform", "scale(1, -1)");

        const box = this.drawText(0, 0, "こんにちは");
        this.drawRect(box.x, box.y, box.width, box.height);
    }

    drawRect(x : number, y : number, width : number, height : number){
        const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
        rect.setAttribute("x", `${x}`);
        rect.setAttribute("y", `${y}`);
        rect.setAttribute("width", `${width}`);
        rect.setAttribute("height", `${height}`);
        rect.setAttribute("fill", "transparent");
        rect.setAttribute("stroke", "black");
        rect.setAttribute("stroke-width", `1`);

        this.svg.appendChild(rect);
    }

    drawText(x : number, y : number, str : string) : DOMRect {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", `${x}`);
        text.setAttribute("y", `${y}`);
        // text.setAttribute("width", `50`);
        // text.setAttribute("height", `20`);
        // text.setAttribute("fill", "transparent");
        text.setAttribute("stroke", "black");
        text.setAttribute("stroke-width", `1`);
        text.setAttribute("font-size", "10");
        text.textContent = str;
        // text.setAttribute("transform", "scale(1, -1)");

        this.svg.appendChild(text);

        const box = text.getBBox();
        return box;
    }
}

abstract class MapItem {
    title : string;

    text : SVGTextElement;
    rect : SVGRectElement;
    textBox : DOMRect;
    left  : number = 0;
    top   : number = 0;
    width!  : number;
    height! : number;

    constructor(parent : Region | MapSVG, obj : any){
        this.title = obj["title"];

        this.text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        this.text.setAttribute("x", `10000`);
        this.text.setAttribute("y", `10000`);
        this.text.setAttribute("stroke", "black");
        this.text.setAttribute("stroke-width", `1`);
        this.text.setAttribute("font-size", "10");
        this.text.textContent = this.title;

        this.rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.rect.setAttribute("stroke", "black");
        this.rect.setAttribute("stroke-width", `1`);
        this.rect.setAttribute("fill-opacity", `0`);      

        parent.svg.appendChild(this.text);
        parent.svg.appendChild(this.rect);

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

        msg(`item ${x} ${y} ${this.title}`);
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
        super(parent, obj);
    }
}

class Region extends MapItem {
    // g : SVGGElement;
    svg : SVGSVGElement;
    children : MapItem[];

    constructor(parent : Region | MapSVG, obj : any){
        super(parent, obj);
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        if(parent instanceof Region){

            parent.svg.appendChild(this.svg);
        }
        else{

            parent.svg.appendChild(this.svg);
        }

        let files : MapItem[] = [];
        let dirs     : MapItem[] = [];
        if(obj["files"] != undefined){
            files = Array.from(obj["files"]).map(x => makeMap(this, x));
        }
        if(obj["dirs"] != undefined){
            dirs = Array.from(obj["dirs"]).map(x => makeMap(this, x));
        }

        this.children = files.concat(dirs);
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
        // this.g.setAttribute("transform", `translate(${x} ${y})`);

        this.text.setAttribute("x", `${margin}`);
        this.text.setAttribute("y", `${margin}`);

        msg(`group ${x} ${y} ${this.title}`);
    }

    dmp(nest : string){
        msg(`${nest}group ${this.left.toFixed()} ${this.top.toFixed()} ${this.title}`);

        nest += "    ";
        this.children.forEach(x => x.dmp(nest));

    }
}

function makeMap(parent : Region | MapSVG, obj : any){
    if(obj["dirs"] == undefined){
        return new TextMap(parent, obj);
    }
    else{
        return new Region(parent, obj);
    }
}

let mapSVG : MapSVG;

export async function bodyOnLoadMap(){
    const map = await fetchJson(`../data/map.json`);
    msg(`map : ${map}`);
    mapSVG = new MapSVG(map);

    mapSVG.root.calcSize();
    mapSVG.root.setXY(0, 0);

    mapSVG.root.dmp("");

    dmpSvg(mapSVG.root.svg, "");
}

function dmpSvg(item : SVGElement, nest : string){
    const x = parseFloat(item.getAttribute("x")!).toFixed();
    const y = parseFloat(item.getAttribute("y")!).toFixed();
    
    if(item instanceof SVGTextElement){

        msg(`${nest}${item.textContent} ${x} ${y}`);
    }
    else{
        msg(`${nest}${item.tagName} ${x} ${y}`);
    }

    nest += "    ";
    for(const c of item.children){
        dmpSvg(c as SVGElement, nest);
    }
}

}