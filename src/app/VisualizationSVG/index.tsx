import debounce from "debounce";
import { h, Component } from "preact";
import { GlobalTradeInfo } from "trade-analyser";
import { Visualization } from "../visualization";

import "./index.css";

interface Props {
    globalTradeInfo: GlobalTradeInfo;
    visualization: Visualization<any>;
}

interface State {}

export class VisualizationSVG extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
    }

    setupSVG(): void {
        this.props.visualization.setupSVGOnMount("svg");
        this.props.visualization.onComponentRendered();

        // Add resize listener
        window.addEventListener("resize", this.debouncedResizeSVG);
        // Resize
        this.debouncedResizeSVG();
    }

    componentDidMount(): void {
        this.setupSVG();
    }

    componentDidUpdate(): void {
        this.setupSVG();
    }

    private fitSVGToContainer = () => {
        const container = document.querySelector(".svg-container");
        this.props.visualization.resizeSVG(
            container.clientWidth,
            container.clientHeight,
        );
    };

    private debouncedResizeSVG = debounce(this.fitSVGToContainer, 50);

    render(props: Props, state: State) {
        return (
            <div className="svg-container">
                <svg>
                    <g className="zoom_container"></g>
                </svg>
            </div>
        );
    }
}
