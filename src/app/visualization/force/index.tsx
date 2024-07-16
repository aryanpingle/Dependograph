/**
 * References:
 * https://observablehq.com/@d3/mobile-patent-suits
 */

import * as d3 from "d3";
import {
    WebviewEmbeddedMetadata,
    getMinimalFilepaths,
    FileType,
} from "webview-utils";
import { GlobalTradeInfo } from "trade-analyser";
import { VscodeColors, createCSSVariable } from "vscode-webview-variables";
import { Visualization, SVGGSelection } from "../visualization";
import { Graph, GraphConfig } from "../graph";
import { NodeId, VizNode } from "../node";
import { VNode } from "preact";
// @ts-ignore
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";

declare const webviewMetadata: WebviewEmbeddedMetadata;

export type SimNode = VizNode & d3.SimulationNodeDatum;

export interface SimLink extends d3.SimulationLinkDatum<SimNode> {
    cyclic: boolean;
}

// Colors
const colors = {
    cyclic: createCSSVariable(
        VscodeColors["editorError-foreground"].cssName,
        "red",
    ),
    acyclic: createCSSVariable(
        VscodeColors["editorWidget-border"].cssName,
        "orange",
    ),
    node_modules: createCSSVariable(
        VscodeColors["gitDecoration-untrackedResourceForeground"].cssName,
        "green",
    ),
};

export interface VisualConfig {
    /** Shorten filenames as much as possible without having any duplicates */
    minimalFilepaths: boolean;
    hideFilepaths: boolean;
}

export type GraphAndVisualConfig = GraphConfig & VisualConfig;

export class ForceVisualization extends Visualization<VisualConfig> {
    DefaultConfig: VisualConfig = {
        minimalFilepaths: true,
        hideFilepaths: false,
    };
    ConfigInputElements: VNode[] = [
        <VSCodeCheckbox name="minimalFilepaths">
            Shorten Filepaths
        </VSCodeCheckbox>,
        <VSCodeCheckbox name="hideFilepaths">Hide Filepaths</VSCodeCheckbox>,
    ];

    // Instance variables and methods
    private simulation: d3.Simulation<SimNode, SimLink>;
    private nodes: SimNode[];
    private links: SimLink[];

    private d3Nodes: SVGGSelection<SimNode>;
    private d3Links: SVGGSelection<SimLink>;

    public visualConfig: VisualConfig;

    private selectedNode?: SimNode;

    public constructor(globalTradeInfo: GlobalTradeInfo) {
        super(globalTradeInfo);
        this.visualConfig = this.DefaultConfig;
    }

    public onComponentRendered(): void {
        // Clear the svg
        this.zoomContainer.html("");

        // Setup a click listener on the svg element (for unselecting)
        this.svgSelection.on("click", this.onClickBackground);

        const defaultConfig = Object.assign(
            {},
            Graph.DefaultConfig,
            this.DefaultConfig,
        );
        this.applyConfiguration(defaultConfig, true);
    }

    private createLinksFromGraph(): SimLink[] {
        const links: SimLink[] = [];

        const visitedNodeIds = new Set<NodeId>();

        const adjacencySet = this.graph.adjacencySet;
        for (const sourceId in adjacencySet) {
            for (const targetId of adjacencySet[sourceId].values()) {
                // If there is already a link between source and target
                if (
                    visitedNodeIds.has(targetId) &&
                    adjacencySet[targetId].has(sourceId)
                )
                    continue;

                // Establish a cyclic or acyclic link
                links.push({
                    source: sourceId,
                    target: targetId,
                    cyclic: adjacencySet[targetId].has(sourceId),
                });
            }

            visitedNodeIds.add(sourceId);
        }

        return links;
    }

    protected onGraphModified() {
        this.nodes = this.graph.nodes;
        this.links = this.createLinksFromGraph();

        this.createSimulation();
    }

