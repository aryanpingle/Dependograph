import { FileType, WebviewEmbeddedMetadata, getFileType } from "../utils";
import { v4 as uuidv4 } from "uuid";
import { removeWorkspaceFromFilename } from "./utils";

declare const webviewMetadata: WebviewEmbeddedMetadata;

export type NodeId = string;

export class VizNode {
    public readonly filepath: string;
    
    /** The name of the node displayed in the visualization */
    public name: string;
    public readonly filepathWithoutWorkspace: string;
    public readonly id: NodeId;
    public readonly fileType: FileType;

    constructor(filepath: string) {
        this.filepath = filepath;

        this.filepathWithoutWorkspace = removeWorkspaceFromFilename(
            filepath,
            webviewMetadata.workspaceURIString,
        );
        this.name = this.filepathWithoutWorkspace;
        this.id = uuidv4();
        this.fileType = getFileType(this.filepath);
    }
}
