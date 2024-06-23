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
        let { nodes, links } = new Graph(dependencyInfo).getNodesAndLinks();

        if(this.checked) {
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

        setupVisualization(nodes, links);
    });
}
