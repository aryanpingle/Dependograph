import { VNode } from "preact";
import { GlobalTradeInfo } from "../../trade-analyser";
import { FileType } from "../utils";
import { NodeId, VizNode } from "./node";
import { areObjectsSynced, syncObjects } from "./utils";
// @ts-ignore
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";

export interface AdjacencySet {
    [key: NodeId]: Set<NodeId>;
}

export interface GraphConfig {
    removeNodeModules: boolean;
    reverseDirections: boolean;
}

/**
 * Constructs nodes from the given dependency information using a given configuration.
 */
export class Graph {
    static DefaultConfig: GraphConfig = {
        removeNodeModules: false,
        reverseDirections: false,
    }
    static ConfigInputElements: VNode[] = [
        <VSCodeCheckbox name="removeNodeModules">Hide NodeJS Packages</VSCodeCheckbox>,
        <VSCodeCheckbox name="reverseDirections">Reverse Dependency Directions</VSCodeCheckbox>
    ];

    nodes: VizNode[];

    config: GraphConfig;

    /** An object that maps a uri string to a set of other uri strings */
    adjacencySet: AdjacencySet;
    /** Maps uri strings to the id of their corresponding node */
    UriStringToNodeId: Map<string, NodeId>;
    /** Maps node id's to their corresponding node */
    NodeIdToNode: Record<string, VizNode>;

    public constructor(private readonly globalTradeInfo: GlobalTradeInfo) {
        this.config = Graph.DefaultConfig;
        this.generateFromConfig(Graph.DefaultConfig, true);
    }

    /**
     * Generate the underlying graph using this object's current configuration state.
     */
    public generateFromConfig(config: Partial<GraphConfig>, force: boolean = false) {
        if(!force) {
            // Check if there's any need to update
            if (areObjectsSynced(config, this.config)) {
                return;
            }
        }
        syncObjects(this.config, config);
        
        this.nodes = [];
        this.adjacencySet = {};
        this.UriStringToNodeId = new Map();
        this.NodeIdToNode = {};

        // 1. Add all nodes
        for (const uristring in this.globalTradeInfo.files) {
            const node = this.addNode(uristring);
            if (
                node.fileType === FileType.NODEJS &&
                this.config.removeNodeModules
            )
                continue;
            this.UriStringToNodeId[uristring] = node.id;

            const dependencies =
                this.globalTradeInfo.files[uristring].dependencies;
            for (const dependencyFilepath in dependencies) {
                const node = this.addNode(dependencyFilepath);
                if (
                    node.fileType === FileType.NODEJS &&
                    this.config.removeNodeModules
                )
                    continue;
                this.UriStringToNodeId[dependencyFilepath] = node.id;
            }
        }

        // 2. Add all edges
        for (const sourceFilepath in this.globalTradeInfo.files) {
            const dependencies =
                this.globalTradeInfo.files[sourceFilepath].dependencies;
            for (const targetFilepath in dependencies) {
                const sourceId = this.UriStringToNodeId[sourceFilepath];
                const targetId = this.UriStringToNodeId[targetFilepath];
                this.addEdge(sourceId, targetId);
            }
        }
    }

    private addEdge(sourceId: string, targetId: string) {
        if (sourceId === undefined || targetId === undefined) return;
        this.adjacencySet[sourceId].add(targetId);
    }

    private addNode(filepath: string): VizNode {
        if (filepath in this.UriStringToNodeId) {
            const nodeId = this.UriStringToNodeId[filepath];
            const node = this.NodeIdToNode[nodeId];
            return node;
        }
        const node = new VizNode(filepath);
        if (node.fileType === FileType.NODEJS && this.config.removeNodeModules)
            return node;
        this.nodes.push(node);
        this.NodeIdToNode[node.id] = node;

        this.adjacencySet[node.id] = new Set<string>();
        return node;
    }

    /**
     * Get all paths from source to target.
     *
     * If a path does not end at the target, it means ending node already has at least one path to the target.
     */
    getAllPaths(source: VizNode, target: VizNode): NodeId[][] {
        const allPaths: NodeId[][] = [];

        const NodeIdToFeasibility = new Map<NodeId, boolean>();
        NodeIdToFeasibility[target.id] = true;

        const dfsToTarget = (node: VizNode, path: NodeId[]): boolean => {
            if (node.id in NodeIdToFeasibility) {
                if (NodeIdToFeasibility[node.id] === true) {
                    // Even though *this* path may terminate before reaching the target, we
                    // know that we can reach the target if we continue from here.
                    // Since we only care about highlighting nodes and links, this is perfect.

                    path.push(node.id);
                    allPaths.push(Array.from(path));
                    path.pop();

                    return true;
                } else {
                    return false;
                }
            }

            NodeIdToFeasibility[node.id] = false;

            path.push(node.id);
            if (node.id === target.id) {
                allPaths.push(Array.from(path));
            } else {
                for (const neighbourId of this.adjacencySet[node.id]) {
                    const neighbourNode = this.NodeIdToNode[neighbourId];
                    const canReachTarget = dfsToTarget(neighbourNode, path);
                    if (canReachTarget) {
                        NodeIdToFeasibility[node.id] = true;
                    }
                }
            }
            path.pop();

            return NodeIdToFeasibility[node.id];
        };
        dfsToTarget(source, []);

        return allPaths;
    }
}
