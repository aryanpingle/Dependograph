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
import { vscodeResolve } from "./resolver";
import {
    ensureConfigsOfPath,
    PathAliasConfig,
    ProjectConfigPaths,
} from "./compiler-options";
import { doesUriExist, getFileContent } from "./utils";
import { isWebFile } from "vscode-utils";

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

export async function getGlobalTradeInfo(
    entryUris?: vscode.Uri[],
    exitUris?: vscode.Uri[],
) {
    const compilerOptions = {};

    const globalTradeInfo: GlobalTradeInfo = { files: {} };
    const uriSet = new Set<vscode.Uri>(entryUris);
    const queue = Array.from(entryUris);
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

    // If there are some exit files, make sure to remove files from the trade
    // info which do not depend on any of the exit files
    if (exitUris !== undefined) {
        const exitUriStrings = exitUris.map((uri) => uri.toString());
        Object.entries(globalTradeInfo.files).forEach(
            ([fileUriString, fti]) => {
                // If this is an exit file, keep it
                if (exitUriStrings.includes(fileUriString)) return;
                // If no exit file is part of its dependencies, banish this file
                if (exitUriStrings.every((uri) => !(uri in fti.dependencies))) {
                    delete globalTradeInfo.files[fileUriString];
                }
            },
        );
    }

    // console.log("Compiler options >>>", compilerOptions);
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

export async function addFileTradeInfo(
    uri: vscode.Uri,
    globalTradeInfo: GlobalTradeInfo,
    projectConfigPaths: ProjectConfigPaths,
) {
    const uriString = uri.toString();

    const fileTradeInfo = createEmptyFileTradeInfo();
    globalTradeInfo.files[uriString] = fileTradeInfo;

    if (!(await doesUriExist(uri))) {
        return;
    }

    // If it's not a web file, ignore
    if (!isWebFile(uri)) {
        return;
    }

    // TODO: NEEDS HEAVY REFACTORING
    let fileContent: string;
    try {
        fileContent = await getFileContent(uri);
    } catch {
        // Unreadable, ignore and continue
        // console.log(`Uri '${uriString}' could not be read`);
        return;
    }

    let astRoot: ParseResult<File>;
    try {
        astRoot = babelParse(fileContent, {
            plugins: astParserPlugins,
            ...astOtherSettings,
        });
    } catch (err) {
        // Unparsable, ignore and continue
        // console.log(`Uri '${uriString}' could not be parsed`);
        return;
    }

    try {
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
                        projectConfigPaths,
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
                                    variableInfo.name =
                                        specifier.imported.value;
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
                        const importSource =
                            getValueFromStringOrTemplateLiteral(
                                node.arguments[0] as
                                    | StringLiteral
                                    | TemplateLiteral,
                            );
                        const importSourceUriString = await vscodeResolve(
                            uri,
                            importSource,
                            projectConfigPaths,
                        );
                        // true is meaningless
                        fileTradeInfo.dependencies[importSourceUriString] =
                            true;

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
    } catch (err) {
        // Untraversable, ignore and continue
        // console.log(`Uri '${uriString}' could not be traversed`);
        return;
    }

    return;
}
