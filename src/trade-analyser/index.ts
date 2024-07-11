import { parse as babelParse } from "@babel/parser";
import * as vscode from "vscode";
import { astParserPlugins, astOtherSettings } from "./ast-plugins";
import traverse, { NodePath } from "@babel/traverse";
import { CallExpression, StringLiteral, TemplateLiteral } from "@babel/types";

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

// TODO: Handle absolute paths (and relative paths better)
async function vscodeResolve(
    baseUri: vscode.Uri,
    path: string,
): Promise<string> {
    if (!path.startsWith("."))
        return vscode.Uri.from({
            scheme: "node_modules",
            path: path,
        }).toString();

    const simpleJoinedUri = vscode.Uri.joinPath(baseUri, "..", path);
    if (await doesUriExist(simpleJoinedUri)) {
        if (await doesUriDirectoryExist(simpleJoinedUri)) {
            // It may be directory import (implicit /index)
            const availableFiles =
                await vscodeFS.readDirectory(simpleJoinedUri);
            // TODO: Make more in line with node resolution algorithm
            // 1. Find .ts or .tsx files
            for (const [filename, filetype] of availableFiles) {
                if (filetype !== vscode.FileType.File) continue;
                if (/index\.tsx?/.test(filename)) {
                    // Success!
                    return vscode.Uri.joinPath(
                        simpleJoinedUri,
                        filename,
                    ).toString();
                }
            }
            // 2. Find .js or .jsx files
            for (const [filename, filetype] of availableFiles) {
                if (filetype !== vscode.FileType.File) continue;
                if (/index\.jsx?/.test(filename)) {
                    // Success!
                    return vscode.Uri.joinPath(
                        simpleJoinedUri,
                        filename,
                    ).toString();
                }
            }
        } else {
            // No directory = there exists a file
            return simpleJoinedUri.toString();
        }
    }

    // path must be pointing to an actual file
    let fileAttempt: vscode.Uri;
    const attemptExtensions = [".tsx", ".ts", ".jsx", ".js"];
    for (const ext of attemptExtensions) {
        fileAttempt = vscode.Uri.joinPath(baseUri, "..", path + ext);
        if (await doesUriExist(fileAttempt)) {
            return fileAttempt.toString();
        }
    }

    // Can't figure it out, just join it
    return simpleJoinedUri.toString();
}

export async function getGlobalTradeInfo(uris: vscode.Uri[]) {
    const globalTradeInfo: GlobalTradeInfo = { files: {} };
    const uriSet = new Set<vscode.Uri>(uris);
    const queue = Array.from(uris);
    while (queue.length !== 0) {
        const uriToBeChecked = queue.pop();

        await addFileTradeInfo(uriToBeChecked, globalTradeInfo);
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

    if (!(await doesUriExist(uri))) {
        cachedFileContent[uriString] = "";
        return cachedFileContent[uriString];
    }

    const fileContent = (await vscodeFS.readFile(uri)).toString();
    cachedFileContent[uriString] = fileContent;
    return cachedFileContent[uriString];
}

export async function addFileTradeInfo(
    uri: vscode.Uri,
    globalTradeInfo: GlobalTradeInfo,
) {
    const uriString = uri.toString();

    const fileTradeInfo = createEmptyFileTradeInfo();
    globalTradeInfo.files[uriString] = fileTradeInfo;

    if (!(await doesUriExist(uri))) {
        return;
    }

    const fileContent = await getFileContent(uri);
    const astRoot = babelParse(fileContent, {
        plugins: astParserPlugins,
        ...astOtherSettings,
    });
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
