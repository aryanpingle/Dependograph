// TODO: Don't assume files are on the hard disk. Read:
// https://github.com/microsoft/vscode-extension-samples/blob/main/fsprovider-sample/README.md

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { binarySort } from "./utils";

export class FileItemsProvider implements vscode.TreeDataProvider<TreeItem> {
    private chosenFilesSet: Set<string> = new Set<string>();
    private chosenFilesTreeItem: TreeItem;

    constructor(
        private readonly workspace: string,
        context: vscode.ExtensionContext,
    ) {
        // Navigation button that refreshes the TreeView
        context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.refreshFSExplorer",
                () => {
                    this.refresh();
                },
            ),
        );
        // Navigation button that uses the selected entry files
        // to open a visualization window
        context.subscriptions.push(
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
        context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.chooseEntryFile",
                (element: TreeItem) => {
                    this.chosenFilesSet.add(element.filepath);
                    this.refresh();
                },
            ),
        );
        // TreeItem button that removes this from entry files
        context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.dropEntryFile",
                (element: TreeItem) => {
                    this.chosenFilesSet.delete(element.filepath);
                    this.refresh();
                },
            ),
        );
        // TreeItem button that removes this from entry files
        context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.openFile",
                (element: TreeItem) => {
                    vscode.commands.executeCommand("vscode.open", element.resourceUri)
                },
            ),
        );
    }

    getTreeItem(element: TreeItem): TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): vscode.ProviderResult<TreeItem[]> {
        if (!element) {
            this.chosenFilesTreeItem = new TreeItem("", false, undefined);
            this.chosenFilesTreeItem.label = "Chosen";
            this.chosenFilesTreeItem.description = "Entry Files";
            this.chosenFilesTreeItem.collapsibleState =
                vscode.TreeItemCollapsibleState.Expanded;

            const workspaceFilesTreeItem = new TreeItem(
                this.workspace,
                false,
                undefined,
            );
            workspaceFilesTreeItem.label = "Workspace Files";
            workspaceFilesTreeItem.collapsibleState =
                vscode.TreeItemCollapsibleState.Expanded;

            return [this.chosenFilesTreeItem, workspaceFilesTreeItem];
        } else if (element == this.chosenFilesTreeItem) {
            // Get all chosen entry files
            const chosenTreeItems = Array.from(this.chosenFilesSet).map(
                (filepath) => new EntryFileTreeItem(filepath, element),
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
                    new TreeItem(
                        path.join(rootDir, entry.name),
                        entry.isFile(),
                        element,
                    ),
            )
            .filter((element) => !this.chosenFilesSet.has(element.filepath));

        // Sort alphabetically
        treeItems.sort((a, b) => a.filepath.localeCompare(b.filepath));
        // Sort folders before files
        binarySort(treeItems, (element) => (element.isFile ? 1 : 0));

        return treeItems;
    }

    getParent(element: TreeItem): vscode.ProviderResult<TreeItem> {
        return element.parent;
    }

    // Boilerplate code to refresh the TreeView

    private _onDidChangeTreeData: vscode.EventEmitter<
        TreeItem | undefined | null | void
    > = new vscode.EventEmitter<TreeItem | undefined | null | void>();

    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

class TreeItem extends vscode.TreeItem {
    public isEntryFile: boolean = false;

    constructor(
        public readonly filepath: string,
        public readonly isFile: boolean,
        public readonly parent: TreeItem | undefined,
    ) {
        super(
            path.basename(filepath),
            isFile
                ? vscode.TreeItemCollapsibleState.None
                : vscode.TreeItemCollapsibleState.Collapsed,
        );
        this.resourceUri = vscode.Uri.file(filepath);
        this.contextValue = isFile ? "file" : "folder";
    }
}

class EntryFileTreeItem extends TreeItem {
    constructor(
        public filepath: string,
        public readonly parent: TreeItem,
    ) {
        super(filepath, true, parent);
        this.contextValue = "file--entry";
    }
}
