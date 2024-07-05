import * as vscode from "vscode";

import { SimNode } from "../force-directed-graph/node";

export function setupPreviewPanel() {}

export function updatePreviewPanel(node: SimNode) {
    // Details of selected node
    document.querySelector(".preview-selected_node").innerHTML =
        node.filepathWithoutWorkspace;

    // Details of imported variables
    // Details of exported variables
}
