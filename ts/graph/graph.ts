declare var Viz: any;

namespace casts {

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

    makeViz(){
        let doc_map = new Map<string, Doc>();
        this.docs.forEach(doc => doc_map.set(`${doc.id}`, doc));

        let sec_map = new Map<string, Section>();
        this.sections.forEach(sec => sec_map.set(`s${sec.id}`, sec));

        let docLines  : string[] = [];
        let secLines  : string[] = [];
        let edgeLines : string[] = [];

        for(let doc of this.docs.filter(doc => doc.section == undefined)){
            doc.makeDot(docLines);
        }

        this.sections.forEach(sec => sec.makeDot(secLines));

        for(let edge of this.edgeMap.values()){
            let id = `${edge.src.id}:${edge.dst.id}`;
            edgeLines.push(`b${edge.src.id} -> b${edge.dst.id} [ id="${id}" ];`);
        }

        const ranks : string[] = [];
        // const max_level = Math.max(... docs.map(x => x.level));
        // for(let level = 0; level < max_level; level++){
        //     const same_docs = docs.filter(doc => doc.level == level);
        //     if(same_docs.length != 0){

        //         const id_list = same_docs.map(doc => `b${doc.id};`).join(" ");
        //         const rank = `{rank = same; ${id_list}}`
        //         ranks.push(rank);
        //     }
        // }

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

        Viz.instance().then(function(viz:any) {
            var svg = viz.renderSVGElement(dot) as SVGSVGElement;

            svg.addEventListener("contextmenu", onMenu);
            svg.addEventListener("click", graph.onClick.bind(graph));
            svg.addEventListener("keydown", graph.onKeyDown.bind(graph));

            const nodes = Array.from(svg.getElementsByClassName("node doc")) as SVGGElement[];
            for(const g of nodes){
                const doc = doc_map.get(g.id);
                if(doc == undefined){

                    msg(`node NG: ${g.id} [${g.textContent}]`);
                }
                else{
                    msg(`node : ${g.id} [${doc.title}]`);
                    g.addEventListener("click", doc.onVizClick.bind(doc));

                    const ellipses = g.getElementsByTagName("ellipse");
                    if(ellipses.length == 1){
                        doc.ellipse = ellipses.item(0)!;
                    }
                }

                g.setAttribute("cursor", "pointer");
            }

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

            const map_div = $div("map-div");
            map_div.innerHTML = "";

            map_div.appendChild(svg);

            const rc = svg.getBoundingClientRect();

            map_div.style.width = `${rc.width.toFixed()}px`;
            map_div.style.height = `${rc.height.toFixed()}px`;
        });
    }


    onKeyDown(ev : KeyboardEvent){
        if(ev.key == "Escape"){
            this.clearSelections();
        }
    }

    clearSelections(){
        this.docs.filter(doc => doc.selected).forEach(doc => doc.select(false));
        this.selections = [];
    }

    addDoc(title : string){
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

        $("appendToSection").onclick = this.appendToSection.bind(this);
        showDlg(ev, "graph-section-menu-dlg");
    }

    async appendToSection(ev : MouseEvent){
        msg(`appendToSection`);
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

    const data = await fetchJson(`../data/edge.json`);

    const [docs, sections, edge_map] = makeDocsFromJson(data);

    graph = new Graph(docs, sections, edge_map);

    $("remove-from-section").onclick = graph.removeFromSection.bind(graph);
    $("connect-edge").addEventListener("click", graph.connectEdge.bind(graph));

    graph.makeViz();        
}

async function updateGraph(){
    graph.makeViz();        

    const text = makeIndexJson(graph.docs, graph.sections, Array.from(graph.edgeMap.values()));

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

}