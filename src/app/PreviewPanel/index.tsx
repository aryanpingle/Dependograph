import { h, Component, Fragment, VNode } from "preact";
import { Panel } from "../Panel";
import { PreviewEyeIcon } from "../icons";
import { ForceDirectedVisualization } from "../../force-directed-graph";
import { SimNode } from "../../force-directed-graph/node";
import { DependencyInfo } from "../../code-analyser";
import { ClickableNodeLink } from "./ClickableNodeLink";

import "./index.css";

interface Props {
    dependencyInfo: DependencyInfo;
}

interface State {
    selectedNode?: SimNode;
}

// Simulation. Visualization containing d3nodes and stuff. Unerlying graph.

export class PreviewPanel extends Component<Props, State> {
    componentDidMount(): void {
        const visualization = ForceDirectedVisualization.instance;
        visualization.updatePreviewPanel = (node) => {
            this.setState({ selectedNode: node });
        };
    }

    /**
     * Get the content of the preview panel based on the current state.
     */
    getPreviewContent(): VNode {
        if (this.state.selectedNode === undefined) {
            // No node has been selected
            return (
                <div>
                    Select a node (left click) to view its imports and exports
                    here.
                </div>
            );
        }

        // Some node has been selected
        const node = this.state.selectedNode;
        return (
            <Fragment>
                <b>Selected Filename</b>: <ClickableNodeLink node={node} />
                <hr />
                <b>Path</b>:{" "}
                <ClickableNodeLink node={node} useFilepath={true} />
                <hr />
                {/* Imports (with names) */}
                <div className="preview-imports_section">
                    <b>Imports</b>
                </div>
                <hr />
                {/* Exports (with names) */}
                <div className="preview-exports_section">
                    <b>Exports</b>
                </div>
            </Fragment>
        );
    }

    render(props: Props, state: State) {
        return (
            <Panel
                title="Preview"
                icon={<PreviewEyeIcon />}
                className="preview_panel"
            >
                {this.getPreviewContent()}
            </Panel>
        );
    }
}
