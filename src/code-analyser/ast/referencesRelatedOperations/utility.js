import {
  TS_QUALIFIED_NAME,
  LEFT,
  RIGHT,
  MEMBER_EXPRESSION,
  OBJECT,
  PROPERTY,
} from "../../utility/constants/index.js";

/**
 * Returns all individual properties present in a x.y.z or x["y"]["z"] type statements
 * Eg. for the above case, will return [x, y, z]
 * @param {Object} node AST node where this statement was encountered
 * @returns Array containing the parsed properties
 */
export const getAllPropertiesFromNode = (node) => {
  const allPropertiesArray = [];
  let headNode = node;
  let typeToCheck, childPropertyToCheck, nodePropertyToCheck;
  // Used inside TS interfaces
  if (headNode.type === TS_QUALIFIED_NAME) {
    typeToCheck = TS_QUALIFIED_NAME;
    childPropertyToCheck = LEFT;
    nodePropertyToCheck = RIGHT;
  } else {
    typeToCheck = MEMBER_EXPRESSION;
    childPropertyToCheck = OBJECT;
    nodePropertyToCheck = PROPERTY;
  }
  // while there still exists more than one property
  while (headNode && headNode.type === typeToCheck) {
    allPropertiesArray.unshift(headNode[nodePropertyToCheck].name);
    headNode = headNode[childPropertyToCheck];
  }
  // The last property accessed
  allPropertiesArray.unshift(headNode.name);

  return allPropertiesArray;
};
