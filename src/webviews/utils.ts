import { Uri } from "vscode";

declare const webviewMetadata: WebviewEmbeddedMetadata;

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
    if (/^[^\\\/]/.test(filepath)) return "nodejs";
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

/**
 * If the given filename corresponds to a NodeJS module,
 * give it a single-phrase name.
 * @example "/node_modules/lodash/index.js" -> "lodash"
 */
export function processNodeModulesFilename(filename: string): string {
    const pathSep = webviewMetadata.pathSep;

    const nodeModulesPrefix = pathSep + "node_modules" + pathSep;
    if (filename.startsWith(nodeModulesPrefix)) {
        const moduleEndIndex = filename.indexOf(
            pathSep,
            nodeModulesPrefix.length,
        );
        filename = filename.substring(nodeModulesPrefix.length, moduleEndIndex);
    }

    return filename;
}

/**
 * Get the shortest version of each filepath in an array without getting duplicates.
 *
 * @example
 * // returns ["index.ts", "folder1/util.ts", "folder2/util.ts"]
 * getMinimalFilepaths(
 *   ["/src/index.ts", "/src/folder1/util.ts", "/src/folder2/util.ts"],
 *   "/"
 * )
 */
export function getMinimalFilepaths(
    filepaths: string[],
    pathSep: string,
): string[] {
    const splitPaths = filepaths.map((filepath) => filepath.split(pathSep));
    const startIndices = splitPaths.map((splitPath) => splitPath.length - 1);
    // Initially, everything is just the filename + extension
    const shortPaths = splitPaths.map(
        (splitPath, index) => splitPath[startIndices[index]],
    );

    const getFrequencyObject = (): Record<string, number> => {
        const freqObj: Record<string, number> = {};
        for (const shortPath of shortPaths) {
            if (!(shortPath in freqObj)) {
                freqObj[shortPath] = 0;
            }
            ++freqObj[shortPath];
        }
        return freqObj;
    };

    let hasChanged = false;
    do {
        hasChanged = false;
        const freqObj = getFrequencyObject();
        for (let index = 0; index < shortPaths.length; ++index) {
            let shortPath = shortPaths[index];
            if (freqObj[shortPath] > 1) {
                startIndices[index] -= 1;
                const startIndex = startIndices[index];
                shortPath = splitPaths[index][startIndex] + pathSep + shortPath;
                shortPaths[index] = shortPath;

                hasChanged = true;
            }
        }
    } while (hasChanged);

    return shortPaths;
}
