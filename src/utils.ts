import * as vscode from "vscode";

export interface AcquiredVsCodeApi {
    postMessage(message: any): void;
    getState(): any;
}

export function getNonce() {
    let text = "";
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * Get a URI for a resource in a webview within the context of an extension.
 */
export function getWebviewURI(
    webview: vscode.Webview,
    context: vscode.ExtensionContext,
    ...pathSegments: string[]
) {
    return webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, ...pathSegments),
    );
}
