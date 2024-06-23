/**
 * References:
 * https://observablehq.com/@d3/mobile-patent-suits
 */

import * as d3 from "d3";
import { FileType, WebviewEmbeddedMetadata } from "../utils";

declare const webviewMetadata: WebviewEmbeddedMetadata;

export interface SimNode extends d3.SimulationNodeDatum {
    name: string;
    fileType: FileType;
    index: number;
}
export interface SimLink extends d3.SimulationLinkDatum<SimNode> {
    cyclic: boolean;
}
type SVGSelection = d3.Selection<SVGElement, unknown, HTMLElement, any>;
type SVGGSelection<T> = d3.Selection<SVGGElement, T, SVGElement, any>;

// Simulation variables (logical)
var simulation: d3.Simulation<SimNode, SimLink>;
var simulationNodes: SimNode[];
var simulationLinks: SimLink[];

// D3 selected and generated variables
var d3Nodes: SVGGSelection<SimNode>;
var d3Links: SVGGSelection<SimLink>;
var svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
var zoom_container: d3.Selection<SVGGElement, unknown, HTMLElement, any>;

// Colors
const colors = {
    cyclic: "var(--vscode-editorError-foreground, red)",
    acyclic: "var(--vscode-editorWarning-foreground, orange)",
    node_modules: "var(--vscode-gitDecoration-untrackedResourceForeground, green)",
};

/**
 * Initializes the svg with the given data
 */
export function setupVisualization(nodes: SimNode[], links: SimLink[]) {
    simulationNodes = nodes;
    simulationLinks = links;

    // Reset the svg
    document.querySelector("svg").innerHTML = "";

    initialize();
}

function initialize() {
    simulation = d3
        .forceSimulation(simulationNodes)
        .force(
            "link",
            d3
                .forceLink<SimNode, SimLink>(simulationLinks)
                .id((node) => node.index),
        )
        .force("charge", d3.forceManyBody().strength(-600))
        .force("x", d3.forceX())
        .force("y", d3.forceY());

    simulation.on("tick", () => {
        d3Links
            .filter("g.acyclic")
            .select("path")
            .attr("d", (link) => {
                const source = link.source as SimNode;
                const target = link.target as SimNode;
                return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
            });
        d3Links
            .filter("g.cyclic")
            .select("path.fromSource")
            .attr("d", (link) => getLinkArc(link, true));
        d3Links
            .filter("g.cyclic")
            .select("path.toSource")
            .attr("d", (link) => getLinkArc(link, false));
        d3Nodes.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    svg = (d3.select("svg") as SVGSelection)
        .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;")
        .call(d3.zoom<SVGElement, unknown>().on("zoom", zoomed));

    // Create the container for everything inside the svg that should be zoomable / pannable
    zoom_container = d3.select("svg").append("g").classed("svg_inner", true);

    // Per-type markers, as they don't inherit styles.
    zoom_container
        .append("defs")
        .selectAll("marker")
        .data(simulationLinks)
        .enter()
        .append("marker")
        .attr("id", (d) => `arrow-${d.cyclic}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -0.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", (link) => (link.cyclic ? colors.cyclic : colors.acyclic))
        .attr("d", "M0,-5 L10,0 L0,5");

    createD3Links();
    createD3Nodes();
}

function createD3Links() {
    // Create links
    d3Links = zoom_container
        .append("g")
        .classed("link-container", true)
        .attr("fill", "none")
        .attr("stroke-width", 1.5)
        .selectAll("g")
        .data(simulationLinks)
        .enter()
        .append("g")
        .classed("cyclic", (link) => link.cyclic)
        .classed("acyclic", (link) => !link.cyclic);

    // Add cyclic paths
    d3Links.filter("g.cyclic").append("path").classed("fromSource", true);
    d3Links.filter("g.cyclic").append("path").classed("toSource", true);

    // Add acyclic path
    d3Links.filter("g.acyclic").append("path");

    d3Links
        .selectAll("path")
        .attr("stroke", (link: SimLink) =>
            link.cyclic ? colors.cyclic : colors.acyclic,
        )
        .style("marker-end", (link: SimLink) => `url(#arrow-${link.cyclic})`);
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
        .attr("fill", (node) =>
            node.fileType === "nodejs" ? colors.node_modules : "currentColor",
        )
        .call(
            d3
                .drag<SVGGElement, SimNode>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended),
        );

    d3Nodes
        .append("image")
        .attr("href", (node) =>
            [
                webviewMetadata.extensionWebviewURI,
                "assets",
                "icons",
                node.fileType + ".svg",
            ].join(webviewMetadata.pathSep),
        )
        .attr("x", -8)
        .attr("y", -8)
        .attr("width", 16)
        .attr("height", 16);

    d3Nodes
        .append("text")
        .attr("x", 8)
        .attr("y", "0.31em")
        .text((d) => d.name)
        .clone(true)
        .lower()
        .attr("fill", "none");
    // .attr("stroke", "white")
    // .attr("stroke-width", 3);
}

export function resizeSVG(width: number, height: number) {
    width = Math.floor(width);
    height = Math.floor(height);
    const svgElement = document.querySelector("svg") as SVGElement;
    svgElement.setAttribute("width", "" + width);
    svgElement.setAttribute("height", "" + height);
    svgElement.setAttribute(
        "viewBox",
        `-${width / 2} -${height / 2} ${width} ${height}`,
    );
}

function zoomed(event: any) {
    zoom_container.attr("transform", event.transform);
}

function getLinkArc(link: SimLink, fromSource: boolean) {
    const source = (fromSource ? link.source : link.target) as SimNode;
    const target = (fromSource ? link.target : link.source) as SimNode;
    const r = Math.hypot(target.x - source.x, target.y - source.y);
    return `
      M${source.x},${source.y}
      A${r},${r} 0 0,1 ${target.x},${target.y}
    `;
}

// Functionality for node-dragging

function dragstarted(d: any, node: SimNode) {
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
