// TODO: Don't assume files are on the hard disk. Read:
// https://github.com/microsoft/vscode-extension-samples/blob/main/fsprovider-sample/README.md

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class FileItemsProvider implements vscode.TreeDataProvider<FileItem> {
    constructor(private readonly workspace: string) {}

    // TODO: Implement this to sync this view with the file system
    // onDidChangeTreeData?: vscode.Event<void | FileItem | FileItem[]>;

    getTreeItem(element: FileItem): FileItem {
        return element;
    }

    getChildren(element?: FileItem): vscode.ProviderResult<FileItem[]> {
        const rootDir = element ? element.filepath : this.workspace;

        const dirEntries = fs.readdirSync(rootDir, {
            withFileTypes: true,
        });
        return Promise.resolve(
            dirEntries.map(
                (entry) =>
                    new FileItem(
                        path.join(rootDir, entry.name),
                        entry.isFile(),
                        element,
                    ),
            ),
        );
    }

    getParent(element: FileItem): vscode.ProviderResult<FileItem> {
        return element.parent;
    }
}

class FileItem extends vscode.TreeItem {
    constructor(
        public readonly filepath: string,
        public readonly isFile: boolean,
        public readonly parent: FileItem | undefined,
    ) {
        super(
            path.basename(filepath),
            isFile
                ? vscode.TreeItemCollapsibleState.None
                : vscode.TreeItemCollapsibleState.Collapsed,
        );
        this.resourceUri = vscode.Uri.file(filepath);
    }
}
