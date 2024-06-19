// This file is run within the webview

import * as vscode from "vscode";
import {
    SimLink,
    SimNode,
    setupVisualization,
    resizeSVG,
} from "./d3-simulation";
import { AcquiredVsCodeApi, WebviewEmbeddedMetadata, longestCommonPrefix } from "./utils";
import { DependencyInfo } from "../code-analyser";
import { getFileType } from "./utils";

declare const webviewMetadata: WebviewEmbeddedMetadata;

// @ts-ignore
const vscodeAPI: AcquiredVsCodeApi = acquireVsCodeApi();

function setup() {
    // Add resize listener
    window.addEventListener("resize", (event) => {
        const container = document.querySelector(".svg-container");
        resizeSVG(container.clientWidth, container.clientHeight);
    });
    const container = document.querySelector(".svg-container");
    resizeSVG(container.clientWidth, container.clientHeight);
}
setup();

window.addEventListener("message", ({ data: message }) => {
    switch (message.command) {
        case "takeYourDependencyGraph":
            onReceivedDependencyGraph(message.data);
            break;
    }
});

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
 * Handles visualizing the dependency graph.
 * @param {Object} dependencyInfo
 */
function onReceivedDependencyGraph(dependencyInfo: DependencyInfo) {
    const graph: GraphRepresentation = {};
    initGraph(graph, dependencyInfo);

    // Create nodes and links (and trim their common workspace path)
    const workspacePath = webviewMetadata.workspaceURI.fsPath;
    const nodes: SimNode[] = [];
    const links: SimLink[] = [];
    for (const file in graph) {
        const nodeObj: SimNode = {
            name: file.replace(workspacePath, ""),
            fileType: "file",
        }
        nodeObj.fileType = getFileType(nodeObj.name);
        nodes.push(nodeObj);

        for (const dep in graph[file]) {
            links.push({
                source: file.replace(workspacePath, ""),
                target: dep.replace(workspacePath, ""),
                cyclic: graph[file][dep],
            });
        }
    }

    // Remove common prefixes (optional, disabled right now)
    if (false) {
        let commonPrefix = longestCommonPrefix(nodes.map((node) => node.name));

        // Hacky way to get the path separator without using the path module
        const pathSep = workspacePath.startsWith("/") ? "/" : "\\";
        const lastSepIndex = commonPrefix.lastIndexOf(pathSep);
        if (lastSepIndex !== -1) {
            commonPrefix = commonPrefix.substring(0, lastSepIndex + 1);

            for (const node of nodes) {
                node.name = node.name.replace(commonPrefix, "");
            }
            for (const link of links) {
                link.source = (link.source as string).replace(commonPrefix, "");
                link.target = (link.target as string).replace(commonPrefix, "");
            }
        }
    }

    // console.log(nodes, links);

    setupVisualization(nodes, links);
}
