const vscode = acquireVsCodeApi();

document.querySelector("#input-entry_file").onchange = function (event) {
    // this.files does not have a map function
    const filePaths = [];
    for (const file of this.files) {
        filePaths.push(file.path);
    }
    vscode.postMessage({
        command: "getDependencyGraph",
        data: filePaths,
    });
};

window.addEventListener("message", ({ data: message }) => {
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
function onReceivedDependencyGraph(dependencyGraph) {
    document.querySelector("#viz").innerHTML = JSON.stringify(
        dependencyGraph,
        undefined,
        2,
    )
        .replaceAll("\n", "<br>")
        .replaceAll(" ", "&nbsp;");
}
