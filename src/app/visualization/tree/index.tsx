/**
 * References:
 * https://observablehq.com/@d3/mobile-patent-suits
 */

import * as d3 from "d3";
import {
    WebviewEmbeddedMetadata,
    getMinimalFilepaths,
    FileType,
} from "../utils";
import { GlobalTradeInfo } from "../../../trade-analyser";
import { VscodeColors, createCSSVariable } from "vscode-webview-variables";
import { Visualization, SVGSelection, SVGGSelection } from "../visualization";
import { Graph, GraphConfig } from "../graph";
import { NodeId, VizNode } from "../node";
import { VNode } from "preact";
// @ts-ignore
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";

declare const webviewMetadata: WebviewEmbeddedMetadata;

export type TreeNode = d3.HierarchyNode<VizNode>;
export type TreeLink = d3.HierarchyLink<VizNode>;

// Colors
const colors = {
    links: "currentColor",
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

export class TreeVisualization extends Visualization<VisualConfig> {
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
    private root: TreeNode;
    private nodes: VizNode[];

    private d3Nodes: SVGGSelection<TreeNode>;
    private d3Links: SVGGSelection<TreeLink>;

    public visualConfig: VisualConfig;

    private selectedNode?: TreeNode;

    private NODE_SIZE = 16;

    public constructor(globalTradeInfo: GlobalTradeInfo) {
        super(globalTradeInfo);
        this.visualConfig = this.DefaultConfig;
    }

    public onComponentDidMount(): void {
        // Setup a click listener on the svg element (for unselecting)
        this.svgSelection.on("click", this.onClickBackground);

        const defaultConfig = Object.assign(
            {},
            Graph.DefaultConfig,
            this.DefaultConfig,
        );
        this.applyConfiguration(defaultConfig, true);
    }

    protected onGraphModified() {
        this.nodes = this.graph.nodes;
        this.root = d3.hierarchy(
            this.graph.nodes.find((node) => node.isEntryFile),
            (node) => {
                console.log("node", node);
                // Find all children of this node
                const nodeFilepath = node.filepath;
                const dependencyFilepaths = Object.keys(
                    this.globalTradeInfo.files[nodeFilepath].dependencies,
                );
                return dependencyFilepaths
                    .map(
                        (depFilepath) =>
                            this.graph.UriStringToNodeId[depFilepath],
                    )
                    .map((depNodeId) => this.graph.NodeIdToNode[depNodeId]);
            },
        );
        const tree = d3
            .tree()
            .nodeSize([this.NODE_SIZE * 4, this.NODE_SIZE * 10]);
        // Compute the x and y coordinates
        tree(this.root);
    }

    protected override createVisuals() {
        this.initializeDrawing();

        console.log("create vis");
        if (this.visualConfig.minimalFilepaths) {
            const shortPaths = getMinimalFilepaths(
                this.nodes.map((node) => node.filepathWithoutWorkspace),
            );
            console.log(shortPaths);
            const filepathToShortPath = {};
            this.nodes.forEach((node, index) => {
                filepathToShortPath[node.filepathWithoutWorkspace] =
                    shortPaths[index];
            });

            // TODO: Writing the select for each setting is painful
            // Store each component (text, icon, etc) as an instance variable
            this.d3Nodes
                .selectAll("text")
                .text(
                    (node: TreeNode) =>
                        filepathToShortPath[node.data.filepathWithoutWorkspace],
                );
        }
    }

    protected initializeDrawing() {
        this.createD3Links();
        this.createD3Markers();
        this.createD3Nodes();
    }

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

    private getLinkArc = (link: TreeLink) => {
        const source = link.source;
        const target = link.target;
        const path = d3.path();
        path.moveTo(source.x, source.y);
        path.bezierCurveTo(
            // Control point 1
            source.x,
            source.y + this.NODE_SIZE,
            // Control point 2
            target.x,
            target.y,
            // End
            target.x,
            target.y,
        );
        // Draws an arc from the source to the target in a clockwise manner
        return path.toString();
    };

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
                .attr("x", 0)
                .attr("y", (node) => (node.children ? "-1em" : "+1em"))
                .text((node) => node.data.name)
                .clone()
                .attr("fill", "none");
        }
    }

    // private getLinkArc = (link: SimLink, fromSource: boolean) => {
    //     const source = (fromSource ? link.source : link.target) as TreeNode;
    //     const target = (fromSource ? link.target : link.source) as TreeNode;
    //     const r = Math.hypot(target.x - source.x, target.y - source.y);
    //     // Draws an arc from the source to the target in a clockwise manner
    //     return `
    //       M${source.x},${source.y}
    //       A${r},${r} 0 0,1 ${target.x},${target.y}
    //     `;
    // };

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

    private highlightPaths(allPaths: string[][]) {
        d3.selectAll(".node").style("opacity", 0.1);
        d3.selectAll(".link").style("opacity", 0.1);
        for (const path of allPaths) {
            // Highlight nodes
            path.forEach((nodeId) => {
                d3.select(`#node-${nodeId}`).style("opacity", 1);
            });

            // Highlight links
            for (let i = 0; i < path.length - 1; ++i) {
                let fromNodeId = path[i];
                let toNodeId = path[i + 1];
                d3.select(`#link-${fromNodeId}-${toNodeId}`).style(
                    "opacity",
                    1,
                );
                d3.select(`#link-${toNodeId}-${fromNodeId}`).style(
                    "opacity",
                    1,
                );
            }
        }
    }

    private unHighlightPaths() {
        d3.selectAll(".node").style("opacity", 1);
        d3.selectAll(".link").style("opacity", 1);
    }

    /**
     * Select the given node, and highlight all direct dependencies from it.
     */
    protected selectNode(node?: TreeNode) {
        this.selectedNode = node;

        if (node === undefined) {
            this.unHighlightPaths();
        }

        this.onSelectNode(node.data);
    }
}
