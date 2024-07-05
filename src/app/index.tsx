import * as vscode from "vscode";
import { h, Component, render, Fragment } from "preact";
import {
    VSCodeCheckbox,
    // @ts-ignore
} from "@vscode/webview-ui-toolkit/react";
import { AcquiredVsCodeApi, WebviewEmbeddedMetadata } from "./utils";
import { DependencyInfo } from "../code-analyser";
import { PreviewEyeIcon, SettingsGearIcon } from "./icons";
import { Visualization } from "./components/Visualization";
import { setupPanels } from "../webviews/panel";
import { setupSettingsPanel } from "../webviews/settings-panel";

/**
 * Definition of the parameters object passed to the webview
 */
export interface WebviewParams {
    cssURIs: vscode.Uri[];
    jsURIs: vscode.Uri[];
    webviewMetadata: WebviewEmbeddedMetadata;
    dependencyInfo: DependencyInfo;
}

declare const dependencyInfo: DependencyInfo;
declare const webviewMetadata: WebviewEmbeddedMetadata;
declare function acquireVsCodeApi(): AcquiredVsCodeApi;

interface State {}

interface Props {
    dependencyInfo: DependencyInfo;
    webviewMetadata: WebviewEmbeddedMetadata;
    acquireVsCodeApi(): AcquiredVsCodeApi;
}

class Webview extends Component<Props, State> {
    componentDidMount(): void {
        setupPanels();

        setupSettingsPanel();
    }

    render(
        { acquireVsCodeApi, dependencyInfo, webviewMetadata }: Props,
        state: State,
    ) {
        return (
            <Fragment>
                <Visualization dependencyInfo={dependencyInfo}></Visualization>
                <div className="panel settings_panel">
                    <header className="panel_header">
                        <span className="panel_title">Settings</span>
                        <span className="button-toggle_panel">
                            <SettingsGearIcon></SettingsGearIcon>
                        </span>
                    </header>
                    <div class="panel_content">
                        <form action="" id="form-settings">
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
                    </div>
                </div>
                <div className="panel preview-panel">
                    <header className="panel_header">
                        <span className="panel_title">Preview</span>
                        <span className="button-toggle_panel">
                            <PreviewEyeIcon></PreviewEyeIcon>
                        </span>
                    </header>
                    <div className="panel_content">
                        {/* Selected Node */}
                        <p>
                            <b>Selected Node</b>
                            <div
                                className="preview-selected_node"
                                style="overflow: auto;"
                            ></div>
                        </p>
                        {/* Imports (with names) */}
                        <div className="preview-imports_section"></div>
                        {/* Exports (with names) */}
                        <div className="preview-exports_section"></div>
                    </div>
                </div>
            </Fragment>
        );
    }
}

render(
    <Webview
        dependencyInfo={dependencyInfo}
        acquireVsCodeApi={acquireVsCodeApi}
        webviewMetadata={webviewMetadata}
    />,
    document.body,
);