    protected createVisuals() {
        // Temporarily pause the simulation
        this.simulation.stop();

        this.initializeDrawing();

        // Any additional post-processing effects

        if (this.visualConfig.minimalFilepaths) {
            const shortPaths = getMinimalFilepaths(
                this.nodes.map((node) => node.filepathWithoutWorkspace),
            );

            // TODO: Writing the select for each setting is painful
            // Store each component (text, icon, etc) as an instance variable
            this.d3Nodes
                .selectAll("text")
                .text(
                    (node: SimNode) =>
                        shortPaths[node.filepathWithoutWorkspace],
                );
        }

        // Start the simulation
        this.simulation.restart();
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
    }

    protected initializeDrawing() {
        // Reset the zoom container
        this.zoomContainer.html("");

        // Per-type markers, as they don't inherit styles.
        this.zoomContainer
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
        this.d3Links = this.zoomContainer
            .append("g")
            .classed("link-container", true)
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .selectAll("g")
            .data(this.links)
            .enter()
            .append("g")
            .classed("cyclic", (link) => link.cyclic)
            .classed("acyclic", (link) => !link.cyclic)
            .attr("id", (link) => {
                const sourceId = (link.source as SimNode).id;
                const targetId = (link.target as SimNode).id;
                return `link-${sourceId}-${targetId}`;
            })
            .classed("link", true);

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
        this.d3Nodes = this.zoomContainer
            .append("g")
            .classed("node-g", true)
            .attr("fill", "currentColor")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(this.nodes)
            .enter()
            .append("g")
            .classed("node", true)
            .attr("id", (node) => `node-${node.id}`)
            .attr("fill", (node) =>
                node.fileType === FileType.NODEJS
                    ? colors.node_modules
                    : "currentColor",
            )
            .call(
                d3
                    .drag<SVGGElement, SimNode>()
                    .on("start", this.onDragStart)
                    .on("drag", this.onDragged)
                    .on("end", this.onDragEnd),
            )
            .style("cursor", "pointer")
            .on("click", (event, node) => {
                this.onClickNode(event, node);
            });

        this.d3Nodes
            .append("image")
            .attr("href", (node) =>
                [
                    webviewMetadata.extensionWebviewURI,
                    "assets",
                    "icons",
                    node.fileType + ".svg",
                ].join("/"),
            )
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", 16)
            .attr("height", 16);

        if (!this.visualConfig.hideFilepaths) {
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

    private getLinkArc = (link: SimLink, fromSource: boolean) => {
        const source = (fromSource ? link.source : link.target) as SimNode;
        const target = (fromSource ? link.target : link.source) as SimNode;
        const r = Math.hypot(target.x - source.x, target.y - source.y);
        // Draws an arc from the source to the target in a clockwise manner
        return `
          M${source.x},${source.y}
          A${r},${r} 0 0,1 ${target.x},${target.y}
        `;
    };

    // Event handlers

    private onClickBackground = () => {
        this.selectNode(undefined);
    };

    private onClickNode(event: MouseEvent, node: SimNode) {
        event.stopPropagation();
        if (event.button === 0) {
            // Left click
            if (
                this.selectedNode !== undefined &&
                (event.ctrlKey || event.metaKey)
            ) {
                // Ctrl+click (or command+click on MacOS)
                // Find a path from `this.selectedNode` to `node`
                const paths = this.graph.getAllPaths(this.selectedNode, node);
                this.highlightPaths(paths);
            } else {
                this.selectNode(node);
            }
        }
    }

    /**
     * Select the given node, and highlight all direct dependencies from it.
     */
    protected selectNode(node?: SimNode) {
        this.selectedNode = node;

        if (node === undefined) {
            this.unHighlightPaths();
        } else {
            // Files this is importing
            const importIds: string[] = Array.from(
                this.graph.adjacencySet[this.selectedNode.id],
            );
            // Files this is exporting to
            const exportIds: string[] = Object.keys(
                this.graph.adjacencySet,
            ).filter((nodeId) => this.graph.adjacencySet[nodeId].has(node.id));

            this.highlightPaths([
                [node.id],
                ...importIds.map((importId) => [node.id, importId]),
                ...exportIds.map((exportId) => [exportId, node.id]),
            ]);
        }

        this.onSelectNode(node);
    }

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
