import * as vscode from "vscode";
import dependencyTree from "dependency-tree";
import path from "path";

let currentPanel: vscode.WebviewPanel | null = null;

export async function createPathVisualization() {
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
    // Log the dependency graph for now
    // console.log(dependencyGraph);

    currentPanel = vscode.window.createWebviewPanel(
        "customType",
        "Import Graph",
        vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One,
        {},
    );
    const params: WebviewParams = {
        dependencyGraph: dependencyGraph,
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
}

function getWebviewContent(params: WebviewParams): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
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
