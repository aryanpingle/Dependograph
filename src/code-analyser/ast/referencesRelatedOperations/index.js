import { getAllPropertiesFromNode } from "./utility.js";
import { isNotExportTypeReference } from "../helper.js";

/**
 * Helps to update individual exports inside an exported variable which contains multiple children exports (eg. factory code)
 * @param {Object} nodeToParse AST node to parse
 * @param {Object} currentFileMetadata Contains information related to the current file
 * @param {Boolean} addReferences To decide whether references have to be added or subtracted
 * @returns Boolean value denoting whether the property referred was an imported variable
 */
export const doAccessingPropertiesOfObjectOperations = (
  nodeToParse,
  currentFileMetadata,
  addReferences
) => {
  const allPropertiesArray = getAllPropertiesFromNode(nodeToParse);
  if (allPropertiesArray.length === 0) return false;

  const headPropertyWhichIsPresentInsideCurrentFile = allPropertiesArray[0];
  if (
    currentFileMetadata.importedVariables[
      headPropertyWhichIsPresentInsideCurrentFile
    ]
  ) {
    // First exported variable will be by default be present in the current file as an imported variable
    let exportedVariableToUpdate =
      currentFileMetadata.importedVariables[
        headPropertyWhichIsPresentInsideCurrentFile
      ];
    const valueToAdd = addReferences ? 1 : -1;
    currentFileMetadata.importedVariablesMetadata[
      headPropertyWhichIsPresentInsideCurrentFile
    ].referenceCountObject.referenceCount += valueToAdd;

    let currentIndex = 1,
      arrayLength = allPropertiesArray.length;

    while (
      currentIndex < arrayLength &&
      exportedVariableToUpdate[allPropertiesArray[currentIndex]]
    ) {
      // Traverse from this variable to another export variable which will be present as an object inside this exported variable
      exportedVariableToUpdate.referenceCount += valueToAdd;
      // Update the exported variable to it's child property object
      exportedVariableToUpdate =
        exportedVariableToUpdate[allPropertiesArray[currentIndex]];
      currentIndex++;
    }
    exportedVariableToUpdate.referenceCount += valueToAdd;
    return true;
  } else return false;
};

/**
 * Updates the references of the imported variable when used
 * @param {Object} path AST path inside which node containing the imported variable's name will be present
 * @param {Object} currentFileMetadata Contains imported variables of the current file
 * @param {Boolean} addReferences To decide whether the values have to be added or subtracted
 */
export const doIdentifierOperationsOnImportedVariables = (
  path,
  currentFileMetadata,
  addReferences
) => {
  const identifierName = path.node.name;
  // If the token parsed represents an imported variable
  if (currentFileMetadata.importedVariables[identifierName]) {
    try {
      const valueToAdd = addReferences ? 1 : -1;
      currentFileMetadata.importedVariables[identifierName].referenceCount +=
        valueToAdd;
    } catch (_) {}
  }
};

/**
 * Updates the references of the imported variable's metadata when used (Used for pre-check whether a file is used or not)
 * @param {Object} path AST path inside which node containing the imported variable's name will be present
 * @param {Object} currentFileMetadata Contains imported variables of the current file
 * @param {Boolean} addReferences To decide whether the values have to be added/ subtracted
 */
export const doIdentifierOperationsOnImportedVariablesMetadata = (
  path,
  currentFileMetadata,
  addReferences
) => {
  const identifierName = path.node.name;
  // If the token parsed represents an imported variable
  if (currentFileMetadata.importedVariablesMetadata[identifierName]) {
    try {
      const valueToAdd = addReferences ? 1 : -1;
      currentFileMetadata.importedVariablesMetadata[
        identifierName
      ].referenceCountObject.referenceCount += valueToAdd;
      if (!isNotExportTypeReference(path))
        currentFileMetadata.importedVariablesMetadata[
          identifierName
        ].referenceCountObject.exportReferenceCount += valueToAdd;
    } catch (_) {}
  }
};
