// TODO: Analyse dependencies in a child process

import * as vscode from "vscode";
import { VisualizationEditorProvider } from "./visualization-editor";
import { SidebarProvider } from "./sidebar";

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

    // Simple notification command for debugging
    context.subscriptions.push(
        vscode.commands.registerCommand("dependograph.helloWorld", () => {
            vscode.window.showInformationMessage("Hello, world!");
        }),
    );

    const sidebarProvider = new SidebarProvider(context, globals);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "dependograph-sidebar",
            sidebarProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
            },
        ),
    );
    globals.sidebar = sidebarProvider;
}

export function deactivate() {}
