// This file is run within the webview

import {
    SimLink,
    SimNode,
    setupVisualization,
    resizeSVG,
} from "./force-directed-graph";
import { WebviewEmbeddedMetadata } from "./utils";
import { DependencyInfo } from "../code-analyser";
import { getFileType } from "./utils";

declare const webviewMetadata: WebviewEmbeddedMetadata;
declare const dependencyInfo: DependencyInfo;

function setup() {
    // Add resize listener
    window.addEventListener("resize", (event) => {
        const container = document.querySelector(".svg-container");
        resizeSVG(container.clientWidth, container.clientHeight);
    });
    const container = document.querySelector(".svg-container");
    resizeSVG(container.clientWidth, container.clientHeight);

    onReceivedDependencyGraph(dependencyInfo);
}
setup();

interface GraphRepresentation {
    [key: string]: Record<string, boolean>;
}

// TODO: Maybe the graph should be its own class?

function addEdge(graph: GraphRepresentation, source: string, target: string) {
    if (source in graph[target]) {
        // Circular dependency
        graph[target][source] = true;
    } else {
        // Unidirectional dependency
        graph[source][target] = false;
    }
}

function addNode(graph: GraphRepresentation, node: string) {
    if (!(node in graph)) {
        graph[node] = {};
    }
}

function initGraph(graph: GraphRepresentation, dependencyInfo: DependencyInfo) {
    for (const file in dependencyInfo.filesMapping) {
        addNode(graph, file);

        const importedFilesMapping =
            dependencyInfo.filesMapping[file].importedFilesMapping;
        for (const dep in importedFilesMapping) {
            addNode(graph, dep);
            addEdge(graph, file, dep);
        }
    }
}

/**
 * Process the filename into a name suitable for node objects.
 * Node modules are given single-phrase names.
 * @example "/node_modules/lodash/index.js" -> "lodash"
 */
function getProcessedFilename(filename: string): string {
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
 * Handles visualizing the dependency graph.
 * @param {Object} dependencyInfo
 */
function onReceivedDependencyGraph(dependencyInfo: DependencyInfo) {
    const graph: GraphRepresentation = {};
    initGraph(graph, dependencyInfo);

    // Create nodes and links (and trim their common workspace path)

    const nodes: SimNode[] = [];
    const FilenameToNodeIdx: Map<string, number> = new Map<string, number>();

    // Create all nodes
    for (const file in graph) {
        const nodeIndex = nodes.length;
        let filenameWithoutWorkspace = removeWorkspaceFromFilename(file);
        const fileType = getFileType(filenameWithoutWorkspace);
        const nodeName = getProcessedFilename(filenameWithoutWorkspace);
        nodes.push({
            name: nodeName,
            fileType: fileType,
            index: nodeIndex,
        });

        FilenameToNodeIdx[file] = nodeIndex;
    }
    // Create all links
    const links: SimLink[] = [];
    for (const file in graph) {
        for (const dep in graph[file]) {
            links.push({
                source: FilenameToNodeIdx[file],
                target: FilenameToNodeIdx[dep],
                cyclic: graph[file][dep],
            });
        }
    }

    setupVisualization(nodes, links);
}
