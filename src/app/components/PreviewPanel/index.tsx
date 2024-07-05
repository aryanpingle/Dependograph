import { h, Component, Fragment } from "preact";
import { Panel } from "../Panel";
import { PreviewEyeIcon } from "../../icons";
import { ForceDirectedVisualization } from "../../../force-directed-graph";
import { SimNode } from "../../../force-directed-graph/node";
import { DependencyInfo } from "../../../code-analyser";

import "./index.css";

interface Props {
    dependencyInfo: DependencyInfo;
}

interface State {
    node?: SimNode;
}

export class PreviewPanel extends Component<Props, State> {
    componentDidMount(): void {
        const visualization = ForceDirectedVisualization.instance;
        visualization.updatePreviewPanel = (node) => {
            this.setState({ node: node });
        };
    }

    render(props: Props, state: State) {
        return (
            <Panel
                title="Preview"
                icon={<PreviewEyeIcon />}
                className="preview_panel"
            >
                {state.node ? (
                    // Some node has been selected
                    <Fragment>
                        <b>Selected Node</b>
                        <div
                            className="preview-selected_node"
                            style="overflow: auto;"
                        >
                            {state.node.filepathWithoutWorkspace}
                        </div>
                        <br />

                        {/* Imports (with names) */}
                        <div className="preview-imports_section"></div>
                        <br />

                        {/* Exports (with names) */}
                        <div className="preview-exports_section"></div>
                    </Fragment>
                ) : (
                    // No node has been selected
                    <div>Select a node (left click) to view its imports and exports here.</div>
                )}
            </Panel>
        );
    }
}
