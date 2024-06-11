// TODO: Analyse dependencies in a child process

import * as vscode from 'vscode';
import dependencyTree from 'dependency-tree';
import path from 'path';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('import-graph.pathviz', async () => {
			const currentWorkspace = vscode.workspace?.workspaceFolders?.[0].uri.fsPath;
			if(!currentWorkspace) {
				vscode.window.showErrorMessage(`No workspace found.`);
				return;
			}

			const selectedFiles = await vscode.window.showOpenDialog({
				canSelectMany: false,
				title: "Select an entry file",
				openLabel: "Use as entry file"
			})
			if(selectedFiles === undefined) {
				// Cancelled
				return;
			}

			const entryFileURI = selectedFiles[0];

			if(path.dirname(entryFileURI.fsPath) !== currentWorkspace) {
				vscode.window.showErrorMessage("Entry file must be contained within the current workspace.");
				return;
			}

			const dependencyGraph = dependencyTree({
				directory: currentWorkspace,
				filename: entryFileURI.fsPath,
			});
			// Log the dependency graph for now
			console.log(dependencyGraph);

			const panel = vscode.window.createWebviewPanel(
				'customType',
				'Import Graph',
				vscode.ViewColumn.One,
				{} 
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

export function deactivate() {}
