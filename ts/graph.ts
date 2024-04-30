declare var Viz: any;

namespace casts {

let URLs     : { [id: number]: string; } = {};

export function makeDot(docs : Doc[], mapEdges : Edge[]){
    let doc_map = new Map<string, Doc>();
    let docLines  : string[] = [];
    let edgeLines : string[] = [];

    for(let doc of docs){
        doc_map.set(`${doc.id}`, doc);
        let url = URLs[doc.id];

        let id = (url != undefined ? `be/${url}` : `${doc.id}`);
        let color = `, fontcolor="blue"`;

        docLines.push(`b${doc.id} [ label="${doc.title}", id="${id}", class="doc", tooltip="　" ${color} ];` );
    }

    for(let edge of mapEdges){
        let id = `${edge.src.id}:${edge.dst.id}`;
        edgeLines.push(`b${edge.src.id} -> b${edge.dst.id} [ id="${id}" ];`);
    }

    const ranks : string[] = [];
    const max_level = Math.max(... docs.map(x => x.level));
    for(let level = 0; level < max_level; level++){
        const same_docs = docs.filter(doc => doc.level == level);
        if(same_docs.length != 0){

            const id_list = same_docs.map(doc => `b${doc.id};`).join(" ");
            const rank = `{rank = same; ${id_list}}`
            ranks.push(rank);
        }
    }

    let dot = `
    digraph graph_name {
        graph [
            rankdir = BT;
            charset = "UTF-8";
        ];
        ${docLines.join('\n')}
        ${edgeLines.join('\n')}
        ${ranks.join('\n')}
    }
    `;

    Viz.instance().then(function(viz:any) {
        var svg = viz.renderSVGElement(dot) as SVGSVGElement;

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

export async function bodyOnLoadGraph(){
    $("map-svg").style.display = "none";

    const data = await fetchJson(`../data/edge.json`);

    const docs = makeDocsFromJson(data);
    const edges = Array.from(edgeMap.values());

    makeDot(docs, edges);        
}

}