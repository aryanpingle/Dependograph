import { Uri } from "vscode";

export interface AcquiredVsCodeApi {
    postMessage(message: any): void;
    getState(): any;
}

export interface WebviewEmbeddedMetadata {
    workspaceURI: Uri;
    extensionWebviewURI: string;
}

export enum FileType {
    CSS = "css",
    FILE = "file",
    JAVASCRIPT = "javascript",
    NODEJS = "nodejs",
    REACT = "react",
    SASS = "sass",
    TYPESCRIPT = "typescript",
}

/**
 * Get the file "type" (which is synonymous with the file icon name).
 * TODO: Not robust enough to cover DOS systems.
 */
export function getFileType(filepath: string): FileType {
    /** NodeJS */
    // If it starts with "@" (eg: @babel/traverse)
    if (/^@/.test(filepath)) return FileType.NODEJS;
    // If it doesn't start with a path separator
    if (/^[^\\\/]/.test(filepath)) return FileType.NODEJS;
    // If a colon isn't followed by a windows path separator
    // TODO: May fail for filenames with a colon
    if (filepath.indexOf(":") != -1 && filepath.indexOf(":\\") == -1)
        return FileType.NODEJS;
    // If "node_modules" is a directory in the filepath
    if (/(?:\\|\/)node_modules(?:\\|\/)/.test(filepath)) return FileType.NODEJS;

    /** Javascript */
    if (/\.[mc]?js$/.test(filepath)) return FileType.JAVASCRIPT;
    /** Typescript */
    if (/\.[mc]?ts$/.test(filepath)) return FileType.TYPESCRIPT;
    /** React */
    if (/\.[mc]?[jt]sx$/.test(filepath)) return FileType.REACT;
    /** CSS */
    if (/\.css$/.test(filepath)) return FileType.CSS;
    /** Sass */
    if (/\.scss$/.test(filepath)) return FileType.SASS;

    return FileType.FILE;
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
 * Get the shortest version of each filepath in an array without getting duplicates.
 *
 * @example
 * // returns ["index.ts", "folder1/util.ts", "folder2/util.ts"]
 * getMinimalFilepaths(
 *   ["/src/index.ts", "/src/folder1/util.ts", "/src/folder2/util.ts"],
 *   "/"
 * )
 */
export function getMinimalFilepaths(filepaths: string[]): string[] {
    const splitPaths = filepaths.map((filepath) => filepath.split("/"));
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
                shortPath = splitPaths[index][startIndex] + "/" + shortPath;
                shortPaths[index] = shortPath;

                hasChanged = true;
            }
        }
    } while (hasChanged);

    return shortPaths;
}

/**
 * Check if two objects have the same value for every common property.
 * @param object1
 * @param object2
 * @returns
 */

export function areObjectsSynced(object1: Object, object2: Object) {
    for (const property in object1) {
        if (!object2.hasOwnProperty(property)) continue;
        if (object1[property] !== object2[property]) return false;
    }
    for (const property in object2) {
        if (!object1.hasOwnProperty(property)) continue;
        if (object1[property] !== object2[property]) return false;
    }
    return true;
}
/**
 * Assign values from the source object to the target object
 * for all common properties.
 */

export function syncObjects(target: Object, source: Object) {
    for (const property in target) {
        if (!source.hasOwnProperty(property)) continue;
        target[property] = source[property];
    }
}

/**
 * Remove the leading workspace directory from the given filename.
 */
export function removeWorkspaceFromFilename(
    filename: string,
    workspaceUriString: string,
): string {
    return filename.replace(workspaceUriString, "");
}
