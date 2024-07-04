// This file is run within the webview

import debounce from "debounce";
import { ForceDirectedVisualization } from "./force-directed-graph";
import { DependencyInfo } from "../code-analyser";
import { setupSettingsPanel } from "./settings-panel";

declare const dependencyInfo: DependencyInfo;

let visualization: ForceDirectedVisualization;

function fitSVGToContainer() {
    const container = document.querySelector(".svg-container");
    visualization.resizeSVG(container.clientWidth, container.clientHeight);
}

const debouncedResizeSVG = debounce(fitSVGToContainer, 50);

// Setup function
(function () {
    // Initialize the visualization's singleton instance
    visualization =
        ForceDirectedVisualization.createSingletonInstance(dependencyInfo);

    // Add resize listener
    window.addEventListener("resize", debouncedResizeSVG);
    // Resize
    debouncedResizeSVG();

    setupSettingsPanel();
})();
