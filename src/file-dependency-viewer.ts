import * as vscode from "vscode";
import {
    VscodeCSSVariables,
    createCSSVariable,
} from "vscode-webview-variables";

export const FileDependencyViewerScheme = "customscheme";

export class CustomTextEditorProvider
    implements vscode.TextDocumentContentProvider
{
    // Taken from:
    //https://github.com/microsoft/vscode-extension-samples/blob/main/virtual-document-sample/src/extension.ts
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    async provideTextDocumentContent(customUri: vscode.Uri): Promise<string> {
        const resourceUri =
            CustomTextEditorProvider.convertToResourceUri(customUri);
        const bytes = await vscode.workspace.fs.readFile(resourceUri);
        return bytes.toString();
    }

    /**
     * Get a custom URI from a resource's URI.
     * This is achieved by using a custom scheme, and putting the original
     * resource's scheme into the fragment property of the URI.
     *
     * NOTE: The original resource's URI will be lost as a result.
     */
    static convertToCustomUri(resourceUri: vscode.Uri) {
        return resourceUri.with({
            scheme: FileDependencyViewerScheme,
            fragment: resourceUri.scheme,
        });
    }

    /**
     * Get the original resource's URI back from the custom format.
     *
     * NOTE: The original resource's fragment has been lost, and will return
     * a blank string.
     */
    static convertToResourceUri(customUri: vscode.Uri) {
        return customUri.with({
            scheme: customUri.fragment,
            fragment: "",
        });
    }
}

export async function highlightDependencies(resourceUri: vscode.Uri) {
    // Open a readonly editor using the given resource URI
    const customUri = CustomTextEditorProvider.convertToCustomUri(resourceUri);
    const doc = await vscode.workspace.openTextDocument(customUri);
    await vscode.window.showTextDocument(doc, { preview: false });

    const editor = vscode.window.activeTextEditor;
    const editorDocument = editor.document;

    // Test: Highlight the first line
    const lineHighlight = createCSSVariable(
        VscodeCSSVariables["diffEditor-insertedTextBackground"],
        "hotpink",
    );
    const decoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: lineHighlight,
    });
    const startPos = editorDocument.positionAt(0);
    const endPos = editorDocument.positionAt(
        editorDocument.lineAt(0).text.length,
    );
    const ranges: vscode.DecorationOptions[] = [
        {
            range: new vscode.Range(startPos, endPos),
        },
    ];

    // Apply decorations
    editor.setDecorations(decoration, ranges);
}
