// TODO: Analyse dependencies in a child process

import * as vscode from "vscode";
import { VisualizationEditorProvider } from "./visualization-editor";
import { SidebarProvider } from "./sidebar";
import { FileItemsProvider } from "./fs-explorer";

export interface ExtensionGlobals {
    visualizationEditor: VisualizationEditorProvider;
    sidebar: SidebarProvider;
}

export function activate(context: vscode.ExtensionContext) {
    const globals: ExtensionGlobals = {
        visualizationEditor: null,
        sidebar: null,
    };

    const visProvider = new VisualizationEditorProvider(context, globals);
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "dependograph.pathviz",
            visProvider.createPanel.bind(visProvider),
        ),
    );
    globals.visualizationEditor = visProvider;

    const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider(
            "dependograph-fs-explorer",
            new FileItemsProvider(workspace, context),
        ),
    );
}

export function deactivate() {}
