import traverse, { Node as ASTNode, NodePath } from "@babel/traverse";
import { parse as babelParse } from "@babel/parser";
import { astParserPlugins, astOtherSettings } from "./ast-plugins";
import { isScopable, TSQualifiedName } from "@babel/types";

interface FileDependencySection {
    start: number;
    end: number;
    type: DependencyType;
}

export enum DependencyType {
    IMPORT,
    EXPORT,
}

function createDependencySection(
    path: NodePath,
    type: DependencyType,
): FileDependencySection {
    path = findPathClosestToScope(path);
    const node = path.node;
    const { start: startPos, end: endPos } = node.loc;
    return {
        start: startPos.index,
        end: endPos.index,
        type: type,
    };
}

/**
 * Find the AST path closest to the node's scope.
 * Essentially, it finds the line/s containing the node which are part of the nearest scope.
 */
function findPathClosestToScope(path: NodePath): NodePath {
    while (!isScopable(path.parent)) {
        path = path.parentPath;
    }
    return path;
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
        TSQualifiedName() {},
        CallExpression(path) {
            const { node, scope } = path;
            // Example: `import("...")`
            if (node.callee.type === "Import") {
                const section = createDependencySection(
                    path,
                    DependencyType.IMPORT,
                );
                fileDependencySections.push(section);
            }
            // Example: `require("...")`
            if (
                node.callee.type === "Identifier" &&
                node.callee.name === "require"
            ) {
                const section = createDependencySection(
                    path,
                    DependencyType.IMPORT,
                );
                fileDependencySections.push(section);
            }
        },
        ImportDeclaration(path) {
            const section = createDependencySection(
                path,
                DependencyType.IMPORT,
            );
            fileDependencySections.push(section);
        },
        ExportDeclaration(path) {
            const section = createDependencySection(
                path,
                DependencyType.EXPORT,
            );
            fileDependencySections.push(section);
        },
        ExportAllDeclaration(path) {
            const section = createDependencySection(
                path,
                DependencyType.EXPORT,
            );
            fileDependencySections.push(section);
        },
        ExportDefaultDeclaration(path) {
            const section = createDependencySection(
                path,
                DependencyType.EXPORT,
            );
            fileDependencySections.push(section);
        },
    });

    return fileDependencySections;
}
