import { h, Component } from "preact";
import { Panel } from "../Panel";
import { PreviewEyeIcon } from "../../icons";

interface Props {}

interface State {}

export class PreviewPanel extends Component<Props, State> {
    render({}: Props, {}: State) {
        return (
            <Panel
                title="Preview"
                icon={<PreviewEyeIcon />}
                className="preview_panel"
            >
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
            </Panel>
        );
    }
}
