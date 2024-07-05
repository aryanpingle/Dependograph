import debounce from "debounce";
import { h, Component } from "preact";
import { ForceDirectedVisualization } from "../../../force-directed-graph";
import { DependencyInfo } from "../../../code-analyser";

interface Props {
    dependencyInfo: DependencyInfo
}

interface State {}

export class Visualization extends Component<Props, State> {
    visualization: ForceDirectedVisualization;

    constructor(props: Props) {
        super(props);
    }

    componentDidMount(): void {
        // Add resize listener
        window.addEventListener("resize", this.debouncedResizeSVG);
        // Resize
        this.debouncedResizeSVG();

        this.visualization =
            ForceDirectedVisualization.createSingletonInstance(this.props.dependencyInfo);
    }

    private fitSVGToContainer = () => {
        const container = document.querySelector(".svg-container");
        this.visualization.resizeSVG(
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
