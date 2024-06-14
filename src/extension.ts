// TODO: Analyse dependencies in a child process
// TODO: Save state on focus loss

import * as vscode from "vscode";
import { createVisualizationEditor } from "./visualization-editor";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "dependograph.pathviz",
            createVisualizationEditor.bind(undefined, context),
        ),
    );

    // Simple notification command for debugging
    context.subscriptions.push(
        vscode.commands.registerCommand("dependograph.helloWorld", () => {
            vscode.window.showInformationMessage("Hello, world!");
        }),
    );
}

export function deactivate() {}
