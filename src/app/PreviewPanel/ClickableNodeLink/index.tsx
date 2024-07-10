import { h, Component } from "preact";
import { VizNode } from "../../visualization";

import "./index.css";

interface Props {
    node: VizNode;
    useFilepath?: boolean;
}

interface State {}

export class ClickableNodeLink extends Component<Props, State> {
    render({ node, useFilepath }: Props, {}: State) {
        // TODO: Add a filename property to SimNode
        const text = useFilepath
            ? node.filepath
            : node.filepathWithoutWorkspace;
        return (
            <span className="clickable_node_link-container">
                <code className="clickable_node_link">{text}</code>
            </span>
        );
    }
}
