import { h, Component, VNode } from "preact";
import { Panel } from "../Panel";
import { SettingsGearIcon } from "../icons";
// @ts-ignore
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import {
    ForceDirectedVisualization,
    GraphAndVisualizationConfig,
} from "../../force-directed-graph";

import "./index.css";

interface Props {}

interface State {}

const defaultConfig: GraphAndVisualizationConfig = {
    removeNodeModules: false,
    reverseDirections: false,
    hideFilenames: false,
    minimalFilepaths: false,
};

export class SettingsPanel extends Component<Props, State> {
    formElement?: HTMLFormElement;

    onFormChange = () => {
        const visualization = ForceDirectedVisualization.instance;

        let formConfig = Object.fromEntries(
            // @ts-ignore
            new FormData(this.formElement),
        ) as GraphAndVisualizationConfig;
        const config = Object.assign({}, defaultConfig, formConfig);

        visualization.applyConfiguration(config);
    };

    render({}: Props, {}: State) {
        return (
            <Panel
                title="Settings"
                icon={<SettingsGearIcon />}
                className="settings_panel"
            >
                <form
                    action=""
                    id="form-settings"
                    ref={(formElement) => (this.formElement = formElement)}
                    onChange={this.onFormChange}
                >
                    <VSCodeCheckbox
                        name="removeNodeModules"
                        id="checkbox-hide_modules"
                    >
                        Hide NodeJS modules
                    </VSCodeCheckbox>
                    <VSCodeCheckbox
                        name="minimalFilepaths"
                        id="checkbox-minimal_filepaths"
                    >
                        Shorten filepaths
                    </VSCodeCheckbox>
                    <VSCodeCheckbox
                        name="hideFilenames"
                        id="checkbox-hide_filenames"
                    >
                        Hide filenames
                    </VSCodeCheckbox>
                </form>
            </Panel>
        );
    }
}
