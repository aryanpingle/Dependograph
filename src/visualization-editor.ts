import * as vscode from "vscode";
import { WebviewEmbeddedMetadata } from "./webviews/utils";
import path from "path";
import { DependencyInfo, getDependencyObject } from "./code-analyser";
import * as ejs from "ejs";
import * as fs from "fs";

/**
 * Definition of the parameters object passed to the webview
 */
interface WebviewParams {
    cssURIs: vscode.Uri[];
    jsURIs: vscode.Uri[];
    webviewMetadata: WebviewEmbeddedMetadata;
    dependencyInfo: DependencyInfo;
    settings_icon: string;
    preview_icon: string;
}

export class VisualizationEditorProvider {
    private currentEditor: vscode.WebviewPanel | null = null;

    public constructor(private readonly context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.sendEntryFiles",
                (stringifiedEntryFiles: string) => {
                    const entryFiles = JSON.parse(stringifiedEntryFiles);
                    this.createOrShowEditor(entryFiles);
                },
            ),
        );
    }

    /**
     * Get a URI of a path relative to the extension's data.
     */
    private getWebviewURI(...pathSegments: string[]): vscode.Uri {
        return this.currentEditor.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, ...pathSegments),
        );
    }

    public async createOrShowEditor(filepaths: string[]) {
        // Check if the editor already exists
        if (this.currentEditor !== null) {
            this.currentEditor.reveal(undefined);
        } else {
            this.createEditor();
        }

        await this.setEditorWebview(filepaths);
    }

    /**
     * Creates a new editor tab in the window and sets its event listeners.
     */
    private createEditor() {
        const workspace = vscode.workspace?.workspaceFolders?.[0];
        if (!workspace) {
            vscode.window.showErrorMessage(`No workspace found.`);
            return;
        }

        this.currentEditor = vscode.window.createWebviewPanel(
            "customType",
            "Dependency Visualization",
            vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One,
            {
                enableScripts: true,
                // TODO: Use get/setState() to improve memory utilization
                retainContextWhenHidden: true,
            },
        );
        this.currentEditor.iconPath = vscode.Uri.joinPath(
            this.context.extensionUri,
            "assets",
            "images",
            "extension-logo.png",
        );

        // Add listeners to the editor webview
        this.currentEditor.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case "alert":
                    vscode.window.showInformationMessage(
                        `${JSON.stringify(message.data)}`,
                    );
                    break;
            }
        });
        this.currentEditor.onDidDispose(() => {
            this.currentEditor = null;
        });
    }

    /**
     * Set the webview of the editor after getting the dependency graph
     * using the given files.
     */
    private async setEditorWebview(filepaths: string[]) {
        const workspaceUri = vscode.workspace.workspaceFolders![0].uri;
        const workspacePath = workspaceUri.fsPath;

        let params: WebviewParams = {} as WebviewParams;
        params["cssURIs"] = [
            this.getWebviewURI("assets", "css", "vscode.css"),
            this.getWebviewURI("assets", "css", "visualization.css"),
        ];
        params["jsURIs"] = [
            this.getWebviewURI("out", "webviews", "visualization.js"),
        ];
        const extensionWebviewUri = this.currentEditor.webview.asWebviewUri(
            this.context.extensionUri,
        );
        params["webviewMetadata"] = {
            pathSep: path.sep,
            workspaceURI: workspaceUri,
            extensionWebviewURI: extensionWebviewUri.toString(),
        };
        params["dependencyInfo"] = await getDependencyObject(filepaths, [
            workspacePath,
        ]);
        params.settings_icon = fs
            .readFileSync(
                path.join(
                    this.context.extensionUri.fsPath,
                    "assets",
                    "icons",
                    "settings-gear.svg",
                ),
            )
            .toString();
        params.preview_icon = fs
            .readFileSync(
                path.join(
                    this.context.extensionUri.fsPath,
                    "assets",
                    "icons",
                    "preview.svg",
                ),
            )
            .toString();

        const ejsContent = fs
            .readFileSync(
                path.join(
                    this.context.extensionUri.fsPath,
                    "assets",
                    "ejs",
                    "visualization.ejs",
                ),
            )
            .toString();
        this.currentEditor.webview.html = ejs.render(ejsContent, params);
    }
}
