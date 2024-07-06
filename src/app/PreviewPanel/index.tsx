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

    getImportNodes(): SimNode[] {
        const visualization = ForceDirectedVisualization.instance;
        const graph = visualization.graph;

        const importNodes = [];

        const selectedNode = this.state.selectedNode;

        for (const link of graph.links) {
            if (link.source === selectedNode) {
                importNodes.push(link.target);
            }
        }

        return importNodes;
    }

    getExportNodes(): SimNode[] {
        const visualization = ForceDirectedVisualization.instance;
        const graph = visualization.graph;

        const exportNodes = [];

        const selectedNode = this.state.selectedNode;

        for (const link of graph.links) {
            if (link.target === selectedNode) {
                exportNodes.push(link.source);
            }
        }

        return exportNodes;
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
                {/* Imports */}
                <b>Imports</b>
                <br />
                {...this.getImportNodes().map((node) => {
                    return (
                        <Fragment>
                            <code>somevariable</code> from{" "}
                            <ClickableNodeLink node={node} />
                            <br />
                        </Fragment>
                    );
                })}
                <hr />
                {/* Exports */}
                <b>Exports</b>
                <br />
                {...this.getExportNodes().map((node) => {
                    return (
                        <Fragment>
                            <code>somevariable</code> to{" "}
                            <ClickableNodeLink node={node} />
                            <br />
                        </Fragment>
                    );
                })}
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
