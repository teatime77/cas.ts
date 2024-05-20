declare var Viz: any;

namespace casts {
let showSubgraph : boolean = true;

class Graph {
    docs : Doc[];
    edgeMap = new Map<string, Edge>();
    sections : Section[];
    selections : Doc[] = [];

    constructor(docs : Doc[], sections : Section[], edge_map : Map<string, Edge>){
        this.docs  = docs;
        this.sections = sections;
        this.edgeMap = edge_map;
    }

    edges() : Edge[]{
        return Array.from(this.edgeMap.values());
    }

    makeRanks(ranks : string[], docs : Doc[]){
        const max_level = Math.max(... docs.map(x => x.level));
        for(let level = 0; level < max_level; level++){
            const same_docs = docs.filter(doc => doc.level == level);
            if(same_docs.length != 0){

                const id_list = same_docs.map(doc => `b${doc.id};`).join(" ");
                const rank = `{rank = same; ${id_list}}`
                ranks.push(rank);
            }
        }
    }

    async makeViz(){
        let doc_map = new Map<string, Doc>();
        this.docs.forEach(doc => doc_map.set(`${doc.id}`, doc));

        let sec_map = new Map<string, Section>();
        this.sections.forEach(sec => sec_map.set(`s${sec.id}`, sec));

        let docLines  : string[] = [];
        let secLines  : string[] = [];
        let edgeLines : string[] = [];

        if(showSubgraph){
            this.docs.filter(doc => doc.section == undefined).forEach(doc => doc.makeDot(docLines));
            this.sections.forEach(sec => sec.makeDot(secLines));
        }
        else{
            this.docs.forEach(doc => doc.makeDot(docLines));
        }

        this.edges().forEach(edge => edge.makeDot(edgeLines));

        const ranks : string[] = [];

        let dot = `
        digraph graph_name {
            graph [
                rankdir = BT;
                charset = "UTF-8";
            ];
            ${docLines.join('\n')}
            ${secLines.join('\n')}
            ${edgeLines.join('\n')}
            ${ranks.join('\n')}
        }
        `;

        const viz = await Viz.instance();
        // Viz.instance().then(function(viz:any) {
            var svg = viz.renderSVGElement(dot) as SVGSVGElement;

            svg.addEventListener("contextmenu", onMenu);
            svg.addEventListener("click", graph.onClick.bind(graph));

            const nodes = Array.from(svg.getElementsByClassName("node doc")) as SVGGElement[];
            for(const g of nodes){
                const doc = doc_map.get(g.id);
                if(doc == undefined){

                    msg(`node NG: ${g.id} [${g.textContent}]`);
                }
                else{
                    g.addEventListener("click", doc.onVizClick.bind(doc));

                    const ellipses = g.getElementsByTagName("ellipse");
                    if(ellipses.length == 1){
                        doc.ellipse = ellipses.item(0)!;
                    }
                }

                g.setAttribute("cursor", "pointer");
            }


            const edges = Array.from(svg.getElementsByClassName("edge")) as SVGGElement[];
            for(const g of edges){
                const edge = this.edgeMap.get(g.id);
                if(edge == undefined){

                    msg(`edge NG: ${g.id} [${g.textContent}]`);
                }
                else{
                    g.addEventListener("click", edge.onEdgeClick.bind(edge));

                    const paths = g.getElementsByTagName("path");
                    if(paths.length == 1){
                        edge.path = paths.item(0)!;
                    }
                    else{
                        msg(`edge no path: ${g.id} ${paths.length} [${g.textContent}]`);                        
                    }
                }

                g.setAttribute("cursor", "pointer");
            }

            if(showSubgraph){

                for(const [id, sec] of sec_map.entries()){
                    const g = svg.getElementById(id) as SVGGElement;
                    assert(g != undefined);
                    g.addEventListener("click", sec.onSectionClick.bind(sec));
                    g.addEventListener("contextmenu", sec.onSectionMenu.bind(sec));

                    const polygons = g.getElementsByTagName("polygon");
                    if(polygons.length == 1){
                        sec.polygon = polygons.item(0)!;
                    }

                    g.setAttribute("cursor", "pointer");
                }
            }

            const map_div = $div("map-div");
            map_div.innerHTML = "";

            map_div.appendChild(svg);

            const rc = svg.getBoundingClientRect();

            map_div.style.width = `${rc.width.toFixed()}px`;
            map_div.style.height = `${rc.height.toFixed()}px`;
        // });
    }


    async onKeyDown(ev : KeyboardEvent){
        msg(`key down:${ev.key}`);
        
        if(ev.key == "Escape"){
            this.clearSelections();
        }
        else if(ev.key == "Delete"){

            const selected_edges = this.edges().filter(edge => edge.selected);
            if(selected_edges.length != 0){

                if(window.confirm("Do you really want to delete?")) {
                    selected_edges.forEach(edge => this.edgeMap.delete(edge.key()));

                    this.clearSelections();

                    await updateGraph();
                }
            }
        }
    }

