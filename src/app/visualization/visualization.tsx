import { h, VNode } from "preact";

import * as d3 from "d3";

import { areObjectsSynced, FileType, syncObjects } from "./utils";
import { GlobalTradeInfo } from "../../trade-analyser";
import { NodeId, VizNode } from "./node";
import { Graph, GraphConfig } from "./graph";

export type SVGSelection = d3.Selection<SVGElement, unknown, Element, any>;
export type SVGGSelection<T> = d3.Selection<SVGGElement, T, Element, any>;

/**
 * Zoom, Pan, selectNode, applyGraphConfig, applyVisualConfig, resizeSVG
 */
export abstract class Visualization<VisualConfig> {
    abstract DefaultConfig: Object;
    abstract ConfigInputElements: VNode[];

    protected abstract visualConfig: VisualConfig;

    /** A D3 selection of the visualization's svg element. */
    protected svgSelection: SVGSelection;
    /** A D3 selection of the container within the SVG on which
     * all zoom and pan operations are applied */
    protected zoomContainer: SVGGSelection<any>;

    public graph: Graph;

    protected constructor(public readonly globalTradeInfo: GlobalTradeInfo) {
        this.graph = new Graph(globalTradeInfo);
    }

    public setupSVGOnMount(svgSelector: string) {
        this.svgSelection = d3.select(svgSelector);

        // Set some properies on the svg
        this.svgSelection
            .attr(
                "style",
                "max-width: 100%; height: auto; font: 12px sans-serif;",
            )
            .call(d3.zoom<SVGElement, unknown>().on("zoom", this.onZoom));

        // Create the zoom container
        this.zoomContainer = this.svgSelection
            .append("g")
            .classed("zoom_container", true);
    }

    private onZoom = (event: any) => {
        this.zoomContainer.attr("transform", event.transform);
    };

    abstract onComponentDidMount(): void;

    /**
     * Resize the visualization's svg element to the given parameters.
     */
    public resizeSVG = (width: number, height: number) => {
        width = Math.floor(width);
        height = Math.floor(height);

        const svgElement = this.svgSelection.node();
        svgElement.setAttribute("width", "" + width);
        svgElement.setAttribute("height", "" + height);
        svgElement.setAttribute(
            "viewBox",
            `-${width / 2} -${height / 2} ${width} ${height}`,
        );
    };

    /**
     * Apply new configuration parameters to the visualization.
     *
     * If any of the graph config params have been changed, the graph is regenerated
     */
    public applyConfiguration(
        config: Partial<GraphConfig | VisualConfig>,
        force: boolean = false,
    ) {
        // If the graph configuration has changed, redo the entire visualization
        if (force || !areObjectsSynced(this.graph.config, config)) {
            this.graph.generateFromConfig(config);
            this.onGraphModified();
            syncObjects(this.visualConfig, config);
            this.createVisuals();
            return;
        }
        // If the visual configuration has changed, pretend like the graph configuration has changed
        if (!areObjectsSynced(this.visualConfig, config)) {
            syncObjects(this.visualConfig, config);
            this.createVisuals();
        }
    }

    /**
     * Perform some actions after the underlying graph is modified.
     */
    protected abstract onGraphModified(): void;

    /**
     * Create the interactive visual elements.
     */
    protected abstract createVisuals(): void;

    /**
     * Visually select the given node, and pass it to onSelectNode.
     */
    protected abstract selectNode(node?: any): void;

    /**
     * A function that will be overwritten and used by the preview panel.
     */
    public onSelectNode(node?: VizNode) {}
}
