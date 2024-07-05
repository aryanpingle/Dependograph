import * as vscode from "vscode";
import { h, Component, render, Fragment } from "preact";
import { AcquiredVsCodeApi, WebviewEmbeddedMetadata } from "./utils";
import { DependencyInfo } from "../code-analyser";
import { Visualization } from "./components/Visualization";
import { SettingsPanel } from "./components/SettingsPanel";
import { PreviewPanel } from "./components/PreviewPanel";

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
    render(
        { acquireVsCodeApi, dependencyInfo, webviewMetadata }: Props,
        state: State,
    ) {
        return (
            <Fragment>
                <Visualization dependencyInfo={dependencyInfo}></Visualization>
                <SettingsPanel />
                <PreviewPanel />
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
