import { getFileType, processNodeModulesFilename } from "../utils";

import { DependencyInfo } from "../../code-analyser";
import { SimNode, SimLink } from ".";
import { webviewMetadata } from "../utils";

export interface GraphRepresentation {
    [key: string]: Record<string, boolean>;
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
        if (source in this.graph[target]) {
            // Circular dependency
            this.graph[target][source] = true;
        } else {
            // Unidirectional dependency
            this.graph[source][target] = false;
        }
    }

    addNode(node: string) {
        if (!(node in this.graph)) {
            this.graph[node] = {};
        }
    }

    /**
     * Convert the embedded dependency graph to nodes and links
     * after trimming the common workspace path.
     */
    getNodesAndLinks() {
        const nodes: SimNode[] = [];

        const NodeIdSet = new Set<string>();
        const FilepathToNodeId: Map<string, number> = new Map<string, number>();

        function createNodeId(): string {
            return Math.random().toFixed(10 + 2);
        }

        // Create all nodes
        for (const file in this.graph) {
            let nodeId = createNodeId();
            while (NodeIdSet.has(nodeId)) nodeId = createNodeId();

            NodeIdSet.add(nodeId);

            let filenameWithoutWorkspace = removeWorkspaceFromFilename(file);
            const fileType = getFileType(filenameWithoutWorkspace);
            const nodeName = processNodeModulesFilename(
                filenameWithoutWorkspace,
            );
            nodes.push({
                name: nodeName,
                processedFilepath: nodeName,
                fileType: fileType,
                id: nodeId,
            });

            FilepathToNodeId[file] = nodeId;
        }
        // Create all links
        const links: SimLink[] = [];
        for (const file in this.graph) {
            for (const dep in this.graph[file]) {
                links.push({
                    source: FilepathToNodeId[file],
                    target: FilepathToNodeId[dep],
                    cyclic: this.graph[file][dep],
                });
            }
        }

        return { nodes, links };
    }
}
/**
 * Remove the leading workspace directory from the given filename.
 */

export function removeWorkspaceFromFilename(filename: string): string {
    const workspacePath = webviewMetadata.workspaceURI.fsPath;
    return filename.replace(workspacePath, "");
}
/**
 * Check if two objects have the same value for every common property.
 * @param object1
 * @param object2
 * @returns
 */

export function areObjectsSynced(object1: Object, object2: Object) {
    for (const property in object1) {
        if (!object2.hasOwnProperty(property)) continue;
        if (object2[property] !== object1[property]) return false;
    }
    return true;
}
/**
 * Assign values from the source object to the target object
 * for all common properties.
 */

export function syncObjects(target: Object, source: Object) {
    for (const property in target) {
        if (!source.hasOwnProperty(property)) continue;
        target[property] = source[property];
    }
}
