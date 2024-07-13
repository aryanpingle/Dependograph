import * as vscode from "vscode";

const vscodeFS = vscode.workspace.fs;

const cachedFileContent = {};
export async function getFileContent(uri: vscode.Uri): Promise<string> {
    const uriString = uri.toString();
    if (uriString in cachedFileContent) {
        return cachedFileContent[uriString];
    }

    // Ensure the URI exists, and it is a file
    try {
        const status = await vscodeFS.stat(uri);
        if (status.type !== vscode.FileType.File) {
            cachedFileContent[uriString] = "";
            return cachedFileContent[uriString];
        }
    } catch {
        cachedFileContent[uriString] = "";
        return cachedFileContent[uriString];
    }

    const bytes = await vscodeFS.readFile(uri);
    const fileContent = new TextDecoder().decode(bytes);
    cachedFileContent[uriString] = fileContent;
    return cachedFileContent[uriString];
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
