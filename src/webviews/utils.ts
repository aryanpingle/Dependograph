import { Uri } from "vscode";

export interface AcquiredVsCodeApi {
    postMessage(message: any): void;
    getState(): any;
}

export interface WebviewEmbeddedMetadata {
    workspaceURI: Uri;
    extensionWebviewURI: string;
    pathSep: string;
}

export type FileType =
    | "css"
    | "file"
    | "javascript"
    | "nodejs"
    | "react"
    | "sass"
    | "typescript";

/**
 * Get the file "type" (which is synonymous with the file icon name).
 * TODO: Not robust enough to cover DOS systems.
 */
export function getFileType(filepath: string, pathSep: string = "/"): FileType {
    // NodeJS
    if (/^@/.test(filepath)) return "nodejs";
    if (filepath.indexOf(":") != -1 && filepath.indexOf(":\\") == -1)
        return "nodejs";
    if (/(?:\\|\/)node_modules(?:\\|\/)/.test(filepath)) return "nodejs";

    if (/\.js$/.test(filepath)) return "javascript";
    if (/\.ts$/.test(filepath)) return "typescript";
    if (/\.tsx$/.test(filepath)) return "react";
    if (/\.css$/.test(filepath)) return "css";
    if (/\.scss$/.test(filepath)) return "sass";

    return "file";
}

/**
 * Get the longest common prefix of an array of strings.
 */
export function longestCommonPrefix(strings: string[]) {
    if (strings.length === 0) return "";
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++)
        while (strings[i].indexOf(prefix) != 0) {
            prefix = prefix.slice(0, prefix.length - 1);
            if (prefix === "") return "";
        }
    return prefix;
}
