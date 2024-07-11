import { VNode } from "preact";
import { GlobalTradeInfo } from "../../trade-analyser";
import { NodeId, VizNode } from "./node";
import { areObjectsSynced, FileType, getFileType, syncObjects } from "../utils";
// @ts-ignore
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";

export interface AdjacencySet {
    [key: NodeId]: Set<NodeId>;
}

export interface GraphConfig {
    removeNodeModules: boolean;
    reverseDirections: boolean;
    separateCyclicDependencies: boolean;
}

/**
 * Constructs nodes from the given dependency information using a given configuration.
 */
export class Graph {
    static DefaultConfig: GraphConfig = {
        removeNodeModules: false,
        reverseDirections: false,
        separateCyclicDependencies: false,
    };
    static ConfigInputElements: VNode[] = [
        <VSCodeCheckbox name="removeNodeModules">
            Hide NodeJS Packages
        </VSCodeCheckbox>,
        <VSCodeCheckbox name="reverseDirections">
            Reverse Dependency Directions
        </VSCodeCheckbox>,
    ];

    nodes: VizNode[];

    config: GraphConfig;

    /** An object that maps a uri string to a set of other uri strings */
    adjacencySet: AdjacencySet;
    /**
     * Maps uri strings to the id of its corresponding node.
     *
     * Sometimes, multiple such nodes may exist due to removal of cyclic dependencies.
     * In that case, the returned node will be the original (first created).
     */
    private UriStringToNodeId: Map<string, NodeId>;
    /** Maps node id's to their corresponding node */
    NodeIdToNode: Record<string, VizNode>;

    public constructor(private readonly globalTradeInfo: GlobalTradeInfo) {
        this.config = Graph.DefaultConfig;
        this.generateFromConfig(Graph.DefaultConfig, true);
    }

    /**
     * Generate the underlying graph using this object's current configuration state.
     */
    public generateFromConfig(
        config: Partial<GraphConfig>,
        force: boolean = false,
    ) {
        if (!force) {
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
            // If node modules need to be removed
            if (
                getFileType(uristring) === FileType.NODEJS &&
                this.config.removeNodeModules
            )
                continue;

            this.addNode(uristring);
        }

        // 2. Add all edges
        // BFS traversal starting from the entry files
        // If adding an edge will cause a cyclic dependency, point to a clone instead
        const visited = new Set();
        Object.keys(this.globalTradeInfo.files).forEach(uriString => {
            const isEntryFile = this.globalTradeInfo.files[uriString].isEntryFile;
            if(!isEntryFile) return;

            const queue = [uriString];
            const componentVisited = new Set(queue);
            while(queue.length !== 0) {
                const current = queue.shift();

                if(visited.has(current)) continue;
                visited.add(current);

                const sourceId = this.UriStringToNodeId[current];

                // Add links to its dependencies
                const dependencies = this.globalTradeInfo.files[current].dependencies;
                for(const dependency in dependencies) {
                    // If this uri string is not part of the graph (maybe it was removed)
                    // then ignore it.
                    if(!(dependency in this.UriStringToNodeId)) continue;

                    const targetId = this.UriStringToNodeId[dependency];

                    if(componentVisited.has(dependency)) {
                        // Adding this dependency will create a cycle
                        if(this.config.separateCyclicDependencies) {
                            // console.log("cloning", dependency)
                            // Create a clone and point to it
                            const clonedNode = this.addNode(dependency);
                            this.addEdge(sourceId, clonedNode.id);
                        } else {
                            // console.log("pointing to original", dependency)
                            // Cycles are fine, point to the original
                            this.addEdge(sourceId, targetId)
                        }
                    } else {
                        // console.log("adding", dependency)
                        // Adding this dependency won't create a cycle
                        this.addEdge(sourceId, targetId)
                        queue.push(dependency);
                        componentVisited.add(dependency)
                    }
                }
            }
        })
    }

    private addEdge(sourceId: string, targetId: string) {
        this.adjacencySet[sourceId].add(targetId);
    }

    /**
     * Create a new node for this uri string and officially make it a part of the graph.
     */
    private addNode(uriString: string): VizNode {
        const isEntryFile = this.globalTradeInfo.files[uriString].isEntryFile;

        // Create the node
        const node = new VizNode(uriString, isEntryFile);
        this.nodes.push(node);
        this.NodeIdToNode[node.id] = node;
        this.adjacencySet[node.id] = new Set<string>();
        if(!this.UriStringToNodeId.has(uriString)) {
            this.UriStringToNodeId[uriString] = node.id;
        }

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
