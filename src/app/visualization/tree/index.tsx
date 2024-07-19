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
import { VizNode } from "../node";
import { VNode } from "preact";
// @ts-ignore
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";

declare const webviewMetadata: WebviewEmbeddedMetadata;

export type TreeNode = d3.HierarchyNode<VizNode>;
export type TreeLink = d3.HierarchyLink<VizNode>;

// Colors
const colors = {
    links: createCSSVariable(
        VscodeColors["editorWidget-border"].cssName,
        "gray",
    ),
    node_modules: createCSSVariable(
        VscodeColors["gitDecoration-untrackedResourceForeground"].cssName,
        "green",
    ),
};

export interface VisualConfig {
    hideFilepaths: boolean;
}

export type GraphAndVisualConfig = GraphConfig & VisualConfig;

export class TreeVisualization extends Visualization<VisualConfig> {
    DefaultVisualConfig: VisualConfig = {
        hideFilepaths: false,
    }
    DefaultConfig: GraphConfig & VisualConfig = {
        ...Graph.DefaultConfig,
        ...this.DefaultVisualConfig,
        // To ensure tree structure
        separateCyclicDependencies: true,
    };
    ConfigInputElements: VNode[] = [
        <VSCodeCheckbox name="hideFilepaths">Hide Filepaths</VSCodeCheckbox>,
    ];

    // Instance variables and methods
    private root: TreeNode;
    private nodes: VizNode[];

    private d3Nodes: SVGGSelection<TreeNode>;
    private d3Links: SVGGSelection<TreeLink>;

    public visualConfig: VisualConfig;

    private selectedNode?: TreeNode;

    private NODE_SIZE = 16;
    private TREE_NODE_WIDTH = this.NODE_SIZE * 4;
    private TREE_NODE_HEIGHT = this.NODE_SIZE * 7;

    public constructor(globalTradeInfo: GlobalTradeInfo) {
        super(globalTradeInfo);
        this.visualConfig = this.DefaultConfig;
    }

    public onComponentRendered(): void {
        // Clear the svg
        this.zoomContainer.html("");

        // Setup a click listener on the svg element (for unselecting)
        this.svgSelection.on("click", this.onClickBackground);

        const defaultConfig: GraphConfig & VisualConfig = {
            ...Graph.DefaultConfig,
            ...this.DefaultConfig,
            // Ensure the tree structure
            separateCyclicDependencies: true,
        }
        this.applyConfiguration(defaultConfig, true);
    }

    protected onGraphModified() {
        const graph = this.graph;

        this.nodes = graph.nodes;

        this.root = d3.hierarchy(
            this.graph.nodes.find((node) => node.isEntryFile),
            (node) => {
                // Find all children of this node
                const nodeId = node.id;
                const dependencyNodeIds = Array.from(
                    graph.adjacencySet[nodeId],
                );

                const y = dependencyNodeIds.map(
                    (depNodeId) => graph.NodeIdToNode[depNodeId],
                );
                return y;
            },
        );
        const tree = d3
            .tree()
            .nodeSize([this.TREE_NODE_WIDTH, this.TREE_NODE_HEIGHT]);
        // Compute the x and y coordinates
        tree(this.root);
    }

    protected override createVisuals() {
        this.initializeDrawing();

        const shortPaths = getMinimalFilepaths(
            this.nodes.map((node) => node.filepathWithoutWorkspace),
        );

        // TODO: Writing the select for each setting is painful
        // Store each component (text, icon, etc) as an instance variable
        this.d3Nodes
            .selectAll("text")
            .text(
                (node: TreeNode) =>
                    shortPaths[node.data.filepathWithoutWorkspace],
            );
    }

    protected initializeDrawing() {
        this.zoomContainer.html("");
        this.createD3Links();
        this.createD3Markers();
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
            .data(this.root.links())
            .enter()
            .append("g")
            .attr("id", (link) => {
                const sourceId = link.source.data.id;
                const targetId = link.target.data.id;
                return `link-${sourceId}-${targetId}`;
            })
            .classed("link", true);

        this.d3Links.append("path").attr("d", (link) => this.getLinkArc(link));

        this.d3Links
            .selectAll("path")
            .attr("stroke", colors.links)
            .style("marker-end", `url(#arrow)`);
    }

