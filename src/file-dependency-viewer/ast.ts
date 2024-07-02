import traverse from "@babel/traverse";
import { parse as babelParse } from "@babel/parser";
import { astParserPlugins, astOtherSettings } from "./ast-plugins";

interface FileDependencySection {
    start: number;
    end: number;
    type: DependencyType;
}

export enum DependencyType {
    IMPORT,
    EXPORT,
}

export function getFileDependencySections(
    fileContents: string,
): FileDependencySection[] {
    const fileDependencySections: FileDependencySection[] = [];

    const ast = babelParse(fileContents, {
        plugins: astParserPlugins,
        ...astOtherSettings,
    });
    traverse(ast, {
        Import(path) {
            const node = path.node;
            const { start: startPos, end: endPos } = node.loc;
            fileDependencySections.push({
                start: startPos.index,
                end: endPos.index,
                type: DependencyType.IMPORT,
            });
        },
        ImportDeclaration(path) {
            const node = path.node;
            const { start: startPos, end: endPos } = node.loc;
            fileDependencySections.push({
                start: startPos.index,
                end: endPos.index,
                type: DependencyType.IMPORT,
            });
        },
        ExportDeclaration(path) {
            const node = path.node;
            const { start: startPos, end: endPos } = node.loc;
            fileDependencySections.push({
                start: startPos.index,
                end: endPos.index,
                type: DependencyType.EXPORT,
            });
        },
        ExportAllDeclaration(path) {
            const node = path.node;
            const { start: startPos, end: endPos } = node.loc;
            fileDependencySections.push({
                start: startPos.index,
                end: endPos.index,
                type: DependencyType.EXPORT,
            });
        },
        ExportDefaultDeclaration(path) {
            const node = path.node;
            const { start: startPos, end: endPos } = node.loc;
            fileDependencySections.push({
                start: startPos.index,
                end: endPos.index,
                type: DependencyType.EXPORT,
            });
        },
    });

    return fileDependencySections;
}
