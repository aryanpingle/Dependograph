// TODO: Don't assume files are on the hard disk. Read:
// https://github.com/microsoft/vscode-extension-samples/blob/main/fsprovider-sample/README.md

import * as vscode from "vscode";
import { binarySort } from "./utils";
import { createFileDependencyViewer } from "./file-dependency-viewer";
import debounce from "debounce";

export class FileItemsProvider implements vscode.TreeDataProvider<TreeItem> {
    private chosenFileUriSet: Set<vscode.Uri> = new Set<vscode.Uri>();
    private chosenFilesTreeItem: TreeItem;

    // File system watcher
    private fsWatcher: vscode.FileSystemWatcher;
    // Debounce refreshing the explorer by this amount of time
    private DEBOUNCE_MS = 50;

    private _onDidChangeTreeData = new vscode.EventEmitter<
        TreeItem | undefined | null | void
    >();

    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(
        private readonly workspaceUri: vscode.Uri,
        private readonly context: vscode.ExtensionContext,
    ) {
        this.addCommands();

        // Add file system watcher
        this.fsWatcher = vscode.workspace.createFileSystemWatcher({
            baseUri: workspaceUri,
            pattern: "**/*",
        } as vscode.RelativePattern);
        this.fsWatcher.onDidCreate(this.debouncedRefresh);
        this.fsWatcher.onDidChange(this.debouncedRefresh);
        this.fsWatcher.onDidDelete(this.debouncedRefresh);
    }

    addCommands() {
        // Navigation button that uses the selected entry files
        // to open a visualization window
        this.context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.openVisualization",
                () => {
                    vscode.commands.executeCommand(
                        "dependograph.sendEntryFiles",
                        JSON.stringify(Array.from(this.chosenFileUriSet)),
                    );
                },
            ),
        );
        // TreeItem button that adds this to entry files
        this.context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.chooseEntryFile",
                (element: TreeItem) => {
                    this.chosenFileUriSet.add(element.resourceUri);
                    this.debouncedRefresh();
                },
            ),
        );
        // Add this to entry files from the command palette
        this.context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.chooseEntryFileCommandPalette",
                () => {
                    const activeEditor = vscode.window.activeTextEditor;
                    const resourceUri = activeEditor.document.uri;
                    this.chosenFileUriSet.add(resourceUri);
                    this.debouncedRefresh();
                },
            ),
        );
        // TreeItem button that removes this from entry files
        this.context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.dropEntryFile",
                (element: TreeItem) => {
                    this.chosenFileUriSet.delete(element.resourceUri);
                    this.debouncedRefresh();
                },
            ),
        );
        // Open the file in a new vscode editor
        this.context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.openFile",
                (element: TreeItem) => {
                    vscode.commands.executeCommand(
                        "vscode.open",
                        element.resourceUri,
                    );
                },
            ),
        );
        // Show file dependencies
        this.context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.showFileDependencies",
                (element: TreeItem) => {
                    createFileDependencyViewer(element.resourceUri);
                },
            ),
        );
    }

    getTreeItem(element: TreeItem): TreeItem {
        return element;
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (!element) {
            this.chosenFilesTreeItem = new TreeItem(
                this.workspaceUri,
                undefined,
                {
                    isFile: false,
                    isEntryFile: false,
                    isPossibleEntryFile: false,
                },
            );
            this.chosenFilesTreeItem.label = "Chosen Entry Files";
            this.chosenFilesTreeItem.collapsibleState =
                vscode.TreeItemCollapsibleState.Expanded;

            const workspaceFilesTreeItem = new TreeItem(
                this.workspaceUri,
                undefined,
                {
                    isFile: false,
                    isEntryFile: false,
                    isPossibleEntryFile: false,
                },
            );
            workspaceFilesTreeItem.label = "Workspace Files";
            workspaceFilesTreeItem.collapsibleState =
                vscode.TreeItemCollapsibleState.Expanded;

            return [this.chosenFilesTreeItem, workspaceFilesTreeItem];
        } else if (element == this.chosenFilesTreeItem) {
            // Get all chosen entry files
            const chosenTreeItems = Array.from(this.chosenFileUriSet).map(
                (fileUri) =>
                    new TreeItem(fileUri, element, {
                        isFile: true,
                        isEntryFile: true,
                        isPossibleEntryFile: true,
                    }),
            );

            return chosenTreeItems;
        } else {
            // Get all files in the folder pointed to by this element
            return this.getChildrenFromWorkspace(element);
        }
    }

    async getChildrenFromWorkspace(element: TreeItem) {
        // [filenameWithExtension, vscode.FileType]
        const dirEntries = await vscode.workspace.fs.readDirectory(
            element.resourceUri,
        );
        const treeItems = dirEntries
            .map(
                ([filename, filetype]) =>
                    new TreeItem(
                        vscode.Uri.joinPath(element.resourceUri, filename),
                        element,
                        {
                            isFile: filetype === vscode.FileType.File,
                            isEntryFile: false,
                            isPossibleEntryFile:
                                filetype === vscode.FileType.File &&
                                /\.[mc]?[jt]sx?$/.test(filename),
                        },
                    ),
            )
            .filter(
                (element) => !this.chosenFileUriSet.has(element.resourceUri),
            );

        // Sort alphabetically
        treeItems.sort((a, b) =>
            a.resourceUri.fsPath.localeCompare(b.resourceUri.fsPath),
        );
        // Sort folders before files
        binarySort(treeItems, (element) => (element.config.isFile ? 1 : 0));

        return treeItems;
    }

    getParent(element: TreeItem): vscode.ProviderResult<TreeItem> {
        return element.parent;
    }

    /**
     * Refresh the entire explorer, preserving the expanded/collapsed state of
     * all folders.
     *
     * NOTE: Call this.debouncedRefresh instead for better performance.
     */
    private refresh = () => {
        this._onDidChangeTreeData.fire();
    };

    private debouncedRefresh = debounce(this.refresh, this.DEBOUNCE_MS);
}

interface TreeItemConfig {
    isFile: boolean;
    isEntryFile: boolean;
    isPossibleEntryFile: boolean;
}

class TreeItem extends vscode.TreeItem {
    constructor(
        public readonly resourceUri: vscode.Uri,
        public readonly parent: TreeItem | undefined,
        public config: TreeItemConfig,
    ) {
        super(
            undefined,
            config.isFile
                ? vscode.TreeItemCollapsibleState.None
                : vscode.TreeItemCollapsibleState.Collapsed,
        );
        // If this is a valid entry file, offer the comand to show file dependencies
        if (this.config.isPossibleEntryFile) {
            this.command = {
                command: "dependograph.showFileDependencies",
                title: "Show file dependencies",
                arguments: [this],
            };
        }
        this.setContextValue(config);
    }

    setContextValue(config: TreeItemConfig) {
        this.contextValue = Object.entries(config)
            .map((entry) => {
                const key = entry[0];
                const value = entry[1];
                return String(key) + "=" + String(value);
            })
            .join(" ");
    }
}
