import {
    vsCodeCheckbox,
    provideVSCodeDesignSystem,
    // @ts-ignore
} from "@vscode/webview-ui-toolkit";
import { setupVisualization } from "./force-directed-graph";
import { Graph } from "./utils";
import { DependencyInfo } from "../code-analyser";

declare const dependencyInfo: DependencyInfo;

provideVSCodeDesignSystem().register(vsCodeCheckbox());

export function setupSettingsPanel() {
    document
        .querySelector(".settings_header")
        .addEventListener("click", toggleSettingsPanel);

    addSettingsListeners();
}

let config = {
    hideModules: false,
    hideFilenames: false,
};

/**
 * Toggle the settings panel to be shown or not.
 */
function toggleSettingsPanel() {
    document
        .querySelector(".settings_content")
        .classList.toggle("settings_content--shown");
}

function addSettingsListeners() {
    const checkboxHideModules = document.querySelector(
        "#checkbox-hide_modules",
    ) as HTMLInputElement;
    checkboxHideModules.addEventListener("change", function () {
        config.hideModules = this.checked;
        setupVisualizationConfig();
    });

    const checkboxHideFilenames = document.querySelector(
        "#checkbox-hide_filenames",
    ) as HTMLInputElement;
    checkboxHideFilenames.addEventListener("change", function () {
        config.hideFilenames = this.checked;
        setupVisualizationConfig();
    });
}

function setupVisualizationConfig() {
    let { nodes, links } = new Graph(dependencyInfo).getNodesAndLinks();

    if (config.hideModules) {
        // Remove node modules
        const NodeModuleNodeIds = new Set<string>();
        nodes.forEach((node) => {
            if (node.fileType === "nodejs") {
                NodeModuleNodeIds.add(node.id);
            }
        });
        nodes = nodes.filter((node) => !NodeModuleNodeIds.has(node.id));
        links = links.filter((link) => {
            return (
                !NodeModuleNodeIds.has(link.source as string) &&
                !NodeModuleNodeIds.has(link.target as string)
            );
        });
    }

    if(config.hideFilenames) {
        nodes.forEach(node => {
            node.name = "";
        })
    }

    setupVisualization(nodes, links);
}
