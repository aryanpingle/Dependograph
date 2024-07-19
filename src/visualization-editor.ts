import * as vscode from "vscode";
import { WebviewParams } from "./app";
import { getGlobalTradeInfo, GlobalTradeInfo } from "./trade-analyser";
import { getCurrentWorkspaceUri, getFileContent, getUriStat } from "vscode-utils";
import ignore from "ignore";

export class VisualizationEditorProvider {
    private currentEditor: vscode.WebviewPanel | null = null;

    public constructor(private readonly context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.sendImportEntryFiles",
                async (stringifiedSelectedFiles: string) => {
                    const selectedUriStrings = JSON.parse(
                        stringifiedSelectedFiles,
                    ) as Array<Object>;
                    const entryUris = selectedUriStrings.map((UriJSON) =>
                        vscode.Uri.parse(UriJSON as any),
                    );
                    const globalTradeInfo = await getGlobalTradeInfo(
                        entryUris,
                        undefined,
                    );
                    this.createOrShowEditor(globalTradeInfo);
                },
            ),
        );
        context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.sendExportEntryFiles",
                async (stringifiedSelectedFiles: string) => {
                    const selectedUriStrings = JSON.parse(
                        stringifiedSelectedFiles,
                    ) as Array<Object>;
                    const exitUris = selectedUriStrings.map((UriJSON) =>
                        vscode.Uri.parse(UriJSON as any),
                    );

                    // Prompt the user to enter the folder to be scanned

                    let includePathInput = await vscode.window.showInputBox({
                        placeHolder:
                            'Path to a directory, eg: "path/to/directory"',
                        title: "Directory to be scanned",
                    });
                    // If user cancelled the export visualization
                    if (includePathInput === undefined) {
                        return;
                    }
                    // If user did not enter anything
                    if (includePathInput === "") {
                        includePathInput = ".";
                    }
                    const workspaceUri = getCurrentWorkspaceUri();
                    const includeUri = vscode.Uri.joinPath(
                        workspaceUri,
                        includePathInput,
                    );

                    let stime = +new Date();
                    let entryUris = await vscode.workspace.findFiles(
                        {
                            baseUri: includeUri,
                            pattern: "**/*.{js,jsx,ts,tsx}",
                        } as vscode.GlobPattern,
                        "**/node_modules/**",
                    );
                    console.log(`Files found in ${+new Date() - stime}ms`)

                    const gitignoreUri = vscode.Uri.joinPath(workspaceUri, ".gitignore");
                    const gitignoreStat = await getUriStat(gitignoreUri);
                    if(gitignoreStat !== null) {
                        // TODO: Handle query and fragment
                        const gitignoreContent = await getFileContent(gitignoreUri);
                        const ignoreHelper = ignore().add(gitignoreContent);
                        const workspaceUriString = workspaceUri.toString()
                        function uriToRelativePath(uri: vscode.Uri): string {
                            return uri.toString().substring(workspaceUriString.length + 1).replace(/\?.*/, "").replace(/#.*/, "");
                        }
                        const filteredEntryUris = entryUris.filter(uri => !ignoreHelper.ignores(uriToRelativePath(uri)))
                        entryUris = filteredEntryUris;
                    }

                    const globalTradeInfo = await getGlobalTradeInfo(
                        entryUris,
                        exitUris,
                    );
                    this.createOrShowEditor(globalTradeInfo);
                },
            ),
        );
    }

    /**
     * Get a URI of a path relative to the extension's data.
     */
    private getWebviewURI(...pathSegments: string[]): vscode.Uri {
        return this.currentEditor.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, ...pathSegments),
        );
    }

    public async createOrShowEditor(globalTradeInfo: GlobalTradeInfo) {
        // Check if the editor already exists
        if (this.currentEditor !== null) {
            this.currentEditor.reveal(undefined);
        } else {
            this.createEditor();
        }

        await this.setEditorWebview(globalTradeInfo);
    }

    /**
     * Creates a new editor tab in the window and sets its event listeners.
     */
    private createEditor() {
        const workspace = vscode.workspace?.workspaceFolders?.[0];
        if (!workspace) {
            vscode.window.showErrorMessage(`No workspace found.`);
            return;
        }

        this.currentEditor = vscode.window.createWebviewPanel(
            "customType",
            "Dependency Visualization",
            vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One,
            {
                enableScripts: true,
                // TODO: Use get/setState() to improve memory utilization
                retainContextWhenHidden: true,
            },
        );
        this.currentEditor.iconPath = vscode.Uri.joinPath(
            this.context.extensionUri,
            "assets",
            "images",
            "extension-logo.png",
        );

        // Add listeners to the editor webview
        this.currentEditor.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case "alert":
                    vscode.window.showInformationMessage(
                        `${JSON.stringify(message.data)}`,
                    );
                    break;
            }
        });
        this.currentEditor.onDidDispose(() => {
            this.currentEditor = null;
        });
    }

    /**
     * Set the webview of the editor after getting the dependency graph
     * using the given files.
     */
    private async setEditorWebview(globalTradeInfo: GlobalTradeInfo) {
        const workspaceUri = getCurrentWorkspaceUri();

        let params: WebviewParams = {} as WebviewParams;
        params["cssURIs"] = [
            this.getWebviewURI("assets", "css", "vscode.css"),
            this.getWebviewURI("out", "visualization.css"),
        ];
        params["jsURIs"] = [this.getWebviewURI("out", "visualization.js")];
        const extensionWebviewUri = this.currentEditor.webview.asWebviewUri(
            this.context.extensionUri,
        );
        params["webviewMetadata"] = {
            workspaceURIString: workspaceUri.toString(),
            extensionWebviewURI: extensionWebviewUri.toString(),
        };
        params["globalTradeInfo"] = globalTradeInfo;

        this.currentEditor.webview.onDidReceiveMessage((message: Object) => {
            if ("open" in message) {
                vscode.commands.executeCommand(
                    "dependograph.showFileDependencies",
                    {
                        resourceUri: vscode.Uri.parse(message.open as string),
                    },
                );
            }
        });

        this.currentEditor.webview.html = /* html */ `<!DOCTYPE html>
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Visualization</title>

                    <script>const webviewMetadata = ${JSON.stringify(params["webviewMetadata"])};</script>
                    <script>const globalTradeInfo = ${JSON.stringify(params["globalTradeInfo"])};</script>

                    ${params["cssURIs"].map((cssUri) => `<link rel="stylesheet" href="${cssUri}" />`).join("")}
                    ${params["jsURIs"].map((jsUri) => `<script src="${jsUri}" async defer></script>`).join("")}
                </head>
                <body></body>
            </html>
        `;
    }
}
