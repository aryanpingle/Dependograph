import {
    FileType,
    WebviewEmbeddedMetadata,
    getFileType,
    removeWorkspaceFromFilename,
} from "../utils";
import { v4 as uuidv4 } from "uuid";

declare const webviewMetadata: WebviewEmbeddedMetadata;

export type NodeId = string;

export class VizNode {
    public readonly filepath: string;

    /** The name of the node displayed in the visualization */
    public name: string;
    public readonly filepathWithoutWorkspace: string;
    public readonly id: NodeId;
    public readonly fileType: FileType;

    constructor(
        public readonly resourceUriString: string,
        public readonly isEntryFile: boolean,
    ) {
        // Remove query and fragment from the URI
        this.filepath = decodeURIComponent(
            resourceUriString.replace(/\?.*/, "").replace(/#.*/, ""),
        );

        this.filepathWithoutWorkspace = removeWorkspaceFromFilename(
            this.filepath,
            webviewMetadata.workspaceURIString,
        );
        this.name = this.filepathWithoutWorkspace;
        this.id = uuidv4();
        this.fileType = getFileType(this.filepath);
    }
}
