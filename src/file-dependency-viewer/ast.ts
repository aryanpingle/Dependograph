import traverse, { Node as ASTNode, TraverseOptions } from "@babel/traverse";
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

const CustomTraverseOptions: TraverseOptions<ASTNode> = {};

export function getFileDependencySections(
    fileContents: string,
): FileDependencySection[] {
    const fileDependencySections: FileDependencySection[] = [];

    const ast = babelParse(fileContents, {
        plugins: astParserPlugins,
        ...astOtherSettings,
    });
    traverse(ast, CustomTraverseOptions);

    return fileDependencySections;
}
