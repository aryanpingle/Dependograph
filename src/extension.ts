// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	// Custom editor window that opens a path visualization
	context.subscriptions.push(
		vscode.commands.registerCommand('import-graph.pathviz', () => {
			const panel = vscode.window.createWebviewPanel(
				'customType', // Identifies the type of the webview. Used internally
				'Import Graph', // Title of the panel displayed to the user
				vscode.ViewColumn.One, // Editor column to show the new webview panel in.
				{} // Webview options. More on these later.
			);
		})
	);

	// Simple notification command for debugging
	context.subscriptions.push(
		vscode.commands.registerCommand('import-graph.helloWorld', () => {
			vscode.window.showInformationMessage('Hello, world!');
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
