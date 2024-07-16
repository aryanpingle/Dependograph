import { h, Component } from "preact";
import { VizNode } from "../../visualization";
import { AcquiredVsCodeApi } from "webview-utils";

import "./index.css";

// @ts-ignore
const clickableNodeLinkVscode: AcquiredVsCodeApi = acquireVsCodeApi();

interface Props {
    node: VizNode;
    useFilepath?: boolean;
}

interface State {}

export class ClickableNodeLink extends Component<Props, State> {
    onClick = (event:Event) => {
        clickableNodeLinkVscode.postMessage({
            "open": this.props.node.resourceUriString
        })
    }
    render({ node, useFilepath }: Props, {}: State) {
        // TODO: Add a filename property to SimNode
        const text = useFilepath
            ? node.filepath
            : node.filepathWithoutWorkspace;
        return (
            <span className="clickable_node_link-container">
                <code className="clickable_node_link" onClick={this.onClick}>{text}</code>
            </span>
        );
    }
}
