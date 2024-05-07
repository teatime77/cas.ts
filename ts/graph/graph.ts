declare var Viz: any;

namespace casts {

let URLs     : { [id: number]: string; } = {};

class Graph {
    docs : Doc[];
    edges : Edge[];
    sections : Section[];

    constructor(docs : Doc[], sections : Section[], edges : Edge[]){
        this.docs  = docs;
        this.sections = sections;
        this.edges = edges;
    }

    makeDot(){
        let doc_map = new Map<string, Doc>();
        this.docs.forEach(doc => doc_map.set(`${doc.id}`, doc));

        let docLines  : string[] = [];
        let secLines  : string[] = [];
        let edgeLines : string[] = [];

        for(let doc of this.docs.filter(doc => doc.section == undefined)){
            let url = URLs[doc.id];

            let id = (url != undefined ? `be/${url}` : `${doc.id}`);
            let color = `, fontcolor="blue"`;
            docLines.push(`b${doc.id} [ label="${doc.title}" id="${id}" class="doc" tooltip="　" fontsize="10" ${color} ];` );
        }

        for(let [idx, section] of this.sections.entries()){
            const docs = this.docs.filter(x => x.section == section);
            secLines.push(`subgraph cluster_${idx} {`);
            secLines.push(`    label = "${section.title}";`);
            secLines.push(`    labelloc  = "b";`);
            secLines.push(`    labeljust = "l";`);
            secLines.push(`    color     = "green";`);
            secLines.push(`    penwidth  = 2;`);
            for(const doc of docs){
                secLines.push(`b${doc.id} [ label="${doc.title}" id="${doc.id}" class="doc" tooltip="　" fontsize="10" , fontcolor="blue" ];` );
            }
            secLines.push(`}`);
        }

        for(let edge of this.edges){
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
            svg.addEventListener("click", graph.onClick.bind(graph))

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

            const clusters = Array.from(svg.getElementsByClassName("cluster")) as SVGGElement[];
            for(const g of nodes){

            }

            const map_div = $div("map-div");
            map_div.innerHTML = "";

            map_div.appendChild(svg);

            const rc = svg.getBoundingClientRect();

            map_div.style.width = `${rc.width.toFixed()}px`;
            map_div.style.height = `${rc.height.toFixed()}px`;
        });
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
        const section = new Section(title);
        this.sections.push(section);

        this.docs.filter(x => x.selected).forEach(x => x.section = section);
    }

    async update(){
        const text = makeIndexJson(this.docs, this.sections, this.edges);

        const data = {
            "command" : "write-index",
            "text" : text
        };
        const res =  await postData("/db", data);
        const status = res["status"];
        msg(`status:[${status}]`);
    }

    onClick(ev : MouseEvent){
        this.docs.filter(x => x.selected).forEach(x => x.select(false));
    }
}

export let graph : Graph;

export class Section {
    title : string;

    constructor(title : string){
        this.title = title;
    }
}


async function onMenu(ev : MouseEvent){
    ev.preventDefault();

    const dlg = $dlg("graph-menu-dlg");

    const rc1 = dlg.getBoundingClientRect();
    msg(`dlg w: [${dlg.style.width}] [${dlg.style.maxWidth}] [${dlg.style.minWidth}] [${rc1.width}]`)

    let x : number;
    let y : number;
    let w = 150;
    // if(document.documentElement.clientWidth < ev.pageX + 150){
    //     x = document.documentElement.clientWidth - w;
    // }
    // else{
    //     x = ev.pageX;
    // }
    x = ev.pageX;
    y = ev.pageY;
    dlg.style.left = x + "px";
    dlg.style.top  = y + "px";
    dlg.showModal();


    // showDlg(ev, "graph-menu-dlg");
}

export async function bodyOnLoadGraph(){
    await includeDialog();

    $("map-svg").style.display = "none";

    const data = await fetchJson(`../data/edge.json`);

    const [docs, sections] = makeDocsFromJson(data);
    const edges = Array.from(edgeMap.values());

    graph = new Graph(docs, sections, edges);

    graph.makeDot();        
}

export async function addGraphItem(){
    const title = await inputBox();
    msg(`input ${title}`);
    if(title == null){
        return;
    }
    graph.addDoc(title);
    await graph.update();
}

export async function addGraphSection(){
    const title = await inputBox();
    msg(`input ${title}`);
    if(title == null){
        return;
    }
    graph.addSection(title);
    await graph.update();
}

}