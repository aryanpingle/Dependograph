import * as vscode from "vscode";
import dependencyTree from "dependency-tree";
import path from "path";

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

export async function createPathVisualization(
    context: vscode.ExtensionContext,
) {
    console.log(context.extensionPath);

    // Check if a panel already exists
    if (currentPanel !== null) {
        currentPanel.reveal(undefined);
        return;
    }

    const isDevelopment = process.env.VSCODE_DEBUG_MODE === "true";

    const currentWorkspace = vscode.workspace?.workspaceFolders?.[0].uri.fsPath;
    if (!currentWorkspace) {
        vscode.window.showErrorMessage(`No workspace found.`);
        return;
    }

    // TODO: Allow multiple entry files
    // Allow user to select an entry file
    const selectedFiles = await vscode.window.showOpenDialog({
        canSelectMany: false,
        title: "Select an entry file",
        openLabel: "Use as entry file",
    });
    if (selectedFiles === undefined) {
        // Cancelled
        return;
    }

    const entryFileURI = selectedFiles[0];

    if (!path.dirname(entryFileURI.fsPath).startsWith(currentWorkspace)) {
        vscode.window.showErrorMessage(
            "Entry file must be contained within the current workspace.",
        );
        return;
    }

    const dependencyGraph = dependencyTree({
        directory: currentWorkspace,
        filename: entryFileURI.fsPath,
        // TODO: Inefficient. Custom parser should ignore by default.
        filter: (path: string): boolean => {
            if (path.includes("node_modules")) return false;
            return true;
        },
    });

    currentPanel = vscode.window.createWebviewPanel(
        "customType",
        "Import Graph",
        vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One,
        {},
    );
    const params: WebviewParams = {
        dependencyGraph: dependencyGraph,
        cssURIs: [getWebviewURI(context, "assets", "css", "vscode.css")],
        jsURIs: [],
    };
    currentPanel.webview.html = getWebviewContent(params);

    currentPanel.onDidDispose(() => {
        currentPanel = null;
    });
}

/**
 * Definition of the parameters object passed to the webview
 */
interface WebviewParams {
    dependencyGraph: Object;
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
    <input type="text">
    <p>
        ${JSON.stringify(params.dependencyGraph, undefined, 4).replaceAll("\n", "<br>").replaceAll(" ", "&nbsp;")}
    </p>
</body>
</html>
    `;
}
