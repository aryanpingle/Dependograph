import * as vscode from "vscode";
import {
    VscodeColor,
    VscodeColors,
    createCSSVariable,
} from "vscode-webview-variables";

export const FileDependencyViewerScheme = "dependograph";

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

const importColor = VscodeColors["diffEditor-removedLineBackground"];
const exportColor = VscodeColors["diffEditor-insertedLineBackground"];

export async function createFileDependencyViewer(resourceUri: vscode.Uri) {
    // Open a readonly editor using the given resource URI
    const customUri = CustomTextEditorProvider.convertToCustomUri(resourceUri);
    const editorDocument = await vscode.workspace.openTextDocument(customUri);
    const editor = await vscode.window.showTextDocument(editorDocument, {
        preview: false,
    });

    const lineCount = editorDocument.lineCount;

    // Test: Assume the first line is an import
    const line0Start = 0;
    const line0End = editorDocument.lineAt(0).text.length;
    const importRanges: [number, number][] = [[line0Start, line0End]];
    highlightSections(editor, importRanges, importColor);

    // Test: Assume the second line is an export
    const line1Start = line0End + 1;
    const line1End = line1Start + editorDocument.lineAt(1).text.length;
    const exportRanges: [number, number][] = [[line1Start, line1End]];
    highlightSections(editor, exportRanges, exportColor);
}

/**
 * Higlight the given sections of code.
 */
function highlightSections(
    editor: vscode.TextEditor,
    ranges: [number, number][],
    vscodeColor: VscodeColor,
) {
    const editorDocument = editor.document;
    const decoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: createCSSVariable(vscodeColor.cssName),
        overviewRulerColor: new vscode.ThemeColor(vscodeColor.themeName),
        overviewRulerLane: vscode.OverviewRulerLane.Full,
    });
    const vscodeRanges: vscode.Range[] = ranges.map(
        (range) =>
            new vscode.Range(
                editorDocument.positionAt(range[0]),
                editorDocument.positionAt(range[1]),
            ),
    );

    editor.setDecorations(decoration, vscodeRanges);
}
