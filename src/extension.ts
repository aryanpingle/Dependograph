// TODO: Analyse dependencies in a child process
// TODO: Save state on focus loss

import * as vscode from "vscode";
import { createPathVisualizationWebview } from "./default-webview";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "import-graph.pathviz",
            createPathVisualizationWebview.bind(undefined, context),
        ),
    );

    // Simple notification command for debugging
    context.subscriptions.push(
        vscode.commands.registerCommand("import-graph.helloWorld", () => {
            vscode.window.showInformationMessage("Hello, world!");
        }),
    );
}

export function deactivate() {}
