import {
    vsCodeCheckbox,
    provideVSCodeDesignSystem,
    // @ts-ignore
} from "@vscode/webview-ui-toolkit";
import {
    ForceDirectedVisualization,
    GraphAndVisualizationConfig,
} from "./force-directed";

provideVSCodeDesignSystem().register(vsCodeCheckbox());

let visualization: ForceDirectedVisualization;

export function setupSettingsPanel() {
    // Get the singleton instance
    visualization = ForceDirectedVisualization.instance;

    document
        .querySelector(".settings_header")
        .addEventListener("click", toggleSettingsPanel);

    const formElement = document.querySelector("form") as HTMLFormElement;
    formElement.addEventListener("change", onFormChange);
}

const defaultConfig: GraphAndVisualizationConfig = {
    removeNodeModules: false,
    reverseDirections: false,
    hideFilenames: false,
};

function onFormChange(event: Event) {
    const formElement = event.currentTarget as HTMLFormElement;
    let formConfig = Object.fromEntries(
        // @ts-ignore
        new FormData(formElement),
    ) as GraphAndVisualizationConfig;
    const config = Object.assign({}, defaultConfig, formConfig);
    visualization.applyConfiguration(config);
}

/**
 * Toggle the settings panel to be shown or not.
 */
function toggleSettingsPanel() {
    document
        .querySelector(".settings_content")
        .classList.toggle("settings_content--shown");
}
