import traverse from "@babel/traverse";
import { parse } from "@babel/parser";
import fs from "fs";
import { astParserPlugins, astOtherSettings } from "./astSettings.js";
import {
  isExportFromTypeStatement,
  isSubPartOfDynamicImport,
  isDynamicImportWithPromise,
  isRequireStatement,
  isRequireOrImportStatement,
  isAccessingPropertyOfObject,
  isNotExportTypeReference,
  isModuleExportStatement,
  isNotTraversingToCheckForImportAddresses,
  isNotTraversingToCheckForStaticImportAddresses,
} from "./helper.js";

import {
  doExportDeclarationOperations,
  doExportSpecifiersOperations,
  doModuleExportStatementOperations,
} from "./exportsRelatedOperations/index.js";

import {
  doImportDeclartionOperations,
  doImportDeclartionOperationsAfterSetup,
  doRequireOrImportStatementOperations,
  doDynamicImportWithPromiseOperations,
  doDynamicImportWithPromiseOperationsAfterSetup,
  doOperationsOnSubPartOfDynamicImports,
  doDynamicImportsUsingLazyHookOperations,
} from "./importsRelatedOperations/index.js";

import {
  doIdentifierOperationsOnImportedVariables,
  doIdentifierOperationsOnImportedVariablesMetadata,
  doAccessingPropertiesOfObjectOperations,
} from "./referencesRelatedOperations/index.js";
import {
  CHECK_EXPORTS,
  NAMED_EXPORT,
  ALL_EXPORTED,
  DEFAULT,
  CHECK_USAGE,
  JSX,
} from "../utility/constants/index.js";

/**
 * Builds the AST of the file, by first getting the file's code
 * @param {String} fileLocation Address of the file whose AST has to be build
 * @returns AST of the file's code
 */
export const buildAST = (fileLocation) => {
  const code = fs.readFileSync(fileLocation).toString();
  try {
    return parse(code, {
      plugins: [...astParserPlugins, JSX],
      ...astOtherSettings,
    });
  } catch (_) {
    return parse(code, {
      plugins: astParserPlugins,
      ...astOtherSettings,
    });
  }
};

/**
 * Main function which actually traverse the AST of the file
 * @param {Object} traversalRelatedMetadata Metadata which contains information related to traversal like AST to traverse, current and all files' metadata
 * @param {String} type Traversal type (traverse according to requirement i.e. identifying deadfile/ dependencies at given depth etc...)
 */