    /**
     * Get a link's string representation that can be used in a path's `d` attribute.
     */
    private getLinkArc = (link: TreeLink): string => {
        const source = link.source;
        const target = link.target;
        const path = d3.path();
        path.moveTo(source.x, source.y);
        path.lineTo(source.x, (source.y + target.y) / 2);
        path.lineTo(target.x, (source.y + target.y) / 2);
        path.lineTo(target.x, target.y);
        return path.toString();
    };

    private createD3Markers() {
        this.zoomContainer
            .append("defs")
            .selectAll("marker")
            .data(this.d3Links)
            .enter()
            .append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 15)
            .attr("refY", -0.5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("fill", colors.links)
            .attr("d", "M0,-5 L10,0 L0,5");
    }

    private createD3Nodes() {
        this.d3Nodes = this.zoomContainer
            .append("g")
            .classed("node-g", true)
            .attr("fill", "currentColor")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(this.root.descendants())
            .enter()
            .append("g")
            .classed("node", true)
            .attr("id", (node) => `node-${node.data.id}`)
            .attr("fill", (node) =>
                node.data.fileType === FileType.NODEJS
                    ? colors.node_modules
                    : "currentColor",
            )
            .style("cursor", "pointer")
            .on("click", (event, node) => {
                this.onClickNode(event, node);
            })
            .attr("transform", (node) => `translate(${node.x}, ${node.y})`);

        this.d3Nodes
            .append("image")
            .attr("href", (node) =>
                [
                    webviewMetadata.extensionWebviewURI,
                    "assets",
                    "icons",
                    node.data.fileType + ".svg",
                ].join("/"),
            )
            .attr("x", -8)
            .attr("y", -8)
            .attr("width", this.NODE_SIZE)
            .attr("height", this.NODE_SIZE);

        if (!this.visualConfig.hideFilepaths) {
            this.d3Nodes
                .append("text")
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", (node) =>
                    node.children ? "baseline" : "hanging",
                )
                .attr("x", 0)
                .attr("y", (node) => (node.children ? "-1em" : "+1em"))
                .text((node) => node.data.name)
                .clone()
                .attr("fill", "none");
        }
    }

    // Event handlers

    private onClickBackground = () => {
        this.selectNode(undefined);
    };

    private onClickNode(event: MouseEvent, node: TreeNode) {
        event.stopPropagation();
        if (event.button === 0) {
            // Left click
            if (
                this.selectedNode !== undefined &&
                (event.ctrlKey || event.metaKey)
            ) {
                // Ctrl+click (or command+click on MacOS)
                // Find a path from `this.selectedNode` to `node`
                const paths = this.graph.getAllPaths(
                    this.selectedNode.data,
                    node.data,
                );
                this.highlightPaths(paths);
            } else {
                this.selectNode(node);
            }
        }
    }

    /**
     * Select the given node, and highlight all direct dependencies from it.
     */
    protected selectNode(node?: TreeNode) {
        this.selectedNode = node;

        if (node === undefined) {
            this.unHighlightPaths();
        } else {
            // Zoom into it
            const scale = 2;
            this.zoomTo(
                d3.zoomIdentity
                    .translate(
                        -scale * this.selectedNode.x,
                        -scale * this.selectedNode.y,
                    )
                    .scale(scale),
            );

            // Files this is importing
            const importIds: string[] = Array.from(
                this.graph.adjacencySet[node.data.id],
            );
            // Files this is exporting to
            const exportIds: string[] = Object.keys(
                this.graph.adjacencySet,
            ).filter((nodeId) => this.graph.adjacencySet[nodeId].has(node.data.id));

            this.highlightPaths([
                [node.id],
                ...importIds.map((importId) => [node.data.id, importId]),
                ...exportIds.map((exportId) => [exportId, node.data.id]),
            ]);
        }

        const selectedVizNode = node?.data;
        this.onSelectNode(selectedVizNode);
    }
}
