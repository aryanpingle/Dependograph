import {
    vsCodeCheckbox,
    provideVSCodeDesignSystem,
    // @ts-ignore
} from "@vscode/webview-ui-toolkit";
import { ForceDirectedVisualization, GraphAndVisualizationConfig } from "./force-directed";

provideVSCodeDesignSystem().register(vsCodeCheckbox());

let visualization: ForceDirectedVisualization;

export function setupSettingsPanel() {
    // Get the singleton instance
    visualization = ForceDirectedVisualization.instance;

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
        visualization.applyConfiguration({
            removeNodeModules: this.checked
        })
    });

    const checkboxHideFilenames = document.querySelector(
        "#checkbox-hide_filenames",
    ) as HTMLInputElement;
    checkboxHideFilenames.addEventListener("change", function () {
        visualization.applyConfiguration({
            hideFilenames: this.checked,
        })
    });
}
