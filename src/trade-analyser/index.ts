import { parse as babelParse, ParseResult } from "@babel/parser";
import * as vscode from "vscode";
import { astParserPlugins, astOtherSettings } from "./ast-plugins";
import traverse, { NodePath } from "@babel/traverse";
import {
    CallExpression,
    File,
    StringLiteral,
    TemplateLiteral,
} from "@babel/types";
import json5 from "json5";

const vscodeFS = vscode.workspace.fs;

export interface ImportedVariableInfo {
    name: string;
    importedAs: string;
}

// Maps URI strings to an array of imported variables
export type FileImportInfo = Record<string, ImportedVariableInfo[]>;

export interface FileTradeInfo {
    imports: FileImportInfo;
    dependencies: Record<string, boolean>;
    isEntryFile: boolean;
}

export interface GlobalTradeInfo {
    files: Record<string, FileTradeInfo>;
}

function createEmptyFileTradeInfo(): FileTradeInfo {
    return {
        imports: {},
        dependencies: {},
        isEntryFile: false,
    };
}

async function doesUriExist(uri: vscode.Uri) {
    try {
        await vscodeFS.stat(uri);
        return true;
    } catch {
        return false;
    }
}

async function doesUriDirectoryExist(uri: vscode.Uri) {
    try {
        await vscodeFS.readDirectory(uri);
        return true;
    } catch {
        return false;
    }
}

