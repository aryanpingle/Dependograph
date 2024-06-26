/**
 * References:
 * https://observablehq.com/@d3/mobile-patent-suits
 */

import * as d3 from "d3";
import {
    FileType,
    Graph,
    WebviewEmbeddedMetadata,
    areObjectsSynced,
    syncObjects,
} from "./utils";
import { DependencyInfo } from "../code-analyser";

declare const webviewMetadata: WebviewEmbeddedMetadata;

export interface SimNode extends d3.SimulationNodeDatum {
    name: string;
    fileType: FileType;
    id: string;
}
export interface SimLink extends d3.SimulationLinkDatum<SimNode> {
    cyclic: boolean;
}
type SVGSelection = d3.Selection<SVGElement, unknown, HTMLElement, any>;
type SVGGSelection<T> = d3.Selection<SVGGElement, T, SVGElement, any>;

// Colors
const colors = {
    cyclic: "var(--vscode-editorError-foreground, red)",
    acyclic: "var(--vscode-editorWarning-foreground, orange)",
    node_modules:
        "var(--vscode-gitDecoration-untrackedResourceForeground, green)",
};

export interface GraphConfig {
    removeNodeModules: boolean;
    reverseDirections: boolean;
}

export interface VisualConfig {
    hideFilenames: boolean;
}

export type GraphAndVisualizationConfig = GraphConfig | VisualConfig;

export class ForceDirectedVisualization {
    // Singleton Pattern
    public static instance: ForceDirectedVisualization;
    public static createSingletonInstance(dependencyInfo: DependencyInfo) {
        this.instance = new ForceDirectedVisualization(dependencyInfo);
        return this.instance;
    }

    // Instance variables and methods
    private simulation: d3.Simulation<SimNode, SimLink>;
    private nodes: SimNode[];
    private links: SimLink[];

    private d3Nodes: SVGGSelection<SimNode>;
    private d3Links: SVGGSelection<SimLink>;
    private zoom_container: d3.Selection<
        SVGGElement,
        unknown,
        HTMLElement,
        any
    >;

    private graphConfig: GraphConfig = {
        removeNodeModules: false,
        reverseDirections: false,
    };
    private visualizationConfig: VisualConfig = {
        hideFilenames: false,
    };

    private originalNodes: SimNode[];
    private originalLinks: SimLink[];

    // TODO: Take in the selector of an svg element
    private constructor(private readonly dependencyInfo: DependencyInfo) {
        const graph = new Graph(this.dependencyInfo).getNodesAndLinks();
        this.originalNodes = graph.nodes;
        this.originalLinks = graph.links;

        // Set some properies on the svg
        (d3.select("svg") as SVGSelection)
            .attr(
                "style",
                "max-width: 100%; height: auto; font: 12px sans-serif;",
            )
            .call(d3.zoom<SVGElement, unknown>().on("zoom", this.onZoom));

        // Create the container for everything inside the svg that should be zoomable / pannable
        this.zoom_container = d3
            .select("svg")
            .append("g")
            .classed("svg_inner", true);

        this.applyGraphConfig();
    }

    public applyConfiguration(newConfig: Partial<GraphAndVisualizationConfig>) {
        if (areObjectsSynced(this.graphConfig, newConfig)) {
            // No change in graph config
            if (areObjectsSynced(this.visualizationConfig, newConfig)) {
                // No change in visualization config either
                return;
            } else {
                // Only the visualization config has changed
                syncObjects(this.visualizationConfig, newConfig);
                this.applyVisualConfig();
            }
        } else {
            // The graph configuration has changed
            syncObjects(this.graphConfig, newConfig);
            syncObjects(this.visualizationConfig, newConfig);
            this.applyGraphConfig();
        }
    }

    /**
     * Set this.nodes and this.links to COPIES of their originals.
     */
    private cloneNodesAndLinks() {
        this.nodes = this.originalNodes.map((node) => Object.assign({}, node));
        this.links = this.originalLinks.map((link) => Object.assign({}, link));
    }

    private applyGraphConfig() {
        this.cloneNodesAndLinks();

        // Now apply structural changes
        // TODO

        // This will call applyVisualizationConfig automatically
        this.createSimulation();
    }

