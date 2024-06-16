import * as vscode from "vscode";
import { sendDependencyGraph } from "./dependency-graph";
import { getWebviewURI } from "./utils";
import { ExtensionGlobals } from "./extension";

/**
 * Definition of the parameters object passed to the webview
 */
interface WebviewParams {
    cssURIs: vscode.Uri[];
    jsURIs: vscode.Uri[];
}

export class VisualizationEditorProvider {
    private currentPanel: vscode.WebviewPanel | null = null;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly globals: ExtensionGlobals,
    ) {}

    createPanel(filePaths: string[]) {
        // Check if a panel already exists
        if (this.currentPanel !== null) {
            this.currentPanel.reveal(undefined);
            sendDependencyGraph(this.currentPanel.webview, filePaths);
            return;
        }

        if (!vscode.workspace?.workspaceFolders?.[0]) {
            vscode.window.showErrorMessage(`No workspace found.`);
            return;
        }

        this.currentPanel = vscode.window.createWebviewPanel(
            "customType",
            "Dependograph",
            vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One,
            {
                enableScripts: true,
                // TODO: Use get/setState() to improve memory utilization
                retainContextWhenHidden: true,
            },
        );

        // Add listeners to the panel
        this.currentPanel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case "alert":
                    vscode.window.showInformationMessage(
                        `${JSON.stringify(message.data)}`,
                    );
                    break;
            }
        });
        this.currentPanel.onDidDispose(() => {
            this.currentPanel = null;
        });

        // Render the webview
        const params: WebviewParams = {
            cssURIs: [
                getWebviewURI(
                    this.currentPanel.webview,
                    this.context,
                    "assets",
                    "css",
                    "vscode.css",
                ),
                getWebviewURI(
                    this.currentPanel.webview,
                    this.context,
                    "assets",
                    "css",
                    "visualization.css",
                ),
            ],
            jsURIs: [
                getWebviewURI(
                    this.currentPanel.webview,
                    this.context,
                    "out",
                    "webviews",
                    "visualization.js",
                ),
            ],
        };
        this.currentPanel.webview.html = this._getWebviewContent(params);

        sendDependencyGraph(this.currentPanel.webview, filePaths);
    }

    _getWebviewContent(params: WebviewParams): string {
        return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>

    <!-- CSS Stylesheets -->
    ${params.cssURIs
        .map((cssURI) => `<link rel="stylesheet" href="${cssURI}">`)
        .join("")}
    <!-- JS Scripts -->
    ${params.jsURIs
        .map((jsURI) => `<script src="${jsURI}" defer></script>`)
        .join("")}
</head>
<body>
    <div class="svg-container">
        <svg></svg>
    </div>
</body>
</html>
        `;
    }
}
