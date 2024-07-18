import * as vscode from "vscode";

export function getCurrentWorkspaceUri(): vscode.Uri {
    return vscode.workspace.workspaceFolders[0].uri;
}

export function isWebFile(uri: vscode.Uri): boolean {
    return /\.[mc]?[jt]sx?$/.test(uri.fsPath);
}
