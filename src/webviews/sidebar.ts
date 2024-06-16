import * as vscode from "vscode";

// @ts-ignore
const vscodeAPI: AcquiredVsCodeApi = acquireVsCodeApi();

function setup() {
    const input_entry_file = document.querySelector(
        "#input-entry_file",
    ) as HTMLInputElement;
    input_entry_file.addEventListener("change", function (event) {
        // this.files does not have a map function
        const filePaths: string[] = [];
        for (let i = 0; i < input_entry_file.files!.length; ++i) {
            filePaths.push((input_entry_file.files![i] as any).path);
        }
        console.log(filePaths);
        
        vscodeAPI.postMessage({
            command: "showDependencyGraph",
            data: filePaths,
        });
    });
}
setup();
