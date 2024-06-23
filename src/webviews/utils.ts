import { Uri } from "vscode";
import { DependencyInfo } from "../code-analyser";
import { SimLink, SimNode } from "./force-directed-graph";

declare const webviewMetadata: WebviewEmbeddedMetadata;
export interface AcquiredVsCodeApi {
    postMessage(message: any): void;
    getState(): any;
}

export interface WebviewEmbeddedMetadata {
    workspaceURI: Uri;
    extensionWebviewURI: string;
    pathSep: string;
}

export type FileType =
    | "css"
    | "file"
    | "javascript"
    | "nodejs"
    | "react"
    | "sass"
    | "typescript";

/**
 * Get the file "type" (which is synonymous with the file icon name).
 * TODO: Not robust enough to cover DOS systems.
 */
export function getFileType(filepath: string, pathSep: string = "/"): FileType {
    // NodeJS
    if (/^@/.test(filepath)) return "nodejs";
    if (/^[^\\\/]/.test(filepath)) return "nodejs";
    if (filepath.indexOf(":") != -1 && filepath.indexOf(":\\") == -1)
        return "nodejs";
    if (/(?:\\|\/)node_modules(?:\\|\/)/.test(filepath)) return "nodejs";

    if (/\.js$/.test(filepath)) return "javascript";
    if (/\.ts$/.test(filepath)) return "typescript";
    if (/\.tsx$/.test(filepath)) return "react";
    if (/\.css$/.test(filepath)) return "css";
    if (/\.scss$/.test(filepath)) return "sass";

    return "file";
}

/**
 * Get the longest common prefix of an array of strings.
 */
export function longestCommonPrefix(strings: string[]) {
    if (strings.length === 0) return "";
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++)
        while (strings[i].indexOf(prefix) != 0) {
            prefix = prefix.slice(0, prefix.length - 1);
            if (prefix === "") return "";
        }
    return prefix;
}

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
        const FilepathToNodeId: Map<string, number> = new Map<
            string,
            number
        >();

        function createNodeId(): string {
            return Math.random().toFixed(10 + 2);
        }

        // Create all nodes
        for (const file in this.graph) {
            let nodeId = createNodeId();
            while(NodeIdSet.has(nodeId)) nodeId = createNodeId();

            NodeIdSet.add(nodeId);

            let filenameWithoutWorkspace = removeWorkspaceFromFilename(file);
            const fileType = getFileType(filenameWithoutWorkspace);
            const nodeName = processNodeModulesFilename(
                filenameWithoutWorkspace,
            );
            nodes.push({
                name: nodeName,
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
 * If the given filename corresponds to a NodeJS module,
 * give it a single-phrase name.
 * @example "/node_modules/lodash/index.js" -> "lodash"
 */
function processNodeModulesFilename(filename: string): string {
    const pathSep = webviewMetadata.pathSep;

    const nodeModulesPrefix = pathSep + "node_modules" + pathSep;
    if (filename.startsWith(nodeModulesPrefix)) {
        const moduleEndIndex = filename.indexOf(
            pathSep,
            nodeModulesPrefix.length,
        );
        filename = filename.substring(nodeModulesPrefix.length, moduleEndIndex);
    }

    return filename;
}

/**
 * Remove the leading workspace directory from the given filename.
 */
function removeWorkspaceFromFilename(filename: string): string {
    const workspacePath = webviewMetadata.workspaceURI.fsPath;
    return filename.replace(workspacePath, "");
}
