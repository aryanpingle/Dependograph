import { Uri } from "vscode";

export interface AcquiredVsCodeApi {
    postMessage(message: any): void;
    getState(): any;
}

export interface WebviewEmbeddedMetadata {
    workspaceURIString: string;
    extensionWebviewURI: string;
}

export enum FileType {
    CSS = "css",
    FILE = "file",
    JAVASCRIPT = "javascript",
    JAVASCRIPT_MAP = "javascript-map",
    JSON = "JSON",
    NODEJS = "nodejs",
    REACT = "react",
    REACT_TS = "react-ts",
    SASS = "sass",
    SVG = "svg",
    TYPESCRIPT = "typescript",
}

/**
 * Get the file "type" (which is synonymous with the file icon name).
 * TODO: Not robust enough to cover DOS systems.
 */
export function getFileType(filepath: string): FileType {
    /** NodeJS */
    if (filepath.includes("/node_modules/")) return FileType.NODEJS;

    /** CSS */
    if (/\.css$/.test(filepath)) return FileType.CSS;
    /** Javascript */
    if (/\.[mc]?js$/.test(filepath)) return FileType.JAVASCRIPT;
    /** Javascript Source Map */
    if (/\.[mc]?js\.map$/.test(filepath)) return FileType.JAVASCRIPT_MAP;
    /** JSON */
    if (/\.json$/.test(filepath)) return FileType.JSON;
    /** Sass */
    if (/\.scss$/.test(filepath)) return FileType.SASS;
    /** SVG */
    if (/\.svg$/.test(filepath)) return FileType.SVG;
    /** Typescript */
    if (/\.[mc]?ts$/.test(filepath)) return FileType.TYPESCRIPT;
    /** React */
    if (/\.[mc]?jsx$/.test(filepath)) return FileType.REACT;
    /** React-Typescript */
    if (/\.[mc]?tsx$/.test(filepath)) return FileType.REACT_TS;

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
 * returns ["index.ts", "folder1/util.ts", "folder2/util.ts"]
 * getMinimalFilepaths(
 *   ["/src/index.ts", "/src/folder1/util.ts", "/src/folder2/util.ts"],
 *   "/"
 * )
 * // will return
 * {
 *   "/src/index.ts": "index.ts",
 *   "/src/folder1/util.ts": "folder1/util.ts",
 *   "/src/folder2/util.ts": "folder2/util.ts"
 * }
 */
export function getMinimalFilepaths(
    filepaths: string[],
): Record<string, string> {
    // TODO: Refactor this whole thing because we now want an object mapping a filepath to its shortened
    const uniqueFilepaths = Array.from(new Set(filepaths));
    const splitPaths = uniqueFilepaths.map((filepath) => filepath.split("/"));
    const startIndices = splitPaths.map((splitPath) => splitPath.length - 1);
    // Node modules should show the entire module name, including forward slashes
    uniqueFilepaths.forEach((filepath, i) => {
        if (getFileType(filepath) === FileType.NODEJS) {
            const nodeModuleName = filepath.match(/(?<=\/node_modules\/).*/)[0];
            splitPaths[i] = [nodeModuleName];
            startIndices[i] = 0;
        }
    });
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

    const returnObject = {};
    for (let i = 0; i < uniqueFilepaths.length; ++i) {
        returnObject[uniqueFilepaths[i]] = shortPaths[i];
    }
    return returnObject;
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
        if (object2[property] !== object1[property]) return false;
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