type AliasPaths = Array<string | null> | null;
type PathAliasConfig = Record<string, AliasPaths>;
interface CompilerOptions {
    baseUrl?: string;
    paths?: PathAliasConfig;
}

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
        const fileUri = vscode.Uri.parse(uri.toString() + extension);
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
async function vscodeResolve(
    baseUri: vscode.Uri,
    path: string,
    compilerOptions: CompilerOptions,
): Promise<string> {
    if (!path.startsWith(".")) {
        // Not a relative path - it's either a node module or an aliased path

        // TODO: Absolute paths are rarely used, but should still be supported.
        // Maybe check if it's a local fs, and then allow vscodeFS to access it?

        const deAliasedPaths = getAllDeAliasedPaths(path, compilerOptions);
        for (const deAliasedPath of deAliasedPaths) {
            const deAliasedResolved = await vscodeResolveRelativePath(
                vscode.workspace.workspaceFolders[0].uri,
                deAliasedPath,
            );
            if (deAliasedResolved !== undefined) {
                return deAliasedResolved.toString();
            }
        }

        // Indicate that it must be a node module
        const nodeModuleUri = vscode.Uri.from({
            scheme: "node_modules",
            path: path,
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

// TODO: Ideally, the user should be able to add one or more config files of their choice
async function findCompilerOptions(): Promise<CompilerOptions> {
    const workspaceUri = vscode.workspace.workspaceFolders[0].uri;

    // Try jsconfig.json
    const jsConfigUri = vscode.Uri.joinPath(workspaceUri, "jsconfig.json");
    const jsConfigExists = await doesUriExist(jsConfigUri);
    if (jsConfigExists) {
        const fileContent = await getFileContent(jsConfigUri);
        const config = json5.parse(fileContent);
        return config.compilerOptions ?? {};
    }

    // Try tsconfig.json
    const tsConfigUri = vscode.Uri.joinPath(workspaceUri, "tsconfig.json");
    const tsConfigExists = await doesUriExist(tsConfigUri);
    if (tsConfigExists) {
        const fileContent = await getFileContent(tsConfigUri);
        const config = json5.parse(fileContent);
        return config.compilerOptions ?? {};
    }

    // Blank compiler options
    return {};
}

export async function getGlobalTradeInfo(uris: vscode.Uri[]) {
    const compilerOptions = await findCompilerOptions();

    const globalTradeInfo: GlobalTradeInfo = { files: {} };
    const uriSet = new Set<vscode.Uri>(uris);
    const queue = Array.from(uris);
    while (queue.length !== 0) {
        const uriToBeChecked = queue.pop();
        await addFileTradeInfo(
            uriToBeChecked,
            globalTradeInfo,
            compilerOptions,
        );
        const fti = globalTradeInfo.files[uriToBeChecked.toString()];

        // Maybe set it as an entry file
        fti.isEntryFile = uriSet.has(uriToBeChecked);
        // Add its dependencies to queue
        for (const dependencyUriString in fti.dependencies) {
            if (dependencyUriString in globalTradeInfo.files) continue;
            queue.push(vscode.Uri.parse(dependencyUriString));
        }

        // Preload all dependencies
        const uncheckedDependencies = Object.keys(fti.dependencies).filter(
            (dep) => !(dep in globalTradeInfo.files),
        );
        await Promise.all(
            uncheckedDependencies.map((uriString) =>
                getFileContent(vscode.Uri.parse(uriString)),
            ),
        );
    }
    return globalTradeInfo;
}

function getValueFromStringOrTemplateLiteral(
    node: StringLiteral | TemplateLiteral,
): string {
    if (node.type === "StringLiteral") {
        return node.value;
    } else {
        return node.quasis[0].value.cooked;
    }
}

function hasStaticArgs(path: NodePath<CallExpression>) {
    return path.node.arguments.every(
        (arg) => arg.type === "StringLiteral" || arg.type === "TemplateLiteral",
    );
}

function isStaticRequire(path: NodePath<CallExpression>) {
    const node = path.node;
    return (
        node.callee.type === "Identifier" &&
        node.callee.name === "require" &&
        node.arguments.length === 1 &&
        hasStaticArgs(path)
    );
}

function isStaticImport(path: NodePath<CallExpression>) {
    const node = path.node;
    return (
        node.callee.type === "Import" &&
        node.arguments.length === 1 &&
        hasStaticArgs(path)
    );
}

const cachedFileContent = {};
async function getFileContent(uri: vscode.Uri): Promise<string> {
    const uriString = uri.toString();
    if (uriString in cachedFileContent) {
        return cachedFileContent[uriString];
    }

    // Ensure the URI exists, and it is a file
    try {
        const status = await vscodeFS.stat(uri);
        if (status.type !== vscode.FileType.File) {
            cachedFileContent[uriString] = "";
            return cachedFileContent[uriString];
        }
    } catch {
        cachedFileContent[uriString] = "";
        return cachedFileContent[uriString];
    }

    const bytes = await vscodeFS.readFile(uri);
    const fileContent = new TextDecoder().decode(bytes);
    cachedFileContent[uriString] = fileContent;
    return cachedFileContent[uriString];
}

export async function addFileTradeInfo(
    uri: vscode.Uri,
    globalTradeInfo: GlobalTradeInfo,
    compilerOptions: CompilerOptions,
) {
    const uriString = uri.toString();

    const fileTradeInfo = createEmptyFileTradeInfo();
    globalTradeInfo.files[uriString] = fileTradeInfo;

    if (!(await doesUriExist(uri))) {
        return;
    }

    const fileContent = await getFileContent(uri);
    let astRoot: ParseResult<File>;
    try {
        astRoot = babelParse(fileContent, {
            plugins: astParserPlugins,
            ...astOtherSettings,
        });
    } catch {
        // Unparsable, ignore and continue
        return;
    }
    const promisedFunctions: (() => Promise<void>)[] = [];
    traverse(astRoot, {
        ImportDeclaration(path) {
            promisedFunctions.push(async () => {
                const node = path.node;

                // Add the import source to the set of dependencies
                const importSource = node.source.value;
                const importSourceUriString = await vscodeResolve(
                    uri,
                    importSource,
                    compilerOptions,
                );
                // true is meaningless
                fileTradeInfo.dependencies[importSourceUriString] = true;

                // TODO: There may be two import declarations importing from the same source.
                // This statement will overwrite the previous statements.
                const importedVariablesArray = [];
                fileTradeInfo.imports[importSourceUriString] =
                    importedVariablesArray;

                // Extract the imported variables
                for (const specifier of node.specifiers) {
                    let variableInfo = {} as ImportedVariableInfo;
                    switch (specifier.type) {
                        // import { abc [as xyz] } from ""
                        case "ImportSpecifier":
                            if (specifier.imported.type === "Identifier") {
                                variableInfo.name = specifier.imported.name;
                            } else {
                                variableInfo.name = specifier.imported.value;
                            }
                            variableInfo.importedAs = specifier.local.name;
                            break;
                        // import abc from ""
                        case "ImportDefaultSpecifier":
                            variableInfo.name = specifier.local.name;
                            variableInfo.importedAs = specifier.local.name;
                            break;
                        // import * as abc from ""
                        case "ImportNamespaceSpecifier":
                            variableInfo.name = "*";
                            variableInfo.importedAs = specifier.local.name;
                    }
                    importedVariablesArray.push(variableInfo);
                }
            });
        },
        CallExpression(path) {
            promisedFunctions.push(async () => {
                const node = path.node;
                // Check for import("...") or require("...")
                const isImport = isStaticImport(path);
                const isRequire = isStaticRequire(path);
                if (isImport || isRequire) {
                    const importSource = getValueFromStringOrTemplateLiteral(
                        node.arguments[0] as StringLiteral | TemplateLiteral,
                    );
                    const importSourceUriString = await vscodeResolve(
                        uri,
                        importSource,
                        compilerOptions,
                    );
                    // true is meaningless
                    fileTradeInfo.dependencies[importSourceUriString] = true;

                    // TODO: There may be two import declarations importing from the same source.
                    // This statement will overwrite the previous statements.
                    const importedVariablesArray = [];
                    fileTradeInfo.imports[importSourceUriString] =
                        importedVariablesArray;

                    // TODO: Handle imported variables separately.
                }
            });
        },
    });
    await Promise.all(promisedFunctions.map((func) => func()));

    return;
}