    private createSimulation() {
        this.simulation = d3
            .forceSimulation(this.nodes)
            .force(
                "link",
                d3
                    .forceLink<SimNode, SimLink>(this.links)
                    .id((node) => node.id),
            )
            .force("charge", d3.forceManyBody().strength(-600))
            .force("x", d3.forceX())
            .force("y", d3.forceY())
            // Pause it until its nodes have been built
            .stop();

        this.simulation.on("tick", () => {
            this.d3Links
                .filter("g.acyclic")
                .select("path")
                .attr("d", (link) => {
                    const source = link.source as SimNode;
                    const target = link.target as SimNode;
                    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
                });
            this.d3Links
                .filter("g.cyclic")
                .select("path.fromSource")
                .attr("d", (link) => this.getLinkArc(link, true));
            this.d3Links
                .filter("g.cyclic")
                .select("path.toSource")
                .attr("d", (link) => this.getLinkArc(link, false));
            this.d3Nodes.attr("transform", (d) => `translate(${d.x},${d.y})`);
        });

        this.applyVisualConfig();
    }

    private applyVisualConfig() {
        // Temporarily pause the simulation
        this.simulation.stop();
        // Some visual changes need to happen during the SVG build process
        this.initializeDrawing();

        // Any additional post-processing effects

        // Start the simulation
        this.simulation.restart();
    }

    private initializeDrawing() {
        document.querySelector(".svg_inner").innerHTML = "";

        // Per-type markers, as they don't inherit styles.
        this.zoom_container
            .append("defs")
            .selectAll("marker")
            .data(this.links)
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
            .attr("fill", (link) =>
                link.cyclic ? colors.cyclic : colors.acyclic,
            )
            .attr("d", "M0,-5 L10,0 L0,5");

        this.createD3Links();
        this.createD3Nodes();
    }

    private createD3Links() {
        // Create links
        this.d3Links = this.zoom_container
            .append("g")
            .classed("link-container", true)
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .selectAll("g")
            .data(this.links)
            .enter()
            .append("g")
            .classed("cyclic", (link) => link.cyclic)
            .classed("acyclic", (link) => !link.cyclic);

        // Add cyclic paths
        this.d3Links
            .filter("g.cyclic")
            .append("path")
            .classed("fromSource", true);
        this.d3Links
            .filter("g.cyclic")
            .append("path")
            .classed("toSource", true);

        // Add acyclic path
        this.d3Links.filter("g.acyclic").append("path");

        this.d3Links
            .selectAll("path")
            .attr("stroke", (link: SimLink) =>
                link.cyclic ? colors.cyclic : colors.acyclic,
            )
            .style(
                "marker-end",
                (link: SimLink) => `url(#arrow-${link.cyclic})`,
            );
    }

    private createD3Nodes() {
        this.d3Nodes = this.zoom_container
            .append("g")
            .classed("node-g", true)
            .attr("fill", "currentColor")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(this.nodes)
            .enter()
            .append("g")
            .attr("fill", (node) =>
                node.fileType === "nodejs"
                    ? colors.node_modules
                    : "currentColor",
            )
            .call(
                d3
                    .drag<SVGGElement, SimNode>()
                    .on("start", this.onDragStart)
                    .on("drag", this.onDragged)
                    .on("end", this.onDragEnd),
            );

        this.d3Nodes
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

        if (!this.visualizationConfig.hideFilenames) {
            this.d3Nodes
                .append("text")
                .attr("x", 8)
                .attr("y", "0.31em")
                .text((d) => d.name)
                .clone(true)
                .lower()
                .attr("fill", "none");
        }
    }

    private onZoom = (event: any) => {
        this.zoom_container.attr("transform", event.transform);
    };

    public resizeSVG = (width: number, height: number) => {
        width = Math.floor(width);
        height = Math.floor(height);
        const svgElement = document.querySelector("svg") as SVGElement;
        svgElement.setAttribute("width", "" + width);
        svgElement.setAttribute("height", "" + height);
        svgElement.setAttribute(
            "viewBox",
            `-${width / 2} -${height / 2} ${width} ${height}`,
        );
    };

    private getLinkArc = (link: SimLink, fromSource: boolean) => {
        const source = (fromSource ? link.source : link.target) as SimNode;
        const target = (fromSource ? link.target : link.source) as SimNode;
        const r = Math.hypot(target.x - source.x, target.y - source.y);
        return `
          M${source.x},${source.y}
          A${r},${r} 0 0,1 ${target.x},${target.y}
        `;
    };

    // Functionality for node-dragging

    private onDragStart = (event: any, node: SimNode) => {
        node.fx = event.x;
        node.fy = event.y;
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
    };

    private onDragged = (event: any, node: SimNode) => {
        node.fx = event.x;
        node.fy = event.y;
    };

    private onDragEnd = (event: any, node: SimNode) => {
        node.fx = null;
        node.fy = null;
        if (!event.active) this.simulation.alphaTarget(0);
    };
}
