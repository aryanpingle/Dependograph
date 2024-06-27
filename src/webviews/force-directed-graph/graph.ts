import { DependencyInfo } from "../../code-analyser";
import { SimLink } from ".";
import { SimNode } from "./node";

export interface AdjacencySet {
    [key: string]: Set<string>;
}

export interface GraphConfig {
    removeNodeModules: boolean;
    reverseDirections: boolean;
}

/**
 * Constructs nodes and links from the given dependency information using a configuration.
 */
export class Graph {
    adjacencySet: AdjacencySet = {};
    NodeIdToNode: Record<string, SimNode> = {};

    nodes: SimNode[];
    links: SimLink[];

    constructor(
        dependencyInfo: DependencyInfo,
        private readonly config: GraphConfig,
    ) {
        this.nodes = [];
        this.links = [];

        // 1. Add all nodes
        const FilepathToNodeId = new Map<string, string>();
        for (const filepath in dependencyInfo.filesMapping) {
            const id = this.addNode(filepath);
            FilepathToNodeId[filepath] = id;
        }

        // 2. Add all edges
        for (const sourceFilepath in dependencyInfo.filesMapping) {
            const importedFilesMapping =
                dependencyInfo.filesMapping[sourceFilepath]
                    .importedFilesMapping;
            for (const targetFilepath in importedFilesMapping) {
                const sourceId = FilepathToNodeId[sourceFilepath];
                const targetId = FilepathToNodeId[targetFilepath];
                this.addEdge(sourceId, targetId);
            }
        }

        // 3. Create links from edges
        this.createLinks();
    }

    addEdge(sourceId: string, targetId: string) {
        this.adjacencySet[sourceId].add(targetId);
    }

    addNode(filepath: string): string {
        const node = new SimNode(filepath);
        this.nodes.push(node);
        this.NodeIdToNode[node.id] = node;

        this.adjacencySet[node.id] = new Set<string>();
        return node.id;
    }

    createLinks() {
        const visitedNodeIds = new Set<string>();
        for (const sourceId in this.adjacencySet) {
            for (const targetId of this.adjacencySet[sourceId]) {
                // If there is already a link between source and target
                if (
                    visitedNodeIds.has(targetId) &&
                    this.adjacencySet[targetId].has(sourceId)
                )
                    continue;

                // Establish a cyclic or acyclic link
                this.links.push({
                    source: sourceId,
                    target: targetId,
                    cyclic: this.adjacencySet[targetId].has(sourceId),
                });
            }

            visitedNodeIds.add(sourceId);
        }
    }

    /**
     * Convert the embedded dependency graph to nodes and links
     * after trimming the common workspace path.
     */
    getNodesAndLinks() {
        const nodes: SimNode[] = [];

        // Create all links
        const links: SimLink[] = [];
        for (const file in this.adjacencySet) {
            for (const dep of this.adjacencySet[file]) {
            }
        }

        return { nodes, links };
    }

    getAllPaths(source: SimNode, target: SimNode): string[][] {
        // console.log(
        //     `from ${source.filepathWithoutWorkspace} to ${target.filepathWithoutWorkspace}`,
        // );
        const allPaths: string[][] = new Array();

        const NodeIdToFeasibility = new Map<string, boolean>();
        NodeIdToFeasibility[target.id] = true;

        const dfsToTarget = (node: SimNode, path: string[]): boolean => {
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
            // console.log("visiting " + node.name);

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
