import * as vscode from "vscode";
import { h, Component, render, Fragment } from "preact";
import { AcquiredVsCodeApi, WebviewEmbeddedMetadata } from "./utils";
import { VisualizationSVG } from "./VisualizationSVG";
import { SettingsPanel } from "./SettingsPanel";
import { PreviewPanel } from "./PreviewPanel";
import { GlobalTradeInfo } from "../trade-analyser";
import { ForceVisualization, Visualization } from "./visualization";
import { TreeVisualization } from "./visualization/tree";

/**
 * Definition of the parameters object passed to the webview
 */
export interface WebviewParams {
    cssURIs: vscode.Uri[];
    jsURIs: vscode.Uri[];
    webviewMetadata: WebviewEmbeddedMetadata;
    globalTradeInfo: GlobalTradeInfo;
}

declare const globalTradeInfo: GlobalTradeInfo;
declare const webviewMetadata: WebviewEmbeddedMetadata;
declare function acquireVsCodeApi(): AcquiredVsCodeApi;

interface State {}

interface Props {
    globalTradeInfo: GlobalTradeInfo;
    webviewMetadata: WebviewEmbeddedMetadata;
    acquireVsCodeApi(): AcquiredVsCodeApi;
    visualization: Visualization<any>;
}

class Webview extends Component<Props, State> {
    render(props: Props, state: State) {
        return (
            <Fragment>
                <VisualizationSVG
                    visualization={props.visualization}
                    globalTradeInfo={props.globalTradeInfo}
                />
                <SettingsPanel visualization={props.visualization} />
                <PreviewPanel
                    visualization={props.visualization}
                    globalTradeInfo={props.globalTradeInfo}
                />
            </Fragment>
        );
    }
}

render(
    <Webview
        globalTradeInfo={globalTradeInfo}
        acquireVsCodeApi={acquireVsCodeApi}
        webviewMetadata={webviewMetadata}
        visualization={new TreeVisualization(globalTradeInfo)}
    />,
    document.body,
);
