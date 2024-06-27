import { DependencyInfo } from "../../code-analyser";
import { SimLink } from ".";
import { SimNode } from "./node";

export interface GraphRepresentation {
    [key: string]: Set<string>;
}

export class Graph {
    graph: GraphRepresentation = {};
    constructor(dependencyInfo: DependencyInfo) {
        for (const file in dependencyInfo.filesMapping) {
            this.addNode(file);

            const importedFilesMapping =
                dependencyInfo.filesMapping[file].importedFilesMapping;
            for (const dep in importedFilesMapping) {
                this.addNode(dep);
                this.addEdge(file, dep);
            }
        }
    }

    addEdge(source: string, target: string) {
        this.graph[source].add(target);
    }

    addNode(node: string) {
        if (!(node in this.graph)) {
            this.graph[node] = new Set<string>();
        }
    }

    /**
     * Convert the embedded dependency graph to nodes and links
     * after trimming the common workspace path.
     */
    getNodesAndLinks() {
        const nodes: SimNode[] = [];

        const FilepathToNodeId: Map<string, number> = new Map<string, number>();

        // Create all nodes
        for (const file in this.graph) {
            const node = new SimNode(file);
            nodes.push(node);
            FilepathToNodeId[file] = node.id;
        }
        // Create all links
        const links: SimLink[] = [];
        for (const file in this.graph) {
            for (const dep of this.graph[file]) {
                links.push({
                    source: FilepathToNodeId[file],
                    target: FilepathToNodeId[dep],
                    cyclic:
                        this.graph[file].has(dep) && this.graph[dep].has(file),
                });
            }
        }

        return { nodes, links };
    }
}
