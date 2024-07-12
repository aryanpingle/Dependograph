import * as vscode from "vscode";
import { h, Component, render, Fragment } from "preact";
import { AcquiredVsCodeApi, WebviewEmbeddedMetadata } from "./utils";
import { VisualizationSVG } from "./VisualizationSVG";
import { SettingsPanel } from "./SettingsPanel";
import { PreviewPanel } from "./PreviewPanel";
import { GlobalTradeInfo } from "../trade-analyser";
import { ForceVisualization, Visualization } from "./visualization";
import { TreeVisualization } from "./visualization/tree";
import { VizType, VizTypeBar } from "./VisualizationTypeBar";

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

interface State {
    visualization: Visualization<any>;
}

interface Props {
    globalTradeInfo: GlobalTradeInfo;
    webviewMetadata: WebviewEmbeddedMetadata;
    acquireVsCodeApi(): AcquiredVsCodeApi;
}

class Webview extends Component<Props, State> {
    state: State = {
        visualization: new ForceVisualization(globalTradeInfo),
    }

    onVisualizationChange(vizType: VizType) {
        switch(vizType) {
            case "force":
                this.setState({
                    visualization: new ForceVisualization(globalTradeInfo),
                })
                break;
            case "tree":
                this.setState({
                    visualization: new TreeVisualization(globalTradeInfo),
                })
                break;
        }
    }

    render(props: Props, state: State) {
        return (
            <Fragment>
                <VisualizationSVG
                    visualization={state.visualization}
                    globalTradeInfo={props.globalTradeInfo}
                />
                <SettingsPanel visualization={state.visualization} />
                <PreviewPanel
                    visualization={state.visualization}
                    globalTradeInfo={props.globalTradeInfo}
                />
                <VizTypeBar onVisualizationChange={(vizType) => this.onVisualizationChange(vizType)}/>
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
