// This file is run within the webview

import { ForceDirectedVisualization } from "./force-directed";
import { DependencyInfo } from "../code-analyser";
import { setupSettingsPanel } from "./settings-panel";

declare const dependencyInfo: DependencyInfo;

let visualization: ForceDirectedVisualization;

function onWindowResize() {
    const container = document.querySelector(".svg-container");
    visualization.resizeSVG(container.clientWidth, container.clientHeight);
}

// Setup function
(function () {
    // Initialize the visualization's singleton instance
    visualization =
        ForceDirectedVisualization.createSingletonInstance(dependencyInfo);

    // Add resize listener
    window.addEventListener("resize", onWindowResize);
    // Resize
    onWindowResize();

    setupSettingsPanel();
})();
