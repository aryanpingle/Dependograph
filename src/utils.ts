import * as vscode from "vscode";

export function getNonce() {
    let text = "";
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    [""].sort();
    return text;
}

/**
 * Sort an array in-place into two segments.
 *
 * Elements that map to 0 given by the key function are placed before those that map to 1.
 * Time Complexity: O(N).
 * @param array The array to be sorted
 * @param key A function that maps an element of the array to 0 or 1
 */
export function binarySort<T>(array: T[], key: (element: T) => 0 | 1) {
    let firstEnd = 0;
    for (let i = 0; i < array.length; ++i) {
        if (key(array[i]) === 0) {
            // Swap array[i] with arra[firstEnd]
            const temp = array[i];
            array[i] = array[firstEnd];
            array[firstEnd] = temp;

            ++firstEnd;
        }
    }
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
