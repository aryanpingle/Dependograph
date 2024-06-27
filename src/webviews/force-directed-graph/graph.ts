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
        this.NodeIdToNode[filepath] = node;

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
        console.log(source);
        console.log(target);

        const allPaths = new Array<string[]>();

        return allPaths;
    }
}
