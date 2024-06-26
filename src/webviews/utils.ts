import { Uri } from "vscode";
import { DependencyInfo } from "../code-analyser";
import { SimLink, SimNode } from "./force-directed";

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

/**
 * Get the shortest version of each filepath in an array without getting duplicates.
 * 
 * @example
 * // returns ["index.ts", "folder1/util.ts", "folder2/util.ts"]
 * getMinimalFilepaths(
 *   ["/src/index.ts", "/src/folder1/util.ts", "/src/folder2/util.ts"],
 *   "/"
 * )
 */
export function getMinimalFilepaths(
    filepaths: string[],
    pathSep: string,
): string[] {
    const splitPaths = filepaths.map((filepath) => filepath.split(pathSep));
    const startIndices = splitPaths.map((splitPath) => splitPath.length - 1);
    // Initially, everything is just the filename + extension
    const shortPaths = splitPaths.map(
        (splitPath, index) => splitPath[startIndices[index]],
    );

    const getFrequencyObject = (): Record<string, number> => {
        const freqObj: Record<string, number> = {};
        for (const shortPath of shortPaths) {
            if (!(shortPath in freqObj)) {
                freqObj[shortPath] = 0;
            }
            ++freqObj[shortPath];
        }
        return freqObj;
    };

    let hasChanged = false;
    do {
        hasChanged = false;
        const freqObj = getFrequencyObject();
        for (let index = 0; index < shortPaths.length; ++index) {
            let shortPath = shortPaths[index];
            if (freqObj[shortPath] > 1) {
                startIndices[index] -= 1;
                const startIndex = startIndices[index];
                shortPath = splitPaths[index][startIndex] + pathSep + shortPath;
                shortPaths[index] = shortPath;

                hasChanged = true;
            }
        }
    } while (hasChanged);

    return shortPaths;
}
