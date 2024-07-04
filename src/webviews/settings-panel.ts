import {
    vsCodeCheckbox,
    provideVSCodeDesignSystem,
    // @ts-ignore
} from "@vscode/webview-ui-toolkit";
import {
    ForceDirectedVisualization,
    GraphAndVisualizationConfig,
} from "./force-directed-graph";

provideVSCodeDesignSystem().register(vsCodeCheckbox());

let visualization: ForceDirectedVisualization;

export function setupSettingsPanel() {
    // Get the singleton instance
    visualization = ForceDirectedVisualization.instance;

    const formElement = document.querySelector("form") as HTMLFormElement;
    formElement.addEventListener("change", onFormChange);
}

const defaultConfig: GraphAndVisualizationConfig = {
    removeNodeModules: false,
    reverseDirections: false,
    hideFilenames: false,
    minimalFilepaths: false,
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