export const traverseAST = (
  { ast, currentFileMetadata, filesMetadata, addReferences = true },
  type
) => {
  /* Takes two parameters, ast and an object which contains types of nodes to visit as the key
     Will visit the entire AST but will report only for visited nodes which were provided inside the argument */
  traverse(ast, {
    // ImportDeclaration will check for "import ... from ..." type statements
    ImportDeclaration(path) {
      doImportDeclartionOperations(path.node, currentFileMetadata);
      if (isNotTraversingToCheckForImportAddresses(type)) {
        const importDecalarationOperationMetadata = {
          importNode: path.node,
          traverseType: type,
          addReferences,
        };
        doImportDeclartionOperationsAfterSetup(
          importDecalarationOperationMetadata,
          currentFileMetadata,
          filesMetadata
        );
      }
      path.skip();
    },
    // Checks for "export * as ... from ...", "export ...", "export ... from ..." type statements
    ExportNamedDeclaration(path) {
      if (isExportFromTypeStatement(path.node)) {
        doExportDeclarationOperations(path.node, currentFileMetadata, type);
      }
      if (type === CHECK_EXPORTS) {
        const exportSpecifierOperationMetadata = {
          nodeToGetValues: path.node,
          type: NAMED_EXPORT,
        };
        doExportSpecifiersOperations(
          exportSpecifierOperationMetadata,
          currentFileMetadata,
          filesMetadata
        );
      }
    },
    // Checks for "export * from ..." type statement
    ExportAllDeclaration(path) {
      if (isExportFromTypeStatement(path.node)) {
        doExportDeclarationOperations(path.node, currentFileMetadata, type);
      }
      if (type === CHECK_EXPORTS) {
        const exportSpecifierOperationMetadata = {
          nodeToGetValues: path.node,
          type: ALL_EXPORTED,
        };
        doExportSpecifiersOperations(
          exportSpecifierOperationMetadata,
          currentFileMetadata,
          filesMetadata
        );
      }
    },
    // Checks for "export default ..." type statements
    ExportDefaultDeclaration(path) {
      if (type === CHECK_EXPORTS) {
        const exportSpecifierOperationMetadata = {
          nodeToGetValues: path.node,
          type: DEFAULT,
        };
        doExportSpecifiersOperations(
          exportSpecifierOperationMetadata,
          currentFileMetadata,
          filesMetadata
        );
      }
    },
    MemberExpression(path) {
      if (type === CHECK_USAGE && isAccessingPropertyOfObject(path.node)) {
        // Checks for x.y or x["y"] type statements where parent's property is being accessed
        if (
          doAccessingPropertiesOfObjectOperations(
            path.node,
            currentFileMetadata,
            addReferences
          )
        )
          path.skip();
      }
    },
    TSQualifiedName(path) {
      if (type === CHECK_USAGE && isAccessingPropertyOfObject(path.node)) {
        // Checks for x.y or x["y"] type statements where parent's property is being accessed
        if (
          doAccessingPropertiesOfObjectOperations(
            path.node,
            currentFileMetadata,
            addReferences
          )
        )
          path.skip();
      }
    },
    VariableDeclarator(path) {
      if (
        isNotTraversingToCheckForImportAddresses(type) &&
        isRequireOrImportStatement(path.node.init)
      ) {
        const requireOrImportStatementMetadata = {
          nodeToGetAddress: path.node.init,
          nodeToGetValues: path.node.id,
          addReferences,
          operationType: type,
        };
        // Checks for "const ... = require(...)", "const ... = import(...)" type statements
        doRequireOrImportStatementOperations(
          requireOrImportStatementMetadata,
          currentFileMetadata,
          filesMetadata
        );
        path.skip();
      }
    },
    AssignmentExpression(path) {
      if (isNotTraversingToCheckForImportAddresses(type)) {
        // Checks for "module.exports = {...}" type statements
        if (type === CHECK_EXPORTS && isModuleExportStatement(path.node.left)) {
          doModuleExportStatementOperations(
            path.node.right,
            currentFileMetadata,
            filesMetadata
          );
        }
        // Checks for "... = require(...)",  "... = import(...)" type statements
        if (isRequireOrImportStatement(path.node.right)) {
          const requireOrImportStatementMetadata = {
            nodeToGetAddress: path.node.right,
            nodeToGetValues: path.node.left,
            addReferences,
            operationType: type,
          };
          doRequireOrImportStatementOperations(
            requireOrImportStatementMetadata,
            currentFileMetadata,
            filesMetadata
          );
          path.skip();
        }
      }
    },
    CallExpression(path) {
      const callExpressionNode = path.node;
      const memberNode = callExpressionNode.callee;
      if (isNotTraversingToCheckForStaticImportAddresses(type)) {
        // Checks for "import(...).then((...)=>...)" type statements
        if (isDynamicImportWithPromise(memberNode)) {
          const dynamicImportsWithPromiseMetadata = {
            path,
            type,
            addReferences,
          };
          doDynamicImportWithPromiseOperations(
            dynamicImportsWithPromiseMetadata,
            currentFileMetadata
          );
          if (type === CHECK_USAGE)
            doDynamicImportWithPromiseOperationsAfterSetup(
              dynamicImportsWithPromiseMetadata,
              currentFileMetadata,
              filesMetadata
            );
        }
        // Checks for "import(...)" type statements
        else if (isSubPartOfDynamicImport(callExpressionNode)) {
          const dynamicImportMetadata = {
            path,
            operationType: type,
          };
          doOperationsOnSubPartOfDynamicImports(
            dynamicImportMetadata,
            currentFileMetadata,
            filesMetadata
          );
          if (isNotTraversingToCheckForImportAddresses(type)) {
            const parentAssignmentPath = path.findParent(
              (path) =>
                path.isVariableDeclaration() ||
                path.isAssignmentExpression() ||
                path.isClassProperty() ||
                path.isClassPrivateProperty()
            );
            if (parentAssignmentPath) {
              // Checks for "const ... = lazy(()=>import(...))" type statements
              dynamicImportMetadata.parentNode = parentAssignmentPath.node;
              dynamicImportMetadata.childNode = path.node;

              doDynamicImportsUsingLazyHookOperations(
                dynamicImportMetadata,
                currentFileMetadata,
                filesMetadata
              );
            }
          }
        } else {
        }
      }
      // Checks for "require(...)" type statements
      if (isRequireStatement(path.node)) {
        const requireOrImportStatementMetadata = {
          nodeToGetAddress: path.node,
          nodeToGetValues: null,
          addReferences,
          operationType: type,
        };
        doRequireOrImportStatementOperations(
          requireOrImportStatementMetadata,
          currentFileMetadata,
          filesMetadata
        );
        path.skip();
      }
    },
    Identifier(path) {
      if (isNotTraversingToCheckForImportAddresses(type)) {
        // Checks for variables names present in the code and if it is not used in export reference then will do the operation
        if (isNotExportTypeReference(path) && type === CHECK_USAGE)
          doIdentifierOperationsOnImportedVariables(
            path,
            currentFileMetadata,
            addReferences
          );
        doIdentifierOperationsOnImportedVariablesMetadata(
          path,
          currentFileMetadata,
          addReferences
        );
      }
    },
    JSXIdentifier(path) {
      if (isNotTraversingToCheckForImportAddresses(type)) {
        // Checks for variables names present in the code and if it is not used in export reference then will do the operation
        if (isNotExportTypeReference(path) && type === CHECK_USAGE)
          doIdentifierOperationsOnImportedVariables(
            path,
            currentFileMetadata,
            addReferences
          );
        doIdentifierOperationsOnImportedVariablesMetadata(
          path,
          currentFileMetadata,
          addReferences
        );
      }
    },
  });
};
