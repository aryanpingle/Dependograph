import * as vscode from "vscode";
import { getDependencyObject } from "./code-analyser";
import path from "path";

/**
 * Create a dependency graph (if possible) from the entry files and send it to the webview.
 * @param filePaths A list of file paths for each entry file
 */
export async function sendDependencyGraph(
    webview: vscode.Webview,
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

    const dependencyGraph = await getDependencyObject(filePaths, [
        path.dirname(filePaths[0]),
    ]);
    // console.log(dependencyGraph);

    // Send the dependency graph
    webview.postMessage({
        command: "takeYourDependencyGraph",
        data: dependencyGraph,
        workspace: currentWorkspace,
    });
}
