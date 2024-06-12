import * as vscode from "vscode";
import dependencyTree from "dependency-tree";
import path from "path";

export async function onPathVisualization() {
    const isDevelopment = process.env.VSCODE_DEBUG_MODE === "true";

    const currentWorkspace = vscode.workspace?.workspaceFolders?.[0].uri.fsPath;
    if (!currentWorkspace) {
        vscode.window.showErrorMessage(`No workspace found.`);
        return;
    }

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
            if(path.includes("node_modules")) return false;
            return true;
        }
    });
    // Log the dependency graph for now
    // console.log(dependencyGraph);

    const panel = vscode.window.createWebviewPanel(
        "customType",
        "Import Graph",
        vscode.ViewColumn.One,
        {},
    );
    const params: WebviewParams = {
        dependencyGraph: dependencyGraph,
    };
    panel.webview.html = getWebviewContent(params);
}

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
