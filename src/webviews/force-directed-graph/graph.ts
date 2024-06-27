import {
    WebviewEmbeddedMetadata,
    getFileType,
    processNodeModulesFilename,
} from "../utils";

import { DependencyInfo } from "../../code-analyser";
import { SimNode, SimLink } from ".";

declare const webviewMetadata: WebviewEmbeddedMetadata;

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
