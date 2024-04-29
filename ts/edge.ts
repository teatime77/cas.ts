namespace casts {

const scale = 1;
const textMargin = scale * 5;
const textBase = scale * 2;
const strokeWidth = scale * 1;
const fontSize = scale * 9;
const borderWidth = 3;
const eyeZ = 5000;
const levelGap = 100;
const levelOffset = 200;
const levelRadius = 600;
const pathC = 70;
const panelHeight = 30;

let theTree : Tree;

let edgeMap = new Map<string, Edge>();
let selectedDoc : Doc | null = null;

function edgeKey(doc1 : Doc, doc2 : Doc) : string {
    return `${doc1.id}:${doc2.id}`;
}
function getEdge(doc1 : Doc, doc2 : Doc) : Edge {
    const key = edgeKey(doc1, doc2);
    const edge = edgeMap.get(key)!;

    assert(edge != undefined);
    return edge;
}

function toVec2(pos : Vec3, eye : Vec3) : Vec2 {
    const v = pos.sub(eye);
    const x = 0.5 * theTree.viewWidth + v.x * eyeZ / -v.z;
    const y = v.y * eyeZ / -v.z;

    return new Vec2(x, y);
}

function dsp3(pos : Vec3) : string {
    const x = pos.x.toFixed();
    const y = pos.y.toFixed();
    const z = pos.z.toFixed();

    return `(${x} ${y} ${z})`;
}

function dsp2(pos : Vec3, eye : Vec3) : string {
    const pt = toVec2(pos, eye);
    return `(${pt.x.toFixed()} ${pt.y.toFixed()})`;
}

function addEdge(tree : Tree, src_doc : Doc, dst_doc : Doc){
    src_doc.dsts.push(dst_doc);
    dst_doc.srcs.push(src_doc);

    const edge = new Edge(tree, src_doc, dst_doc);
    const key = `${src_doc.id}:${dst_doc.id}`;
    edgeMap.set(key, edge);
}

function cancelLinkDocs(){
    if(selectedDoc != null){

        selectedDoc.setColor("black");
        selectedDoc = null;
    }
}

function linkDocs(doc : Doc){
    if(selectedDoc == null){
        selectedDoc = doc;
        selectedDoc.setColor("blue");
    }
    else{
        if(selectedDoc != doc){

            const key1 = edgeKey(selectedDoc, doc);
            const key2 = edgeKey(doc, selectedDoc);
            if(!edgeMap.has(key1) && !edgeMap.has(key2)){

                addEdge(theTree, selectedDoc, doc);
                theTree.initDocLevels();
                theTree.update(theTree.eye);
            }
        }

        cancelLinkDocs();
    }
}


function deselectAll(){
    theTree.docs.filter(x => x.selected).map(x => x.select(false));
    Array.from( edgeMap.values() ).map(x => x.select(false));
}

class Tree {
    svg : SVGSVGElement;
    viewWidth!  : number;
    viewHeight! : number;
    docs : Doc[];
    rows!: Doc[][];

    eye = new Vec3(0, 0, eyeZ);
    downEye! : Vec3;
    
    downX : number = NaN;
    downY : number = NaN;

    constructor(data : any){
        this.svg = $("map-svg") as any as SVGSVGElement;
        this.setViewSize();

        const doc_map = new Map<number, Doc>();
        for(const obj of data["docs"]){
            const doc = new Doc(obj["id"], obj["title"]);
            msg(`${doc.id} ${doc.title}`);
    
            doc_map.set(doc.id, doc);
        }
        this.docs = Array.from(doc_map.values());
    
        edgeMap = new Map<string, Edge>();
        for(const obj of data["edges"]){
            const src_doc = doc_map.get(obj["src"])!;
            const dst_doc = doc_map.get(obj["dst"])!;
    
            assert(src_doc != undefined && dst_doc != undefined);
    
            addEdge(this, src_doc, dst_doc);
    
            msg(`${src_doc.title} => ${dst_doc.title}`);
        }    

        this.docs.filter(x => x.srcs.length == 0 && x.dsts.length == 0).forEach(x => msg(`NG ${x.title}`));
        // this.docs = this.docs.filter(x => x.srcs.length != 0 || x.dsts.length != 0);
        this.docs.forEach(doc => doc.init(this));

        this.initDocLevels();
        
        this.setEventListener();
    }

    initDocLevels(){
        const roots = this.docs.filter(x => x.srcs.length == 0 && x.dsts.length != 0);
        do{
            levelChanged = false;
            roots.forEach(x => setDocLevel(x));
        } while(levelChanged);

        for(const doc of roots){
            const min_dst_level = Math.min(... doc.dsts.map(x => x.level));
            doc.level = min_dst_level - 1;
        }

        updateDocLevels(this.docs);
    
        this.docs.sort((a:Doc, b:Doc) => a.level - b.level);
        for(const doc of this.docs){
            msg(`${doc.level} ${doc.title}`);
        }
    
        const max_level = last(this.docs).level;
        this.rows = [];
        range(max_level + 1).forEach(x => this.rows.push([]));
        this.docs.forEach(doc => this.rows[doc.level].push(doc));

        for(const [i, row] of this.rows.entries()){
            for(const [j, doc] of row.entries()){
                const theta = 2 * Math.PI * j / row.length;
                const z = levelRadius * Math.cos(theta);
                const x = levelRadius * Math.sin(theta);

                const y = levelOffset + (max_level - doc.level) * levelGap;

                doc.setPos(x, y, z);
            }
        }        
    }

    setEventListener(){
        window.addEventListener("resize", this.onWindowResize.bind(this));
        this.svg.addEventListener("pointerdown", this.onPointerDown.bind(this));
        this.svg.addEventListener("pointerup"  , this.onPointerUp.bind(this));
        this.svg.addEventListener("pointermove", this.onPointerMove.bind(this));
        
        document.body.addEventListener("keydown", this.onKeyDown.bind(this));
    }

    onKeyDown(ev : KeyboardEvent){
        if(ev.key == "Escape"){
            deselectAll();
            cancelLinkDocs();
        }
    }

    setViewSize(){
        this.viewWidth  = document.documentElement.clientWidth  - 2 * borderWidth;
        this.viewHeight = document.documentElement.clientHeight - 2 * borderWidth - panelHeight;

        this.svg.style.width = `${this.viewWidth}px`;
        this.svg.style.height = `${this.viewHeight}px`;
    }

    onWindowResize(ev : UIEvent){
        this.setViewSize();
    }

    onPointerDown(ev: PointerEvent){
        ev.preventDefault(); 
        msg("pointer down");
        if(ev.ctrlKey){
            return;
        }

        if(ev.button == 0){

            this.downEye = this.eye.copy();
            this.downX = ev.offsetX;
            this.downY = ev.offsetY;
        }
        else{
            if(ev.button == 2){
                this.dmp();
            }

            this.downX = NaN;
            this.downY = NaN;
        }
    }

    onPointerUp(ev: PointerEvent){
        ev.preventDefault(); 
        msg("pointer up");

        if(isNaN(this.downX)){
            return;
        }

        this.eye.x -= ev.offsetX - this.downX;
        this.eye.y -= ev.offsetY - this.downY;

        this.update(this.eye);

        this.downX = NaN;
        this.downY = NaN;
    }

    onPointerMove(ev: PointerEvent){
        ev.preventDefault(); 

        if(isNaN(this.downX)){
            return;
        }

        const x = this.downEye.x - (ev.offsetX - this.downX);
        const y = this.downEye.y - (ev.offsetY - this.downY);
        const eye = new Vec3(x, y, this.downEye.z);

        this.update(eye);
    }

    update(eye : Vec3){
        this.docs.forEach(doc => doc.draw(eye));
        this.docs.forEach(doc => doc.setLinesPos(eye));
    }

    dmp(){
        for(const doc of this.docs){
            msg(`${dsp3(doc.pos)} ${dsp2(doc.pos, this.eye)} level:${doc.level} ${doc.title}`);
        }
    }
}

class Doc {
    id : number;
    title : string;
    dsts  : Doc[] = [];
    srcs  : Doc[] = [];
    // edges : Edge[] = [];
    level : number = 0;
    selected : boolean = false;

    text! : SVGTextElement;
    rect! : SVGRectElement;
    textBox! : DOMRect;

    pos    : Vec3 = new Vec3(0, 0, 0);
    pos2!  : Vec2;

    width  : number = NaN;
    height : number = NaN;

    constructor(id : number, title : string){
        this.id    = id;
        this.title = title;
    }

    init(tree: Tree){
        this.rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.rect.setAttribute("fill", "white");
        this.rect.setAttribute("stroke-width", `${strokeWidth}`);
        this.rect.setAttribute("rx", `10`);
        this.rect.setAttribute("ry", `10`);
        this.rect.setAttribute("stroke", "black");

        tree.svg.appendChild(this.rect);

        this.text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        this.text.setAttribute("stroke", "black");
        this.text.setAttribute("stroke-width", `${strokeWidth}`);
        this.text.setAttribute("font-size", `${fontSize}pt`);
        this.text.setAttribute("font-family", "serif");
        this.text.setAttribute("cursor", "pointer");
        this.text.textContent = this.title;

        tree.svg.appendChild(this.text);
        this.textBox = this.text.getBBox();

        this.width  = textMargin + this.textBox.width + textMargin;
        this.height = textMargin + this.textBox.height + textMargin;

        this.rect.setAttribute("width" , `${this.width}`);
        this.rect.setAttribute("height", `${this.height}`);

        this.text.addEventListener("click", this.onClick.bind(this));
    }

    setColor(color : string){
        this.rect.setAttribute("stroke", color);
        this.text.setAttribute("stroke", color);
    }

    select(selected : boolean){
        this.selected = selected;
        if(this.selected){

            this.text.setAttribute("stroke", "red");
            this.rect.setAttribute("stroke", "red");
        }
        else{

            this.text.setAttribute("stroke", "black");
            this.rect.setAttribute("stroke", "black");
        }
    }

    selectSrcs(done:Doc[]){
        if(done.includes(this)){
            return;
        }
        done.push(this);
        this.select(true);
        for(const doc of this.srcs){
            getEdge(doc, this).select(true);
            doc.selectSrcs(done);
        }
    }

    selectDsts(done:Doc[]){
        if(done.includes(this)){
            return;
        }
        done.push(this);
        this.select(true);
        for(const doc of this.dsts){
            getEdge(this, doc).select(true);
            doc.selectDsts(done);
        }
    }

    onClick(ev : MouseEvent){
        msg("click doc");
        if(ev.ctrlKey){
            linkDocs(this);
        }
        else{

            this.selectSrcs([]);
            this.selectDsts([]);
        }
    }

    setLinesPos(eye : Vec3){
        let pt1 = this.pos2.copy();
        pt1.x += 0.5 * this.width;
        for(const [i, dst] of this.dsts.entries()){
            let pt2 = dst.pos2.copy();
            pt2.x += 0.5 * dst.width;

            const path = getEdge(this, dst).path;

            let y1c : number;
            let y2c : number;

            pt2.y += dst.height;

            y1c = pt1.y - pathC;
            y2c = pt2.y + pathC;

            const d = `M ${pt1.x} ${pt1.y} C ${pt1.x} ${y1c}, ${pt2.x} ${y2c}, ${pt2.x} ${pt2.y}`;
            path.setAttribute("d", d);
        }
    }

    setPos(x : number, y : number, z : number){
        this.pos.x = x;
        this.pos.y = y;
        this.pos.z = z;
    }

    draw(eye : Vec3){
        const pos = this.pos.copy();

        this.pos2 = toVec2(pos, eye);

        this.text.setAttribute("x", `${this.pos2.x + textMargin}`);
        this.text.setAttribute("y", `${this.pos2.y + textBase + this.textBox.height}`);

        this.rect.setAttribute("x", `${this.pos2.x}`);
        this.rect.setAttribute("y", `${this.pos2.y}`);
    }
}

class Edge {
    src : Doc;
    dst : Doc;
    path : SVGPathElement;
    selected : boolean = false;

    constructor(tree : Tree, src : Doc, dst : Doc){
        this.src = src;
        this.dst = dst;

        this.path = document.createElementNS("http://www.w3.org/2000/svg","path");
        this.path.setAttribute("fill", "transparent");
        this.path.setAttribute("stroke", "black");

        tree.svg.insertBefore(this.path, tree.svg.firstChild);
    }

    select(selected : boolean){
        this.selected = selected;
        if(this.selected){

            this.path.setAttribute("stroke", "red");
        }
        else{

            this.path.setAttribute("stroke", "black");
        }
    }
}

export async function bodyOnLoadEdge(){
    const data = await fetchJson(`../data/edge.json`);

    theTree = new Tree(data);
    theTree.update(theTree.eye);
}

let levelChanged : boolean;

function setDocLevel(doc : Doc){
    for(const dst of doc.dsts){
        if(dst.level < doc.level + 1){
            dst.level = doc.level + 1;
            levelChanged = true;
        }
    }

    doc.dsts.forEach(x => setDocLevel(x));
}

function updateDocLevels(docs : Doc[]){
    let changed : boolean;
    do {
        const max_level = Math.max(... docs.map(doc => doc.level));
        const rows : Doc[][] = [];
        range(max_level + 1).forEach(x => rows.push([]));
        docs.forEach(doc => rows[doc.level].push(doc));

        changed = false;
        for(let level = max_level; 0 <= level; level--){
            for(const doc of rows[level]){
                if(doc.dsts.length != 0){
                    const min_level = Math.min(... doc.dsts.map(x => x.level));
                    if(doc.level < min_level - 1){
                        doc.level = min_level - 1;
                        changed = true;
                    }
                }
            }
        }

        docs.forEach(doc => doc.level < Math.min(... doc.dsts.map(x => x.level)));

    }while(changed);
}

export function copyMap(){
    const docs = theTree.docs.slice();
    docs.sort((a:Doc, b:Doc) => a.id - b.id);

    const lines : string[] = [];
    lines.push(`{`);
    lines.push(`  "docs" : [`);

    for(const [i,doc] of docs.entries()){
        const cm = (i == docs.length - 1 ? "" : ",");
        lines.push(`        { "id" : ${doc.id}, "title" : "${doc.title}" }${cm}`);
    }

    lines.push(`  ]`);
    lines.push(`  ,`);
    lines.push(`  "edges" : [`);

    const edges = Array.from(edgeMap.values());
    edges.sort((a:Edge, b:Edge) => edgeKey(a.src, a.dst).localeCompare( edgeKey(b.src, b.dst) ));

    for(const [i,edge] of edges.entries()){
        const cm = (i == edges.length - 1 ? "" : ",");
        lines.push(`        { "src" : ${edge.src.id}, "dst" : ${edge.dst.id} }${cm}`);
    }

    lines.push(`  ]`);
    lines.push(`}`);

    const text = lines.join("\r\n");

    navigator.clipboard.writeText(text)
    .then(
        () => { msg("clipboard successfully set"); },
        () => { msg("clipboard write failed");     },
    );
}
}