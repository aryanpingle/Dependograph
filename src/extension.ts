// TODO: Analyse dependencies in a child process

import * as vscode from "vscode";
import { VisualizationEditorProvider } from "./visualization-editor";
import { FileItemsProvider } from "./fs-explorer";
import {
    CustomTextEditorProvider,
    FileDependencyViewerScheme,
} from "./file-dependency-viewer";

export function activate(context: vscode.ExtensionContext) {
    new VisualizationEditorProvider(context);

    const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider(
            "dependograph-fs-explorer",
            new FileItemsProvider(workspace, context),
        ),
    );

    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(
            FileDependencyViewerScheme,
            new CustomTextEditorProvider(),
        ),
    );
}

export function deactivate() {}
