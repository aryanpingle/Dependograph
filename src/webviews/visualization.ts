// This file is run within the webview

import * as vscode from "vscode";
import {
    SimLink,
    SimNode,
    setupVisualization,
    resizeSVG,
} from "./d3-simulation";
import { AcquiredVsCodeApi, longestCommonPrefix } from "./utils";
import { DependencyInfo } from "../code-analyser";

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

// TODO: Set some global extension-level variables at the top
let workspace: string;

window.addEventListener("message", ({ data: message }) => {
    workspace = message.workspace;
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

    // Create nodes and links (and trim their common workspace)
    const nodes: SimNode[] = [];
    const links: SimLink[] = [];
    for (const file in graph) {
        nodes.push({
            name: file.replace(workspace, ""),
        });
        for (const dep in graph[file]) {
            links.push({
                source: file.replace(workspace, ""),
                target: dep.replace(workspace, ""),
                cyclic: graph[file][dep],
            });
        }
    }

    // Remove common prefixes (optional, disabled right now)
    if (false) {
        let commonPrefix = longestCommonPrefix(nodes.map((node) => node.name));

        // Hacky way to get the path separator without using the path module
        const pathSep = workspace.startsWith("/") ? "/" : "\\";
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
