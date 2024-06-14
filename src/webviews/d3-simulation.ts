import d3 from "d3";

function randInt(start: number, end: number) {
    return start + Math.floor(Math.random() * (end - start + 1));
}

interface SimNode extends d3.SimulationNodeDatum {
    name: string;
}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
    cyclic?: boolean;
}
type SVGSelection = d3.Selection<SVGElement, unknown, HTMLElement, any>;
type SVGGSelection<T> = d3.Selection<SVGGElement, T, SVGElement, any>;
type SVGLineSelection<T> = d3.Selection<SVGLineElement, T, SVGElement, any>;

// Declare the chart dimensions and margins.
const width = 640;
const height = 400;

// Simulation variables (logical)
var simulation: d3.Simulation<SimNode, SimLink>;
var simulationNodes: SimNode[];
var simulationLinks: SimLink[];

// D3 selected and generated variables
var d3Nodes: SVGGSelection<SimNode>;
var d3Links: SVGLineSelection<SimLink>;
var svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
var zoom_container: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
var color: d3.ScaleOrdinal<string, string, unknown>;

/**
 * Initializes the svg with the given data
 */
function setupVisualization(nodes: any[], links: any[]) {
    simulationNodes = nodes;
    simulationLinks = links;

    initialize();
}

function initialize() {
    simulation = d3
        .forceSimulation(simulationNodes)
        .force(
            "link",
            d3.forceLink(simulationLinks), //.id((d) => d.id)
        )
        .force("charge", d3.forceManyBody().strength(-300))
        .force("x", d3.forceX())
        .force("y", d3.forceY());

    simulation.on("tick", () => {
        d3Links
            .attr("x1", (d) => (d.source as SimNode).x!)
            .attr("y1", (d) => (d.source as SimNode).y!)
            .attr("x2", (d) => (d.target as SimNode).x!)
            .attr("y2", (d) => (d.target as SimNode).y!);
        d3Nodes.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    svg = (d3.select("svg") as SVGSelection)
        .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;")
        .call(d3.zoom<SVGElement, unknown>().on("zoom", zoomed));
    resizeSVG(width, height);

    // Create the container for everything inside the svg that should be zoomable / pannable
    zoom_container = d3.select("svg").append("g").classed("svg_inner", true);

    // Per-type markers, as they don't inherit styles.
    zoom_container
        .append("defs")
        .selectAll("marker")
        .data(simulationLinks)
        .enter()
        .append("marker")
        .attr("id", (d) => `arrow-${d.cyclic ?? false}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -0.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", "greenyellow")
        .attr("d", "M0,-5 L10,0 L0,5");

    // Create links
    d3Links = zoom_container
        .append("g")
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(simulationLinks)
        .enter()
        .append("line")
        .attr("stroke", "greenyellow")
        .style("marker-end", (d) => `url(#arrow-${d.cyclic ?? false})`);

    createD3Nodes();
}

function createD3Nodes() {
    d3Nodes = zoom_container
        .append("g")
        .classed("node-g", true)
        .attr("fill", "currentColor")
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .selectAll("g")
        .data(simulationNodes)
        .enter()
        .append("g")
        .call(
            d3
                .drag<SVGGElement, SimNode>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended),
        );

    d3Nodes
        .append("circle")
        // .attr("stroke", "red")
        .attr("stroke-width", 1.5)
        .attr("r", 4);

    d3Nodes
        .append("text")
        .attr("x", 8)
        .attr("y", "0.31em")
        .text((d) => d.name)
        .clone(true)
        .lower()
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-width", 3);
}

function resizeSVG(width: number, height: number) {
    svg.attr("width", width)
        .attr("height", height)
        .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`);
}

function zoomed(event: any) {
    zoom_container.attr("transform", event.transform);
}

function linkArc(d: any) {
    const r = Math.hypot(d.target.x - d.source.x, d.target.y - d.source.y);
    return `
      M${d.source.x},${d.source.y}
      A${r},${r} 0 0,1 ${d.target.x},${d.target.y}
    `;
}

// Functionality for node-dragging

function dragstarted(d: any) {
    d.subject.fx = d.x;
    d.subject.fy = d.y;
    if (!d.active) simulation.alphaTarget(0.3).restart();
}

function dragged(d: any) {
    d.subject.fx = d.x;
    d.subject.fy = d.y;
}

function dragended(d: any) {
    d.subject.fx = null;
    d.subject.fy = null;
    if (!d.active) simulation.alphaTarget(0);
}

function test() {
    const N = 20;
    const nodes = new Array(N).fill(0).map((value, index) => {
        return {
            id: String.fromCharCode(65 + index),
        };
    });
    // const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }];
    const E = 20;
    const edgeSet = new Set<string>();
    while (edgeSet.size < E) {
        const source = randInt(0, N - 1);
        const target = randInt(0, N - 1);
        if (source === target) continue;
        const hash = `${source},${target}`;
        if (hash in edgeSet) {
            continue;
        }
        edgeSet.add(hash);
    }

    const links = Array.from(edgeSet).map((hash: string) => {
        let [source, target] = hash.split(",");
        const sourceIdx = +source;
        const targetIdx = +target;

        return {
            source: nodes[sourceIdx].id,
            target: nodes[targetIdx].id,
            type: randInt(1, 10).toString(),
        };
    });
    // const links = [
    //   { source: "A", target: "B", type: "1" },
    //   { source: "C", target: "D", type: "2" },
    //   { source: "D", target: "C", type: "3" },
    // ];

    setupVisualization(nodes, links);
}

test();
