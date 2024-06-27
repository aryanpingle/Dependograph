import * as d3 from "d3";
import { FileType, getFileType, webviewMetadata } from "../utils";
import { randomUUID } from "crypto";

export class SimNode implements d3.SimulationNodeDatum {
    public readonly filepath: string;
    public name: string;
    public readonly processedName: string;
    public readonly filepathWithoutWorkspace: string;
    public readonly id: string;
    public readonly fileType: FileType;

    // Taken from d3.SimulationNodeDatum
    index?: number | undefined;
    x?: number | undefined;
    y?: number | undefined;
    vx?: number | undefined;
    vy?: number | undefined;
    fx?: number | null | undefined;
    fy?: number | null | undefined;

    constructor(filepath: string) {
        this.filepath = filepath;

        this.filepathWithoutWorkspace = removeWorkspaceFromFilename(filepath);
        this.processedName = processNodeModulesFilename(
            this.filepathWithoutWorkspace,
        );
        this.name = this.processedName;
        this.id = randomUUID();
        this.fileType = getFileType(this.filepathWithoutWorkspace);
    }
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
 * Remove the leading workspace directory from the given filename.
 */
export function removeWorkspaceFromFilename(filename: string): string {
    const workspacePath = webviewMetadata.workspaceURI.fsPath;
    return filename.replace(workspacePath, "");
}
