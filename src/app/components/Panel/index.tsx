import { h, Component, VNode } from "preact";

interface Props {
    title: string;
    icon: VNode;
    className: string;
}

interface State {
    shown: boolean;
}

export class Panel extends Component<Props, State> {
    togglePanel = () => {
        this.setState({
            shown: !this.state.shown,
        })
    }

    render({ title, icon, className }: Props, { shown }: State) {
        return (
            <div className={`panel ${className}`}>
                <header className="panel_header" onClick={this.togglePanel}>
                    <span className="panel_title">{title}</span>
                    <span className="button-toggle_panel">{icon}</span>
                </header>
                <div
                    class={`panel_content ${shown ? "panel_content--shown" : ""}`}
                >
                    {this.props.children}
                </div>
            </div>
        );
    }
}