    clearSelections(){
        this.docs.filter(doc => doc.selected).forEach(doc => doc.select(false));
        this.selections = [];
        
        this.edges().filter(edge => edge.selected).forEach(edge => edge.select(false));
    }

    addDoc(title : string) : Doc {
        let next_id = 1;
        for(const doc of this.docs){
            if(next_id < doc.id){
                break;
            }
            next_id++;
        }
        const doc = new Doc(next_id, title);
        this.docs.push(doc);

        this.docs.sort((a:Doc, b:Doc) => a.id - b.id);

        return doc;
    }

    addSection(title : string){
        let next_id = 1;
        for(const sec of this.sections){
            if(next_id < sec.id){
                break;
            }
            next_id++;
        }

        const section = new Section(next_id, title);
        this.sections.push(section);

        this.docs.filter(x => x.selected).forEach(x => x.section = section);
        this.clearSelections();
    }

    async removeFromSection(ev : MouseEvent){
        this.docs.filter(x => x.selected).forEach(x => x.section = undefined);
        this.clearSelections();

        await updateGraph();
    }

    async connectEdge(ev : MouseEvent){
        if(this.sections.length < 2){
            return;
        }

        for(let i = 0; i + 1 < this.selections.length; i++){
            const [src, dst] = this.selections.slice(i, i + 2);

            if(getEdge(this.edgeMap, src, dst) == undefined){
                addEdge(this.edgeMap, src, dst);
            }
        }

        this.clearSelections();

        await updateGraph();
    }

    onClick(ev : MouseEvent){
        this.docs.filter(x => x.selected).forEach(x => x.select(false));
    }
}

export let graph : Graph;

export class Section extends MapItem {
    polygon : SVGPolygonElement | undefined;

    constructor(id: number, title : string){
        super(id, title);
    }

    select(selected : boolean){
        this.selected = selected;

        let color = (this.selected ? "red" : "black");

        if(this.polygon != undefined){
            this.polygon.setAttribute("stroke", color);
        }
    }

    onSectionClick(ev : MouseEvent){
        ev.stopPropagation();
        ev.preventDefault();

        if(ev.ctrlKey){

            this.select(!this.selected);
            msg(`section : ${this.title}`);
        }
    }

    onSectionMenu(ev : MouseEvent){
        ev.stopPropagation();
        ev.preventDefault();

        $("add-item-to-section").onclick = this.addItemToSection.bind(this);
        $("append-to-section").onclick = this.appendToSection.bind(this);
        showDlg(ev, "graph-section-menu-dlg");
    }

    async addItemToSection(ev : MouseEvent){
        const title = await inputBox();
        if(title == null){
            return;
        }

        const doc = graph.addDoc(title);
        doc.section = this;

        await updateGraph();
    }

    async appendToSection(ev : MouseEvent){
        msg(`append To Section`);
        graph.docs.filter(x => x.selected).forEach(x => x.section = this);
        graph.clearSelections();

        await updateGraph();
    }

    makeDot(lines : string[]){
        lines.push(`subgraph cluster_${this.id} {`);
        lines.push(`    id = "s${this.id}";`);
        lines.push(`    label = "${this.title}";`);
        lines.push(`    labelloc  = "b";`);
        lines.push(`    labeljust = "l";`);
        lines.push(`    bgcolor   = "cornsilk";`);
        lines.push(`    color     = "green";`);
        lines.push(`    penwidth  = 2;`);

        const docs = graph.docs.filter(x => x.section == this);
        docs.forEach(doc => doc.makeDot(lines));

        lines.push(`}`);
    }
}


async function onMenu(ev : MouseEvent){
    ev.preventDefault();
    ev.stopPropagation();

    showDlg(ev, "graph-menu-dlg");
}

export async function bodyOnLoadGraph(){
    await includeDialog();

    $("map-svg").style.display = "none";

    const data = await fetchJson(`../data/graph.json`);

    const [docs, sections, edge_map] = makeDocsFromJson(data);

    graph = new Graph(docs, sections, edge_map);

    $("remove-from-section").onclick = graph.removeFromSection.bind(graph);
    $("connect-edge").addEventListener("click", graph.connectEdge.bind(graph));
    document.body.addEventListener("keydown", graph.onKeyDown.bind(graph));

    await graph.makeViz();        
}

async function updateGraph(){
    await graph.makeViz();        

    const text = makeIndexJson(graph.docs, graph.sections, graph.edges());

    const data = {
        "command" : "write-index",
        "text" : text
    };

    const res =  await postData("/db", data);
    const status = res["status"];
    msg(`status:[${status}]`);
}

export async function addGraphItem(){
    const title = await inputBox();
    msg(`input ${title}`);
    if(title == null){
        return;
    }
    graph.addDoc(title);
    await updateGraph();
}

export async function addGraphSection(){
    const title = await inputBox();
    msg(`input ${title}`);
    if(title == null){
        return;
    }
    graph.addSection(title);
    await updateGraph();
}

export async function changeDisplay(){
    showSubgraph = ! showSubgraph;
    await graph.makeViz();      
}

}