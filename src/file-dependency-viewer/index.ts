import * as vscode from "vscode";
import {
    VscodeColor,
    VscodeColors,
    createCSSVariable,
} from "vscode-webview-variables";
import { DependencyType, getFileDependencySections } from "./ast";

export const FileDependencyViewerScheme = "dependograph";

export class FileDependencyViewerProvider
    implements vscode.TextDocumentContentProvider
{
    // Taken from:
    //https://github.com/microsoft/vscode-extension-samples/blob/main/virtual-document-sample/src/extension.ts
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    // Maps a custom URI to the file system watcher associated with it
    fileSystemWatchers = new Map<string, vscode.FileSystemWatcher>();

    /**
     * Set a file system watcher on the resource URI, if it doesn't already exist.
     */
    async watch(customUri: vscode.Uri, resourceUri: vscode.Uri) {
        try {
            // Will throw ENOENT error if the file does not exist
            await vscode.workspace.fs.stat(resourceUri);
        } catch {
            // File does not exist
            return;
        }

        const customUriString = customUri.toString();
        if (!this.fileSystemWatchers.has(customUriString)) {
            const resourceGlob = {
                baseUri: resourceUri,
                pattern: "*",
            } as vscode.GlobPattern;

            const watcher =
                vscode.workspace.createFileSystemWatcher(resourceGlob);

            // If the file is modified
            watcher.onDidChange((uri) => this.onResourceChanged(uri));
            // If the file is deleted
            watcher.onDidDelete((uri) => this.onResourceDeleted(uri));

            this.fileSystemWatchers.set(customUriString, watcher);
        }
    }

    /**
     * Handle the event when a resource is changed.
     */
    private onResourceChanged(resourceUri: vscode.Uri) {
        const customUri =
            FileDependencyViewerProvider.convertToCustomUri(resourceUri);

        this.onDidChangeEmitter.fire(customUri);
    }

    private onResourceDeleted(resourceUri: vscode.Uri) {
        const customUri =
            FileDependencyViewerProvider.convertToCustomUri(resourceUri);
        const customUriString = customUri.toString();

        this.fileSystemWatchers.get(customUriString).dispose();
        this.fileSystemWatchers.delete(customUriString);
        this.onDidChangeEmitter.fire(customUri);
    }

    async getFileContent(resourceUri: vscode.Uri): Promise<string> {
        const bytes = await vscode.workspace.fs.readFile(resourceUri);
        return new TextDecoder().decode(bytes);
    }

    /**
     * Called automatically whenever the document needs to be updated/initialized with text.
     */
    async provideTextDocumentContent(customUri: vscode.Uri) {
        const resourceUri =
            FileDependencyViewerProvider.convertToResourceUri(customUri);

        this.watch(customUri, resourceUri);

        return this.getFileContent(resourceUri);
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
    const customUri =
        FileDependencyViewerProvider.convertToCustomUri(resourceUri);
    const editorDocument = await vscode.workspace.openTextDocument(customUri);
    const editor = await vscode.window.showTextDocument(editorDocument);

    const fileContents = editorDocument.getText();
    const fileDepSections = getFileDependencySections(fileContents);

    const importRanges = fileDepSections
        .filter((section) => section.type === DependencyType.IMPORT)
        .map((section) => [section.start, section.end]);
    highlightSections(editor, importRanges, importColor);

    const exportRanges = fileDepSections
        .filter((section) => section.type === DependencyType.EXPORT)
        .map((section) => [section.start, section.end]);
    highlightSections(editor, exportRanges, exportColor);
}

/**
 * Higlight the given sections of code.
 */
function highlightSections(
    editor: vscode.TextEditor,
    ranges: number[][],
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
