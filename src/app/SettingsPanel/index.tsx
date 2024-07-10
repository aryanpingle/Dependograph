import { h, Component } from "preact";
import { Panel } from "../Panel";
import { SettingsGearIcon } from "../icons";

import "./index.css";
import { Graph, Visualization } from "../visualization";

interface Props {
    visualization: Visualization<any>;
}

interface State {}

export class SettingsPanel extends Component<Props, State> {
    formElement?: HTMLFormElement;
    defaultConfig: Object;

    componentDidMount(): void {
        const { visualization } = this.props;
        this.defaultConfig = Object.assign(
            {},
            Graph.DefaultConfig,
            visualization.DefaultConfig,
        );
    }

    onFormChange = () => {
        let formConfig = Object.fromEntries(
            // @ts-ignore
            new FormData(this.formElement),
        );
        const config = Object.assign({}, this.defaultConfig, formConfig);
        this.props.visualization.applyConfiguration(config);
    };

    render({ visualization }: Props, {}: State) {
        return (
            <Panel
                title="Settings"
                icon={<SettingsGearIcon />}
                className="settings_panel"
            >
                <form
                    action=""
                    id="form-settings"
                    ref={(formElement) => (this.formElement = formElement)}
                    onChange={this.onFormChange}
                >
                    {...Graph.ConfigInputElements}
                    {...visualization.ConfigInputElements}
                </form>
            </Panel>
        );
    }
}
