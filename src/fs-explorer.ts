// TODO: Don't assume files are on the hard disk. Read:
// https://github.com/microsoft/vscode-extension-samples/blob/main/fsprovider-sample/README.md

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { binarySort } from "./utils";
import { createFileDependencyViewer } from "./file-dependency-viewer";
import debounce from "debounce";

export class FileItemsProvider implements vscode.TreeDataProvider<TreeItem> {
    private chosenFilesSet: Set<string> = new Set<string>();
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
        private readonly workspace: string,
        private readonly context: vscode.ExtensionContext,
    ) {
        this.addCommands();

        // Add file system watcher
        this.fsWatcher = vscode.workspace.createFileSystemWatcher({
            baseUri: vscode.workspace.workspaceFolders[0].uri,
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
                        JSON.stringify(Array.from(this.chosenFilesSet)),
                    );
                },
            ),
        );
        // TreeItem button that adds this to entry files
        this.context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.chooseEntryFile",
                (element: TreeItem) => {
                    this.chosenFilesSet.add(element.filepath);
                    this.debouncedRefresh();
                },
            ),
        );
        // TreeItem button that removes this from entry files
        this.context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.dropEntryFile",
                (element: TreeItem) => {
                    this.chosenFilesSet.delete(element.filepath);
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

    getChildren(element?: TreeItem): vscode.ProviderResult<TreeItem[]> {
        if (!element) {
            this.chosenFilesTreeItem = new TreeItem("", undefined, {
                isFile: false,
                isEntryFile: false,
                isPossibleEntryFile: false,
            });
            this.chosenFilesTreeItem.label = "Chosen";
            this.chosenFilesTreeItem.description = "Entry Files";
            this.chosenFilesTreeItem.collapsibleState =
                vscode.TreeItemCollapsibleState.Expanded;

            const workspaceFilesTreeItem = new TreeItem(
                this.workspace,
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
            const chosenTreeItems = Array.from(this.chosenFilesSet).map(
                (filepath) =>
                    new TreeItem(filepath, element, {
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

    getChildrenFromWorkspace(
        element: TreeItem,
    ): vscode.ProviderResult<TreeItem[]> {
        const rootDir = element.filepath;

        const dirEntries = fs.readdirSync(rootDir, {
            withFileTypes: true,
        });
        const treeItems = dirEntries
            .map(
                (entry) =>
                    new TreeItem(path.join(rootDir, entry.name), element, {
                        isFile: entry.isFile(),
                        isEntryFile: false,
                        isPossibleEntryFile:
                            entry.isFile() &&
                            /\.[mc]?[jt]sx?$/.test(entry.name),
                    }),
            )
            .filter((element) => !this.chosenFilesSet.has(element.filepath));

        // Sort alphabetically
        treeItems.sort((a, b) => a.filepath.localeCompare(b.filepath));
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
        public readonly filepath: string,
        public readonly parent: TreeItem | undefined,
        public config: TreeItemConfig,
    ) {
        super(
            path.basename(filepath),
            config.isFile
                ? vscode.TreeItemCollapsibleState.None
                : vscode.TreeItemCollapsibleState.Collapsed,
        );
        this.resourceUri = vscode.Uri.file(filepath);
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
