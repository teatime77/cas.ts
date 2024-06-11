namespace casts {
//
export class ViewM {
    width      : number = 0;
    height     : number = 0;
    svg : SVGSVGElement;
    svgRatio: number = 0;
    rect : DOMRect;

    divView : HTMLDivElement;
    div : HTMLDivElement;
    FlipY : boolean = true;


    constructor(width : number, height : number, x1 : number, y1 : number, x2 : number, y2 : number){
        this.width = width;
        this.height = height;

        this.divView = document.createElement("div");
        // this.divView.style.position = "relative";
        this.divView.style.padding = "0px";
        this.divView.style.width  = `${this.width}px`;
        this.divView.style.height = `${this.height}px`;
        // this.divView.style.zIndex = "1";
        // this.divView.style.cssFloat = "right";
        // this.divView.style.backgroundColor = "black";
        $div("movie-div").appendChild(this.divView);


        this.svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
        this.svg.style.backgroundColor = "cornsilk";
        this.svg.style.position = "sticky";
        this.svg.style.left = "0px";
        this.svg.style.top = "0px";
        this.svg.style.width  = `${this.width}px`;
        this.svg.style.height = `${this.height}px`;
        this.svg.setAttribute("viewBox", `${x1} ${y1} ${x2 - x1} ${y2 - y1}`);
        this.svg.setAttribute("transform", "scale(1, -1)");

        this.divView.appendChild(this.svg);

        this.rect = this.divView.getBoundingClientRect();
        this.div = document.createElement("div");
        this.div.style.position = "absolute";
        this.div.style.left = `${this.rect.x}px`;
        this.div.style.top  = `${this.rect.y}px`;
        this.div.style.width  = `${this.width}px`;
        this.div.style.height = `${this.height}px`;
        this.div.style.pointerEvents = "none";
        this.div.style.backgroundColor = "transparent";

        this.divView.appendChild(this.div);

        const rc = this.svg.getBoundingClientRect();
        this.svgRatio = this.svg.viewBox.baseVal.width / rc.width;
    }
    
    SvgToDomPos(v: Vec2) : Vec2 {
        var pt = this.svg.createSVGPoint();
        pt.x = v.x; 
        pt.y = v.y;

        const mat = this.svg.getScreenCTM()!;
        const loc : DOMPoint = pt.matrixTransform(mat);

        return new Vec2(loc.x, loc.y);
    }
}

export class ShapeM {
    name : string = "";
    caption : string = "";
    parentView! : ViewM;
    color : string = "black";
    focused : boolean = false;

    captionPos = new Vec2(0, 0);
    divCaption : HTMLDivElement | null = null;

    constructor(view : ViewM){
        this.parentView = view;
    }

    makeCaptionDiv(){
        assert(this.name != "");
        const caption = this.caption != "" ? this.caption : this.name;

        this.divCaption = document.createElement("div");
        this.divCaption.style.position = "absolute";
        this.divCaption.style.backgroundColor = "transparent";
        this.divCaption.style.cursor = "move";
        this.divCaption.style.pointerEvents = "all";
        this.divCaption.style.zIndex = "4";
        this.divCaption.style.color = this.color;
        this.divCaption.textContent = caption;

        let [x, y] = this.getCaptionXY();
        this.divCaption.style.left  = `${x}px`;
        this.divCaption.style.top   = `${y}px`;

        this.parentView.div.appendChild(this.divCaption);
    }

    focus(is_focused : boolean){
        this.focused = is_focused;
    }

    getCenterXY() : Vec2{
        throw new Error();
    }

    getCaptionXY(){
        const pos = this.getCenterXY();
        let p = this.parentView.SvgToDomPos(pos);
        p.x -= this.parentView.rect.x;
        p.y -= this.parentView.rect.y;

        return [p.x + this.captionPos.x, p.y + this.captionPos.y];
    }
}

}