import * as vscode from "vscode";
import { sendDependencyGraph } from "./dependency-graph";

let currentPanel: vscode.WebviewPanel | null = null;

/**
 * Get a URI for the given resource within the context of the extension's panel.
 */
function getWebviewURI(
    context: vscode.ExtensionContext,
    ...pathSegments: string[]
) {
    return currentPanel!.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, ...pathSegments),
    );
}

export async function createVisualizationEditor(
    context: vscode.ExtensionContext,
) {
    // Check if a panel already exists
    if (currentPanel !== null) {
        currentPanel.reveal(undefined);
        return;
    }

    if (!vscode.workspace?.workspaceFolders?.[0]) {
        vscode.window.showErrorMessage(`No workspace found.`);
        return;
    }

    currentPanel = vscode.window.createWebviewPanel(
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
    currentPanel.webview.onDidReceiveMessage((message) => {
        switch (message.command) {
            case "alert":
                vscode.window.showInformationMessage(
                    `${JSON.stringify(message.data)}`,
                );
                break;
            case "getDependencyGraph":
                sendDependencyGraph(currentPanel!, message.data);
                break;
        }
    });
    currentPanel.onDidDispose(() => {
        currentPanel = null;
    });

    // Render the webview
    const params: WebviewParams = {
        cssURIs: [
            getWebviewURI(context, "assets", "css", "vscode.css"),
            getWebviewURI(context, "assets", "css", "visualization.css"),
        ],
        jsURIs: [getWebviewURI(context, "out", "webviews", "visualization.js")],
    };
    currentPanel.webview.html = getWebviewContent(params);
}

/**
 * Definition of the parameters object passed to the webview
 */
interface WebviewParams {
    cssURIs: vscode.Uri[];
    jsURIs: vscode.Uri[];
}

function getWebviewContent(params: WebviewParams): string {
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
    <div class="abs">
        <input type="file" name="input-entry_file" id="input-entry_file" multiple>
        <label>
            <input type="checkbox" name="input-hide_names" id="input-hide_names">
            Hide filenames
        </label>
    </div>
    <div class="svg-container">
        <svg></svg>
    </div>
</body>
</html>
    `;
}