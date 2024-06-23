// TODO: Analyse dependencies in a child process

import * as vscode from "vscode";
import { VisualizationEditorProvider } from "./visualization-editor";
import { FileItemsProvider } from "./fs-explorer";

export function activate(context: vscode.ExtensionContext) {
    new VisualizationEditorProvider(context);

    const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider(
            "dependograph-fs-explorer",
            new FileItemsProvider(workspace, context),
        ),
    );
}

export function deactivate() {}
