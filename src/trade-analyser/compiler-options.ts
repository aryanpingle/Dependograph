import * as vscode from "vscode"
import { doesUriExist, getFileContent } from "./utils";
import json5 from "json5";
import { getCurrentWorkspaceUri } from "vscode-utils";

export type AliasPaths = Array<string | null> | null;

export type PathAliasConfig = Record<string, AliasPaths>;

export interface CompilerOptions {
    baseUrl?: string;
    paths?: PathAliasConfig;
}

/**
 * Recursively read the ts/jsconfig file (along with its parents) and return the final object.
 *
 * TODO: If a config file "extends" another in a subdirectory, paths should be made
 * relative to the extended config file.
 */
async function recursivelyGetConfig(configUri: vscode.Uri): Promise<any> {
    const fileContent = await getFileContent(configUri);
    const config = json5.parse(fileContent);

    if ("extends" in config) {
        const baseConfigUri = vscode.Uri.joinPath(
            configUri,
            "..",
            config.extends,
        );
        const baseConfig = await recursivelyGetConfig(baseConfigUri);
        Object.assign(config, baseConfig);
    }

    return config;
}

// TODO: Ideally, the user should be able to add one or more config files of their choice
export async function findCompilerOptions(): Promise<CompilerOptions> {
    const workspaceUri = getCurrentWorkspaceUri();

    // Try jsconfig.json
    const jsConfigUri = vscode.Uri.joinPath(workspaceUri, "jsconfig.json");
    const jsConfigExists = await doesUriExist(jsConfigUri);
    if (jsConfigExists) {
        const config = await recursivelyGetConfig(jsConfigUri);
        return config.compilerOptions ?? {};
    }

    // Try tsconfig.json
    const tsConfigUri = vscode.Uri.joinPath(workspaceUri, "tsconfig.json");
    const tsConfigExists = await doesUriExist(tsConfigUri);
    if (tsConfigExists) {
        const config = await recursivelyGetConfig(tsConfigUri);
        return config.compilerOptions ?? {};
    }

    // Blank compiler options
    return {};
}