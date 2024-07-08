import * as vscode from "vscode";
import { h, Component, render, Fragment } from "preact";
import { AcquiredVsCodeApi, WebviewEmbeddedMetadata } from "./utils";
import { VisualizationSVG } from "./VisualizationSVG";
import { SettingsPanel } from "./SettingsPanel";
import { PreviewPanel } from "./PreviewPanel";
import { GlobalTradeInfo } from "../trade-analyser";

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
}

class Webview extends Component<Props, State> {
    render(
        { acquireVsCodeApi, globalTradeInfo, webviewMetadata }: Props,
        state: State,
    ) {
        return (
            <Fragment>
                <VisualizationSVG globalTradeInfo={globalTradeInfo} />
                <SettingsPanel />
                <PreviewPanel globalTradeInfo={globalTradeInfo} />
            </Fragment>
        );
    }
}

render(
    <Webview
        globalTradeInfo={globalTradeInfo}
        acquireVsCodeApi={acquireVsCodeApi}
        webviewMetadata={webviewMetadata}
    />,
    document.body,
);
