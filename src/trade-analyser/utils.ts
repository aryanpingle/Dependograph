import * as vscode from "vscode";

const vscodeFS = vscode.workspace.fs;

export async function getFileContent(uri: vscode.Uri): Promise<string> {
    // Ensure the URI exists, and it is a file
    try {
        const status = await vscodeFS.stat(uri);
        if (status.type !== vscode.FileType.File) {
            return "";
        }
    } catch {
        return "";
    }

    const bytes = await vscodeFS.readFile(uri);
    const fileContent = new TextDecoder().decode(bytes);
    return fileContent;
}

export async function doesUriExist(uri: vscode.Uri) {
    try {
        await vscodeFS.stat(uri);
        return true;
    } catch {
        return false;
    }
}

export async function doesUriDirectoryExist(uri: vscode.Uri) {
    try {
        await vscodeFS.readDirectory(uri);
        return true;
    } catch {
        return false;
    }
}
