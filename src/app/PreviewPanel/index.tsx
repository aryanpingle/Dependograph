import { h, Component, Fragment, VNode } from "preact";
import { Panel } from "../Panel";
import { PreviewEyeIcon } from "../icons";
import { GlobalTradeInfo } from "trade-analyser";
import { ClickableNodeLink } from "./ClickableNodeLink";

import "./index.css";
import { Visualization, VizNode } from "../visualization";

interface Props {
    globalTradeInfo: GlobalTradeInfo;
    visualization: Visualization<any>;
}

interface State {
    selectedNode?: VizNode;
}

export class PreviewPanel extends Component<Props, State> {
    componentDidMount(): void {
        this.props.visualization.onSelectNode = (node) => {
            this.setState({ selectedNode: node });
        };
    }

    componentDidUpdate(): void {
        this.props.visualization.onSelectNode = (node) => {
            this.setState({ selectedNode: node });
        };
    }

    componentWillReceiveProps(
        nextProps: Readonly<Props>,
        nextContext: any,
    ): void {
        this.setState({
            selectedNode: undefined,
        });
    }

    getImportNodes(): VizNode[] {
        const visualization = this.props.visualization;
        const graph = visualization.graph;

        const selectedNode = this.state.selectedNode;
        const selectedNodeId = selectedNode.id;

        // Get all dependencies of the selected file
        const importedNodeIds = Array.from(graph.adjacencySet[selectedNodeId]);
        const importNodes = importedNodeIds.map(
            (nodeId) => graph.NodeIdToNode[nodeId],
        );

        return importNodes;
    }

    getExportNodes(): VizNode[] {
        const visualization = this.props.visualization;
        const graph = visualization.graph;

        const selectedNode = this.state.selectedNode;
        const selectedNodeId = selectedNode.id;

        // Check if any file has the selected file as its dependency
        const exportedNodes: VizNode[] = [];
        for (const sourceNodeId in graph.adjacencySet) {
            const dependencyNodeIds = graph.adjacencySet[sourceNodeId];
            if (dependencyNodeIds.has(selectedNodeId)) {
                const sourceNode = graph.NodeIdToNode[sourceNodeId];
                exportedNodes.push(sourceNode);
            }
        }
        return exportedNodes;
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
