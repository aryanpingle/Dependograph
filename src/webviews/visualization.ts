// This file is run within the webview

import {
    setupVisualization,
    resizeSVG,
} from "./force-directed-graph";
import { Graph } from "./utils";
import { DependencyInfo } from "../code-analyser";
import { setupSettingsPanel } from "./settings-panel";

declare const dependencyInfo: DependencyInfo;

function setup() {
    // Add resize listener
    window.addEventListener("resize", (event) => {
        const container = document.querySelector(".svg-container");
        resizeSVG(container.clientWidth, container.clientHeight);
    });
    const container = document.querySelector(".svg-container");
    resizeSVG(container.clientWidth, container.clientHeight);

    setupSettingsPanel();

    let { nodes, links } = new Graph(dependencyInfo).getNodesAndLinks();
    setupVisualization(nodes, links);
}
setup();
