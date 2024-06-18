import {
  OBJECT_PROPERTY,
  IDENTIFIER,
  DEFAULT,
  FILE,
  CALL_EXPRESSION,
  MEMBER_EXPRESSION,
  AWAIT_EXPRESSION,
  STRING_LITERAL,
  TEMPLATE_LITERAL,
  UNRESOLVED_TYPE,
  NONE,
} from "../utility/constants/index.js";
import {
  pathResolver,
  isPathAbsolute,
  getDirectoryFromPath,
} from "../utility/resolver.js";

/**
 * Used to get the local name from a given property, accepts multiple types of properties
 * @param {Object} property AST node to traverse
 * @returns String which denotes the retrieved local name
 */
export const getLocalNameFromProperty = (property) => {
  if (property.type === OBJECT_PROPERTY) return property.value.name;
  else if (property.type === IDENTIFIER) return property.name;
  else return DEFAULT;
};

/**
 * Used to get the imported name from a given property, accepts multiple types of properties
 * @param {Object} property AST node to traverse
 * @returns String which denotes the retrieved import name
 */
export const getImportedNameFromProperty = (property) => {
  if (property.type === OBJECT_PROPERTY) return property.key.name;
  else if (property.type === IDENTIFIER) return property.name;
  else return DEFAULT;
};

/**
 * Will be called to get the absolute source address from the given source address
 * @param {String} currentFileLocation Address of the currently parsed file
 * @param {String} givenSourceAdress Provided address (relative, absolute, node_modules)
 * @param {String} importType Either address given as a string or template literal
 * @returns Object containing type (FILE or UNRESOLVED TYPE), and absolute address of the given source
 */
export const getResolvedPathFromGivenPath = (
  currentFileLocation,
  givenSourceAdress,
  importType
) => {
  const { type, fileAddress: importedFileAddress } =
    getResolvedImportedFileDetails(
      getDirectoryFromPath(currentFileLocation),
      givenSourceAdress,
      importType
    );
  return { type, importedFileAddress };
};

/**
 * Will return the absolute address of the provided file's location
 * @param {String} directoryAddress Used if address given in relative format
 * @param {String} fileAddress Given source address
 * @param {String} importType Either address given as a string or template literal
 * @returns Absolute path of this source
 */
export const getResolvedImportedFileDetails = (
  directoryAddress,
  fileAddress,
  importType = FILE
) => {
  if (isPathAbsolute(fileAddress)) return { type: FILE, fileAddress };
  return pathResolver(directoryAddress, fileAddress, importType);
};

/**
 * Will parse the given node to get the child call expression node which will contain the import address
 * @param {Object} node AST node which will be parsed
 * @returns Object containing the type (FILE or UNRESOLVED TYPE), and the addresss
 */
export const getImportedFileAddress = (node) => {
  const callExpression = getCallExpressionFromNode(node);
  return getValueFromStringOrTemplateLiteral(callExpression.arguments[0]);
};

/**
 * Will retrieve the callExpression present inside this node
 * @param {Object} node AST node which will be parsed
 * @returns AST CallExpression node inside which the import address is present
 */
export const getCallExpressionFromNode = (node) => {
  if (!node) return null;
  if (node.type === CALL_EXPRESSION) return node;
  else if (node.type === MEMBER_EXPRESSION) return node.object;
  else if (node.type === AWAIT_EXPRESSION) return node.argument;
  return null;
};

/**
 * File's path can be given in both string or template literal format
 * @param {Object} argument Will parse it to get the file's given address
 * @returns Object containing the type and address present inside the argument
 */
const getValueFromStringOrTemplateLiteral = (argument) => {
  if (argument.type === STRING_LITERAL)
    return { type: FILE, address: argument.value };
  else if (argument.type === TEMPLATE_LITERAL && argument.quasis.length)
    return {
      type: UNRESOLVED_TYPE,
      address: getLastFeasibleAddress(argument.quasis[0].value.cooked),
    };
  else return { type: NONE };
};

/**
 * Will be called if parsing a path given as a template literal
 * @param {String} givenPath Path which has to be parsed
 * @returns String denoting the largest static part of the given path
 */
const getLastFeasibleAddress = (givenPath) => {
  // If relative path given, then will return the address which is completely static
  // Eg. parsing `/abc/${X}` will return /abc, as the last part of the given path is dynamic
  return givenPath.replace(/(.{2,})\/\$(.*)$/, "$1");
};
