import * as vscode from "vscode";
import { doesUriExist, getFileContent } from "./utils";
import json5 from "json5";
import { getCurrentWorkspaceUri } from "vscode-utils";

export type AliasPaths = Array<string | null> | null;

export type PathAliasConfig = Record<string, AliasPaths>;

export interface JSONConfiguration {
    extends?: string;
    compilerOptions?: {
        baseUrl?: string;
        paths?: PathAliasConfig;
    };
}

/**
 * Maps a directory URI string to the js/tsconfig file object within it.
 */
export type ProjectConfigPaths = Record<string, PathAliasConfig>;

async function createPathsFromConfigFile(
    configFileUri: vscode.Uri,
): Promise<PathAliasConfig> {
    let config: JSONConfiguration = {};
    try {
        const fileContent = await getFileContent(configFileUri);
        config = json5.parse(fileContent);
    } catch {
        // Something went wrong while reading / parsing the config
        return {};
    }

    const pathAliasConfig: PathAliasConfig = {};

    // 1. If it extends some other config file, parse those first
    if ("extends" in config) {
        const baseConfigUri = vscode.Uri.joinPath(
            configFileUri,
            "..",
            config.extends,
        );
        const basePathAliasConfig =
            await createPathsFromConfigFile(baseConfigUri);
        Object.assign(pathAliasConfig, basePathAliasConfig);
    }

    // 2. Use this file's path alias config
    if (config.compilerOptions) {
        const baseUrl = config.compilerOptions.baseUrl ?? ".";
        const paths = config.compilerOptions.paths ?? {};
        // Add the baseURL to each of the aliaspaths for each alias
        for (const alias in paths) {
            if (paths[alias]) {
                paths[alias] = paths[alias].map(
                    (aliasPath) => baseUrl + "/" + aliasPath,
                );
            }
        }
        Object.assign(pathAliasConfig, paths);
    }

    // 3. Make all paths relative to the workspace URI
    const workspaceUriString = getCurrentWorkspaceUri().toString();
    const configFileDirectoryUri = vscode.Uri.joinPath(configFileUri, "..");
    const pathFromWorkspace =
        "." + configFileDirectoryUri.toString().replace(workspaceUriString, "");

    for (const alias in pathAliasConfig) {
        pathAliasConfig[alias] = pathAliasConfig[alias].map(
            (aliasPath) => pathFromWorkspace + "/" + aliasPath,
        );
    }

    return pathAliasConfig;
}

export async function getDirectoryConfigPaths(
    directoryUri: vscode.Uri,
): Promise<PathAliasConfig> {
    // Try jsconfig.json
    const jsConfigUri = vscode.Uri.joinPath(directoryUri, "jsconfig.json");
    const jsConfigExists = await doesUriExist(jsConfigUri);
    if (jsConfigExists) {
        return await createPathsFromConfigFile(jsConfigUri);
    }

    // Try tsconfig.json
    const tsConfigUri = vscode.Uri.joinPath(directoryUri, "tsconfig.json");
    const tsConfigExists = await doesUriExist(tsConfigUri);
    if (tsConfigExists) {
        return await createPathsFromConfigFile(tsConfigUri);
    }

    return {};
}

/**
 * Read all directories in the given file's path and add their configurations to `projectConfigPaths`.
 */
export async function ensureConfigsOfPath(
    fileUri: vscode.Uri,
    projectConfigPaths: ProjectConfigPaths,
) {
    const workspaceUri = getCurrentWorkspaceUri();

    const fsPath = fileUri.fsPath;
    console.log("fspath", fsPath);
    for (let i = fsPath.length - 1; i > workspaceUri.fsPath.length - 1; --i) {
        const ch = fsPath.charAt(i);

        if (ch !== "/") continue;

        const fsPathTillSlash = fsPath.substring(0, i);
        const directoryUri = fileUri.with({
            path: fsPathTillSlash,
        });
        const directoryUriString = directoryUri.toString();

        // If this directory has already been checked, break out of the loop
        if (directoryUriString in projectConfigPaths) break;

        const directoryPaths = await getDirectoryConfigPaths(directoryUri);

        if (Object.keys(directoryPaths).length !== 0)
            console.log("added new config paths", directoryPaths);

        projectConfigPaths[directoryUriString] = directoryPaths;
    }
}
