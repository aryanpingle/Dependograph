// This file is run within the webview

import * as vscode from "vscode";

// @ts-ignore
const vscodeAPI = acquireVsCodeApi() as {
    postMessage(message: any): void;
    getState(): any;
};

const input_entry_file = document.querySelector(
    "#input-entry_file",
) as HTMLInputElement;
input_entry_file.addEventListener("change", function (event) {
    // this.files does not have a map function
    const filePaths: string[] = [];
    for (let i = 0; i < input_entry_file.files!.length; ++i) {
        filePaths.push((input_entry_file.files![i] as any).path);
    }
    vscodeAPI.postMessage({
        command: "getDependencyGraph",
        data: filePaths,
    });
});

window.addEventListener("message", ({ data: message }) => {
    console.log(message);
    switch (message.command) {
        case "takeYourDependencyGraph":
            onReceivedDependencyGraph(message.data);
            break;
    }
});

/**
 * Handles visualizing the dependency graph.
 * @param {Object} dependencyGraph
 */
function onReceivedDependencyGraph(dependencyGraph: any) {
    document.querySelector("#viz")!.innerHTML = JSON.stringify(
        dependencyGraph,
        undefined,
        2,
    )
        .replace(/\n/g, "<br>")
        .replace(/ /g, "&nbsp;");
}
