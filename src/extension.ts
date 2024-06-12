// TODO: Analyse dependencies in a child process

import * as vscode from "vscode";
import { createPathVisualization } from "./path-visualizer";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "import-graph.pathviz",
            createPathVisualization,
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
