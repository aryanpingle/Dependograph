import * as vscode from "vscode";
import { getWebviewURI } from "./utils";
import { ExtensionGlobals } from "./extension";

/**
 * Definition of the parameters object passed to the webview
 */
interface WebviewParams {
    cssURIs: vscode.Uri[];
    jsURIs: vscode.Uri[];
}

export class SidebarProvider implements vscode.WebviewViewProvider {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly globals: ExtensionGlobals,
    ) {}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
        };
        webviewView.webview.onDidReceiveMessage(async (data) => {});

        const params: WebviewParams = {
            cssURIs: [
                getWebviewURI(
                    webviewView.webview,
                    this.context,
                    "assets",
                    "css",
                    "vscode",
                ),
            ],
            jsURIs: [],
        };
        webviewView.webview.html = this.getWebviewHTML(params);
    }

    private getWebviewHTML(params: WebviewParams) {
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
        <h1>Hi XD</h1>
</body>
</html>
`;
    }
}
