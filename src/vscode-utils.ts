import * as vscode from "vscode";

export function getCurrentWorkspaceUri(): vscode.Uri {
    return vscode.workspace.workspaceFolders[0].uri;
}

export function isWebFile(uri: vscode.Uri): boolean {
    return /\.[mc]?[jt]sx?$/.test(uri.fsPath);
}

/**
 * Get the contents of a file from its URI.
 * If the file does not exist, `null` is returned.
 */
export async function getFileContent(uri: vscode.Uri): Promise<string | null> {
    // Ensure the URI exists, and it is a file
    try {
        const status = await vscode.workspace.fs.stat(uri);
        if (status.type !== vscode.FileType.File) {
            return undefined;
        }
    } catch {
        return undefined;
    }

    const bytes = await vscode.workspace.fs.readFile(uri);
    const fileContent = new TextDecoder().decode(bytes);
    return fileContent;
}

export async function getUriStat(uri: vscode.Uri): Promise<vscode.FileStat | null> {
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        return stat;
    } catch {}

    return null;
}
