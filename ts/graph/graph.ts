declare var Viz: any;

namespace casts {

let URLs     : { [id: number]: string; } = {};

class Graph {
    docs : Doc[];
    edges : Edge[]

    constructor(docs : Doc[], edges : Edge[]){
        this.docs  = docs;
        this.edges = edges;
    }

    makeDot(){
        let doc_map = new Map<string, Doc>();
        let docLines  : string[] = [];
        let docLines2  : string[] = [];
        let edgeLines : string[] = [];

        for(let doc of this.docs){
            doc_map.set(`${doc.id}`, doc);
            let url = URLs[doc.id];

            let id = (url != undefined ? `be/${url}` : `${doc.id}`);
            let color = `, fontcolor="blue"`;

            if(166 <= doc.id && doc.id <= 171){

                docLines2.push(`b${doc.id} [ label="${doc.title}" id="${id}" class="doc" tooltip="　" fontsize="10" ${color} ];` );
            }
            else{

                docLines.push(`b${doc.id} [ label="${doc.title}" id="${id}" class="doc" tooltip="　" fontsize="10" ${color} ];` );
            }
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

        let sub = `
        subgraph cluster_3 {
            label = "行列";
            labelloc  = "b";
            labeljust = "l";
            color     = "green";
            penwidth  = 2;
            ${docLines2.join('\n')}
        }
        `

        let dot = `
        digraph graph_name {
            graph [
                rankdir = BT;
                charset = "UTF-8";
            ];
            ${docLines.join('\n')}
            ${sub}
            ${edgeLines.join('\n')}
            ${ranks.join('\n')}
        }
        `;

        Viz.instance().then(function(viz:any) {
            var svg = viz.renderSVGElement(dot) as SVGSVGElement;

            svg.addEventListener("contextmenu", onMenu);

            const nodes = Array.from(svg.getElementsByClassName("node doc")) as SVGGElement[];
            for(const g of nodes){
                const doc = doc_map.get(g.id);
                if(doc == undefined){

                    msg(`node NG: ${g.id} [${g.textContent}]`);
                }
                else{
                    msg(`node : ${g.id} [${doc.title}]`);
                    g.addEventListener("click", doc.onVizClick.bind(doc));
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
}

let graph : Graph;


function onMenu(ev : MouseEvent){
    ev.preventDefault();
    showDlg(ev, "graph-menu-dlg");
}

export async function bodyOnLoadGraph(){
    await includeDialog();

    $("map-svg").style.display = "none";

    const data = await fetchJson(`../data/edge.json`);

    const docs = makeDocsFromJson(data);
    const edges = Array.from(edgeMap.values());

    graph = new Graph(docs, edges);

    graph.makeDot();        
}

export async function addGraphItem(){
    const title = await inputBox();
    msg(`input ${title}`);
    if(title == null){
        return;
    }
    graph.addDoc(title);

    const text = makeIndexJson(graph.docs, graph.edges);

    const data = {
        "command" : "write-index",
        "text" : text
    };
    const res =  await postData("/db", data);
    const status = res["status"];
    msg(`status:[${status}]`);
}

export async function addGraphSection(){
}

}