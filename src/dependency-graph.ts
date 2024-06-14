import * as vscode from "vscode";
import dependencyTree from "dependency-tree";

/**
 * Create a dependency graph (if possible) from the entry files and send it to the webview.
 * @param filePaths A list of file paths for each entry file
 */
export function sendDependencyGraph(
    panel: vscode.WebviewPanel,
    filePaths: string[],
) {
    const currentWorkspace = vscode.workspace!.workspaceFolders![0].uri.fsPath;

    const originalLength = filePaths.length;

    filePaths = filePaths.filter((filePath) => {
        return filePath.startsWith(currentWorkspace);
    });
    const filteredLength = filePaths.length;

    if (filteredLength === 0) {
        vscode.window.showErrorMessage(
            "Entry files must be part of the current workspace.",
        );
        return;
    }
    if (originalLength !== filteredLength) {
        vscode.window.showWarningMessage(
            `Ignoring ${originalLength - filteredLength} entry file/s that are not part of the current workspace.`,
        );
    }

    const dependencyGraph = dependencyTree({
        directory: currentWorkspace,
        filename: filePaths[0],
        // TODO: Inefficient. Custom parser should ignore by default.
        filter: (path: string): boolean => {
            if (path.includes("node_modules")) return false;
            return true;
        },
    });

    // Send the dependency graph
    panel.webview.postMessage({
        command: "takeYourDependencyGraph",
        data: dependencyGraph,
        workspace: currentWorkspace,
    });
}
