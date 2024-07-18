// TODO: Analyse dependencies in a child process

import * as vscode from "vscode";
import { VisualizationEditorProvider } from "./visualization-editor";
import { FileItemsProvider } from "./fs-explorer";
import {
    FileDependencyViewerProvider,
    FileDependencyViewerScheme,
} from "./file-dependency-viewer";
import { getCurrentWorkspaceUri } from "vscode-utils";

export function activate(context: vscode.ExtensionContext) {
    new VisualizationEditorProvider(context);

    const workspaceUri = getCurrentWorkspaceUri();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider(
            "dependograph-fs-explorer",
            new FileItemsProvider(workspaceUri, context),
        ),
    );

    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider(
            FileDependencyViewerScheme,
            new FileDependencyViewerProvider(),
        ),
    );
}

export function deactivate() {}
