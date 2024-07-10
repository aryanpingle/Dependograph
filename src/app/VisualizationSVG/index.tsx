import debounce from "debounce";
import { h, Component } from "preact";
import { GlobalTradeInfo } from "../../trade-analyser";
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

    componentDidMount(): void {
        this.props.visualization.setupSVGOnMount("svg");
        this.props.visualization.onComponentDidMount();
    
        // Add resize listener
        window.addEventListener("resize", this.debouncedResizeSVG);
        // Resize
        this.debouncedResizeSVG();
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
                <svg></svg>
            </div>
        );
    }
}
