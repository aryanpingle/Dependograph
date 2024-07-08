import * as vscode from "vscode";
import { getDependencyObject } from "./code-analyser";
import * as ejs from "ejs";
import { WebviewParams } from "./app";
import { getGlobalTradeInfo } from "./trade-analyser";

export class VisualizationEditorProvider {
    private currentEditor: vscode.WebviewPanel | null = null;

    public constructor(private readonly context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.commands.registerCommand(
                "dependograph.sendEntryFiles",
                (stringifiedEntryFiles: string) => {
                    const entryFileUriJSONs = JSON.parse(
                        stringifiedEntryFiles,
                    ) as Array<Object>;
                    const entryFileUris = entryFileUriJSONs.map((UriJSON) =>
                        vscode.Uri.from(UriJSON as any),
                    );
                    this.createOrShowEditor(entryFileUris);
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

    public async createOrShowEditor(fileUris: vscode.Uri[]) {
        // Check if the editor already exists
        if (this.currentEditor !== null) {
            this.currentEditor.reveal(undefined);
        } else {
            this.createEditor();
        }

        await this.setEditorWebview(fileUris);
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
    private async setEditorWebview(fileUris: vscode.Uri[]) {
        const workspaceUri = vscode.workspace.workspaceFolders![0].uri;
        const workspacePath = workspaceUri.fsPath;

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
            // Since we're now switching to vscode's FS API,
            // this might cause problems on DOS down the line. Refactor?
            pathSep: "/",
            workspaceURI: workspaceUri,
            extensionWebviewURI: extensionWebviewUri.toString(),
        };
        params["globalTradeInfo"] = await getGlobalTradeInfo(fileUris);

        const ejsContent = (
            await vscode.workspace.fs.readFile(
                vscode.Uri.joinPath(
                    this.context.extensionUri,
                    "assets",
                    "ejs",
                    "visualization.ejs",
                ),
            )
        ).toString();
        this.currentEditor.webview.html = ejs.render(ejsContent, params);
    }
}
