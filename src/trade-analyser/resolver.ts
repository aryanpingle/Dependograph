import * as vscode from "vscode";
import { doesUriExist, getFileContent } from "./utils";
import { getCurrentWorkspaceUri } from "vscode-utils";
import { AliasPaths, CompilerOptions } from "./compiler-options";

const vscodeFS = vscode.workspace.fs;

function aliasMatchesPath(path: string, alias: string): boolean {
    const splitAlias = alias.split("*");

    // Invalid aliases are ignored
    if (splitAlias.length > 2) return false;

    const [aliasHalf1, aliasHalf2] = splitAlias;

    if (aliasHalf1 && !path.startsWith(aliasHalf1)) return false;
    if (aliasHalf2 && !path.endsWith(aliasHalf2)) return false;

    return true;
}

function getDeAliasedPaths(
    path: string,
    baseUrl: string,
    alias: string,
    aliasPaths: AliasPaths,
): string[] {
    if (aliasPaths === null) return [];

    const [aliasHalf1, aliasHalf2] = alias.split("*");
    let half1Length = aliasHalf1 ? aliasHalf1.length : 0;
    let half2Length = aliasHalf2 ? aliasHalf2.length : 0;

    const starredValue = path.substring(half1Length, path.length - half2Length);

    const deAliasedPaths = aliasPaths?.map((aliasPath) => {
        return baseUrl + "/" + aliasPath.replace("*", starredValue);
    });
    return deAliasedPaths;
}

/**
 * Get all modifications of the path after using the given pathAliasConfig
 * @param path
 * @param pathAliasConfig
 * @returns
 */
function getAllDeAliasedPaths(
    path: string,
    compilerOptions: CompilerOptions,
): string[] {
    const baseUrl = compilerOptions.baseUrl?.replace(/\/+$/g, "") ?? ".";
    const pathAliasConfig = compilerOptions.paths ?? {};

    const allPossibleDeAliasedPaths = [];
    for (const alias in pathAliasConfig) {
        // If the path doesn't match the alias
        if (!aliasMatchesPath(path, alias)) continue;
        // If it's an exact alias but the path doesn't match exactly
        if (!alias.includes("*") && path !== alias) continue;

        const deAliasedPaths = getDeAliasedPaths(
            path,
            baseUrl,
            alias,
            pathAliasConfig[alias],
        );
        allPossibleDeAliasedPaths.push(...deAliasedPaths);
    }

    return allPossibleDeAliasedPaths;
}

async function bruteForceFile(
    uri: vscode.Uri,
): Promise<vscode.Uri | undefined> {
    const attemptExtensions = [".tsx", ".ts", ".jsx", ".js", ".d.ts"];
    for (const extension of attemptExtensions) {
        const fileUri = uri.with({
            path: uri.fsPath + extension,
        });
        if (await doesUriExist(fileUri)) {
            return fileUri;
        }
    }
    return undefined;
}

async function vscodeResolveRelativePath(
    baseUri: vscode.Uri,
    relativePath: string,
): Promise<vscode.Uri | undefined> {
    const simpleJoinedUri = vscode.Uri.joinPath(baseUri, relativePath);

    if (await doesUriExist(simpleJoinedUri)) {
        const status = await vscodeFS.stat(simpleJoinedUri);
        if (status.type === vscode.FileType.File) {
            // Direct file
            return simpleJoinedUri;
        } else if (status.type === vscode.FileType.Directory) {
            // Must be some index.xyz file
            // TODO: Could be a package.json either

            return bruteForceFile(
                vscode.Uri.joinPath(simpleJoinedUri, "index"),
            );
        }
        // TODO: Handle symbolic links

        return undefined;
    }

    // URI does not exist, could be the uri + some extension
    const bruted = bruteForceFile(simpleJoinedUri);
    return bruted;
}

// TODO: Handle absolute paths (and relative paths better)
export async function vscodeResolve(
    baseUri: vscode.Uri,
    path: string,
    compilerOptions: CompilerOptions,
): Promise<string> {
    if (!path.startsWith(".")) {
        // Not a relative path - it's either a node module or an aliased path

        // TODO: Absolute paths are rarely used, but should still be supported.
        // Maybe check if it's a local fs, and then allow vscodeFS to access it?

        const workspaceURI = getCurrentWorkspaceUri();

        const deAliasedPaths = getAllDeAliasedPaths(path, compilerOptions);
        if (deAliasedPaths.length > 0) {
            console.log(
                `Dealiased '${baseUri}' + '${path}' >>>`,
                deAliasedPaths,
            );
        }
        for (const deAliasedPath of deAliasedPaths) {
            const deAliasedResolved = await vscodeResolveRelativePath(
                workspaceURI,
                deAliasedPath,
            );
            if (deAliasedResolved !== undefined) {
                return deAliasedResolved.toString();
            }
        }

        // Indicate that it must be a node module
        const nodeModuleUri = vscode.Uri.joinPath(
            workspaceURI,
            "node_modules",
            path,
        ).with({
            query: baseUri.query,
            fragment: baseUri.fragment,
        });
        return nodeModuleUri.toString();
    }

    // It's a relative import, relative to the file
    const relativeResolved = await vscodeResolveRelativePath(
        baseUri,
        "../" + path,
    );
    if (relativeResolved !== undefined) {
        return relativeResolved.toString();
    }

    // Nothing works, so just pass it in as a simple join
    const simpleJoinedUri = vscode.Uri.joinPath(baseUri, "..", path);
    return simpleJoinedUri.toString();
}
