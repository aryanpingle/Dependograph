import { h, Component } from "preact";
import { ForceVizIcon, TreeVizIcon } from "../icons";

import "./index.css";

interface Props {
    onVisualizationChange(vizType: VizType): void;
}

interface State {}

const VIZ_TYPE_BUTTON_SELECTED = "viz_type_button--selected";

export type VizType = "force" | "tree";

export class VizTypeBar extends Component<Props, State> {
    onVizTypeClick = (event: Event) => {
        const button = event.currentTarget as HTMLElement;
        if (button.classList.contains(VIZ_TYPE_BUTTON_SELECTED)) {
            // noop
        } else {
            document
                .querySelector("." + VIZ_TYPE_BUTTON_SELECTED)
                .classList.remove(VIZ_TYPE_BUTTON_SELECTED);
            button.classList.add(VIZ_TYPE_BUTTON_SELECTED);
            this.props.onVisualizationChange(button.dataset.vizType as VizType);
        }
    };

    render() {
        return (
            <div className="viz_type_bar">
                <div
                    className={`viz_type_button ${VIZ_TYPE_BUTTON_SELECTED}`}
                    data-viz-type="force"
                    title="Force Directed Visualization"
                    onClick={this.onVizTypeClick}
                >
                    <ForceVizIcon />
                </div>
                <div
                    className="viz_type_button"
                    data-viz-type="tree"
                    title="Tree Visualization"
                    onClick={this.onVizTypeClick}
                >
                    <TreeVizIcon />
                </div>
            </div>
        );
    }
}
