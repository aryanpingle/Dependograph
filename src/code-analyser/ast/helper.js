import { getCallExpressionFromNode } from "./common.js";
import {
  IMPORT,
  MEMBER_EXPRESSION,
  THEN,
  REQUIRE,
  MODULE,
  EXPORTS,
  TS_QUALIFIED_NAME,
  LEFT,
  OBJECT,
  IDENTIFIER,
  CHECK_ALL_IMPORTS_ADDRESSES,
  CHECK_STATIC_IMPORTS_ADDRESSES,
} from "../utility/constants/index.js";

export const isExportFromTypeStatement = (node) =>
  node && node.source && node.source.value;

export const isSubPartOfDynamicImport = (callExpressionNode) =>
  callExpressionNode &&
  callExpressionNode.callee &&
  callExpressionNode.callee.type === IMPORT &&
  callExpressionNode.arguments;

export const isDynamicImportWithPromise = (memberNode) => {
  return (
    memberNode &&
    memberNode.type === MEMBER_EXPRESSION &&
    memberNode.object &&
    memberNode.object.callee &&
    memberNode.object.callee.type === IMPORT &&
    memberNode.property &&
    memberNode.property.name === THEN
  );
};

export const isRequireOrImportStatement = (node) => {
  const callExpression = getCallExpressionFromNode(node);
  return (
    callExpression &&
    callExpression.callee &&
    (callExpression.callee.name === REQUIRE ||
      callExpression.callee.name === IMPORT)
  );
};

export const isSpecifiersPresent = (node) =>
  node && node.specifiers && node.specifiers.length > 0;

export const isImportStatementArgumentsPresent = (callExpressionNode) =>
  callExpressionNode &&
  callExpressionNode.arguments &&
  callExpressionNode.arguments.length &&
  callExpressionNode.arguments[0].params &&
  callExpressionNode.arguments[0].params.length;

export const isRequireStatement = (node) =>
  node && node.callee && node.callee.name === REQUIRE;

export const isModuleExportStatement = (node) =>
  node &&
  node.type === MEMBER_EXPRESSION &&
  node.object &&
  node.object.name === MODULE &&
  node.property &&
  node.property.name === EXPORTS;

export const isAccessingPropertyOfObject = (node) => {
  let headNode = node;
  const typeToCheck =
    headNode.type === TS_QUALIFIED_NAME ? TS_QUALIFIED_NAME : MEMBER_EXPRESSION;
  const childPropertyToCheck =
    headNode.type === TS_QUALIFIED_NAME ? LEFT : OBJECT;
  // while there still exists more than one property
  while (headNode && headNode.type === typeToCheck)
    headNode = headNode[childPropertyToCheck];
  if (!headNode) return false;
  return headNode.type === IDENTIFIER;
};

export const isNotExportTypeReference = (path) => {
  const parentNode = path.findParent(
    (path) => path.isExportNamespaceSpecifier() || path.isExportSpecifier()
  );
  const assignmentNode = path.findParent((path) =>
    path.isAssignmentExpression()
  );
  const exportDefaultDeclaration = path.findParent((path) =>
    path.isExportDefaultDeclaration()
  );
  return !(
    // ES6 exports statements
    (
      parentNode ||
      (assignmentNode &&
        assignmentNode.node &&
        assignmentNode.node.left &&
        assignmentNode.node.left.object &&
        assignmentNode.node.left.object.name === MODULE &&
        assignmentNode.node.left.property &&
        assignmentNode.node.left.property.name === EXPORTS &&
        assignmentNode.node.right &&
        isNodeReferred(assignmentNode.node.right, path)) ||
      (exportDefaultDeclaration &&
        exportDefaultDeclaration.node &&
        exportDefaultDeclaration.node.declaration &&
        isDefaultExportReference(
          exportDefaultDeclaration.node.declaration,
          path
        ))
    )
  );
};

const isNodeReferred = (referenceNode, path) =>
  referenceNode === path.node ||
  (referenceNode.properties &&
    referenceNode.properties.some(
      (property) =>
        property.key === path.node ||
        property.value === path.node ||
        (property.value && property.value.id === path.node)
    ));

const isDefaultExportReference = (referenceNode, path) =>
  referenceNode.left === path.node ||
  referenceNode.id === path.node ||
  (referenceNode.params && referenceNode.params[0] === path.node) ||
  isNodeReferred(referenceNode, path);
  
export const isLazyImportDeclaration = (parentNode) =>
  parentNode &&
  parentNode.declarations &&
  parentNode.declarations[0] &&
  parentNode.declarations[0].id;

export const isTraversingToCheckForImportAddresses = (traverseType) =>
  traverseType === CHECK_ALL_IMPORTS_ADDRESSES ||
  traverseType === CHECK_STATIC_IMPORTS_ADDRESSES;

export const isNotTraversingToCheckForImportAddresses = (traverseType) =>
  !isTraversingToCheckForImportAddresses(traverseType);

export const isNotTraversingToCheckForStaticImportAddresses = (traverseType) =>
  traverseType !== CHECK_STATIC_IMPORTS_ADDRESSES;
