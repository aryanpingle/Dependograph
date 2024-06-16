// This file is run within the webview

import * as vscode from "vscode";
import {
    SimLink,
    SimNode,
    setupVisualization,
    resizeSVG,
} from "./d3-simulation";
import { AcquiredVsCodeApi } from "../utils";

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

interface DependencyObject {
    [key: string]: DependencyObject;
}

type DirectedGraphObject = Record<string, Record<string, boolean>>;

function longestCommonPrefix(strings: string[]) {
    if (strings.length === 0) return "";
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++)
        while (strings[i].indexOf(prefix) != 0) {
            prefix = prefix.slice(0, prefix.length - 1);
            if (prefix === "") return "";
        }
    return prefix;
}

/**
 * Handles visualizing the dependency graph.
 * @param {Object} dependencyGraph
 */
function onReceivedDependencyGraph(dependencyGraph: DependencyObject) {
    /**
     * {
     *   file: {
     *     dep: isCircular
     *   }
     * }
     */
    const graph: DirectedGraphObject = {};

    // TODO: Check efficiency
    function dfs(obj: DependencyObject) {
        // Add files to nodes array
        for (const file in obj) {
            if (!(file in graph)) {
                graph[file] = {};
            }

            // Add direct dependencies
            for (const dep in obj[file]) {
                // Try to add an edge from file to dep

                // Check if dep is actually a parent of file
                if (dep in graph && file in graph[dep]) {
                    // Circular dependency
                    graph[dep][file] = true;
                } else {
                    // Normal dependency
                    graph[file][dep] = false;
                }
            }
            dfs(obj[file]);
        }
    }
    dfs(dependencyGraph);

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
