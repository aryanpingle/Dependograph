import objectFactory from "../../utility/factory.js";
import {
  ALL_EXPORTS_IMPORTED,
  INDIVIDUAL_IMPORT,
  EXPORT_SPECIFIER,
  EXPORT_NAMESPACE_SPECIFIER,
  ALL_EXPORTS_AS_OBJECT,
  IDENTIFIER,
  OBJECT_EXPRESSION,
  DEFAULT,
  NORMAL_EXPORT,
  DEFAULT_OBJECT_EXPORT,
} from "../../utility/constants/index.js";

/**
 * Will parse the export statement's specifier and set it as an import of the current file
 * @param {Object} specifier Node in AST that corresponds to export from statement's specifier
 * @param {Object} currentFileMetadata Contains information related to the current file's imports and exports
 * @param {String} importedFileAddress Absolute address of the imported file
 */
export const setImportedVariablesMetadataFromExportFromStatementSpecifier = (
  specifier,
  currentFileMetadata,
  importedFileAddress
) => {
  const exportName = specifier.exported.name;
  const importName = specifier.local ? specifier.local.name : exportName;
  const type = specifier.local ? INDIVIDUAL_IMPORT : ALL_EXPORTS_IMPORTED;
  currentFileMetadata.importedVariablesMetadata[importName] =
    objectFactory.createNewImportMetadataObject(
      exportName,
      importName,
      type,
      importedFileAddress
    );
};

/**
 * Will be used to extract information from a provided AST node
 * @param {Object} specifier Provided AST node
 * @returns export type, import and export name of the exported variable
 */
export const extractVariableInformationFromSpecifier = (specifier) => {
  const exportName = specifier.exported.name;
  const importName =
    specifier.type === EXPORT_SPECIFIER ? specifier.local.name : exportName;
  let specifierType = INDIVIDUAL_IMPORT;
  // "export {...} from ..." type statements
  if (specifier.type === EXPORT_SPECIFIER) specifierType = INDIVIDUAL_IMPORT;
  // "export * as ... from ..." type statements
  else if (specifier.type === EXPORT_NAMESPACE_SPECIFIER)
    specifierType = ALL_EXPORTS_AS_OBJECT;
  else {
  }
  return { specifierType, exportName, importName };
};

/**
 * Covers various types of export statements
 * Covers both commonJs and ES6 type exports
 * @param {Object} nodeToGetValues AST node to get values from
 * @param {String} type To check whether it is a default export or not
 * @returns Object consisting of an array of key value pairs representing local and exported name, and the export type
 */
export const getValuesFromStatement = (nodeToGetValues, type) => {
  // module.exports = X type statements
  if (nodeToGetValues.type === IDENTIFIER)
    return {
      exportedVariablesArray: [{ [nodeToGetValues.name]: DEFAULT }],
      type: NORMAL_EXPORT,
    };
  // module.exports = {X} type statements
  else if (nodeToGetValues.type === OBJECT_EXPRESSION) {
    return {
      exportedVariablesArray: getValuesFromObject(nodeToGetValues.properties),
      type: DEFAULT_OBJECT_EXPORT,
    };
  }
  // export {x as y} type statements
  else if (nodeToGetValues.specifiers && nodeToGetValues.specifiers.length) {
    const keyValuesPairArray = [];
    nodeToGetValues.specifiers.forEach((specifier) => {
      if (specifier.local)
        keyValuesPairArray.push({
          [specifier.local.name]: specifier.exported.name,
        });
      else
        keyValuesPairArray.push({
          [specifier.exported.name]: specifier.exported.name,
        });
    });
    return { exportedVariablesArray: keyValuesPairArray, type: NORMAL_EXPORT };
  } else if (nodeToGetValues.declaration) {
    // export default x type statements
    if (nodeToGetValues.declaration.name)
      return {
        exportedVariablesArray: [
          { [nodeToGetValues.declaration.name]: DEFAULT },
        ],
        type: NORMAL_EXPORT,
      };
    else if (nodeToGetValues.declaration.declarations) {
      // export const x = () => {} type statements
      const keyValuesPairArray = [];
      nodeToGetValues.declaration.declarations.forEach((declaration) => {
        if (declaration.id.name)
          keyValuesPairArray.push({
            [declaration.id.name]: declaration.id.name,
          });
        else if (declaration.id.properties)
          keyValuesPairArray.push(
            ...getValuesFromObject(declaration.id.properties)
          );
        else {
        }
      });
      return {
        exportedVariablesArray: keyValuesPairArray,
        type: NORMAL_EXPORT,
      };
    } else if (nodeToGetValues.declaration.id) {
      // export function x(){} type statements
      const keyValuesPairArray = [];
      // export default function x(){} type statements
      if (type === DEFAULT)
        keyValuesPairArray.push({
          [nodeToGetValues.declaration.id.name]: DEFAULT,
        });
      else
        keyValuesPairArray.push({
          [nodeToGetValues.declaration.id.name]:
            nodeToGetValues.declaration.id.name,
        });
      return {
        exportedVariablesArray: keyValuesPairArray,
        type: NORMAL_EXPORT,
      };
    }
    // export default x  = () => {} type cases
    else if (nodeToGetValues.declaration.left) {
      const keyValuesPairArray = [];
      if (type === DEFAULT)
        keyValuesPairArray.push({
          [nodeToGetValues.declaration.left.name]: DEFAULT,
        });
      else
        keyValuesPairArray.push({
          [nodeToGetValues.declaration.left.name]:
            nodeToGetValues.declaration.left.name,
        });
      return {
        exportedVariablesArray: keyValuesPairArray,
        type: NORMAL_EXPORT,
      };
    }
    // export default {...} type cases
    else if (nodeToGetValues.declaration.properties) {
      const keyValuesPairArray = getValuesFromObject(
        nodeToGetValues.declaration.properties
      );
      return {
        exportedVariablesArray: keyValuesPairArray,
        type: DEFAULT_OBJECT_EXPORT,
      };
    }
    // Will cover any other case
    else
      return {
        exportedVariablesArray: [{ [DEFAULT]: DEFAULT }],
        type: NORMAL_EXPORT,
      };
  } else
    return {
      exportedVariablesArray: [{ [DEFAULT]: DEFAULT }],
      type: NORMAL_EXPORT,
    };
};

/**
 * Parses the given array to generate a new key-value pairs array
 * @param {Array} arrayToGetValuesFrom Given array to retrieve values from
 * @returns Array containing key-value pairs
 */
const getValuesFromObject = (arrayToGetValuesFrom) => {
  const keyValuesPairArray = [];
  arrayToGetValuesFrom.forEach((property) => {
    // Each individual element inside the {...} is a property
    if (property.key) {
      const keyName = property.key.name
        ? property.key.name
        : property.key.value;

      if (property.value && property.value.name)
        keyValuesPairArray.push({ [property.value.name]: keyName });
      else if (property.value && property.value.id)
        keyValuesPairArray.push({ [property.value.id.name]: keyName });
      else keyValuesPairArray.push({ [keyName]: keyName });
    }
  });
  return keyValuesPairArray;
};

/**
 * Will set the export variables of the current file
 * If an export is also an imported variable, then it will simply refer it
 * @param {Array} exportedVariablesArray Array of parsed exported variables, each containing a key value pair
 * @param {Object} currentFileMetadata To check whether a variable was imported or is a local one
 * @param {Object} filesMetadata To get all exported variables of another file
 */
export const setExportedVariablesFromArray = (
  { exportedVariablesArray, type },
  currentFileMetadata,
  filesMetadata
) => {
  exportedVariablesArray.forEach((variable) => {
    let exportVariableMetadata;
    try {
      // If it is an imported variable
      if (
        currentFileMetadata.importedVariablesMetadata[Object.keys(variable)[0]]
      ) {
        const importedVariable =
          currentFileMetadata.importedVariablesMetadata[
            Object.keys(variable)[0]
          ];
        exportVariableMetadata = {
          variable,
          importedVariable,
        };
      } else {
        // If it isn't an imported variable
        exportVariableMetadata = {
          variable,
          importedVariable: null,
        };
      }
      if (type === NORMAL_EXPORT)
        exportVariableMetadata.variableToUpdate =
          currentFileMetadata.exportedVariables;
      else {
        if (!currentFileMetadata.exportedVariables[DEFAULT]) {
          currentFileMetadata.exportedVariables[DEFAULT] =
            objectFactory.createNewDefaultVariableObject(
              currentFileMetadata.fileLocation,
              DEFAULT,
              currentFileMetadata.isEntryFile
            );
        }
        exportVariableMetadata.variableToUpdate =
          currentFileMetadata.exportedVariables[DEFAULT];
      }
      setExportVariable(
        exportVariableMetadata,
        currentFileMetadata,
        filesMetadata
      );
    } catch (_) {}
  });
};

/**
 * Will set the current file's exported variable and it's corresponding attributes
 * @param {Object} exportVariableMetadata Contains the local and exported name of the exported variable, information whether the exported variable was first imported
 * @param {Object} currentFileMetadata To check whether a variable was imported or is a local one
 * @param {Object} filesMetadata To get all exported variables of another file
 */
const setExportVariable = (
  { variable, importedVariable, variableToUpdate },
  currentFileMetadata,
  filesMetadata
) => {
  try {
    if (importedVariable) {
      const importedVariableToSet =
        importedVariable.type === ALL_EXPORTS_IMPORTED
          ? filesMetadata.filesMapping[importedVariable.importedFrom]
              .exportedVariables
          : importedVariable.isDefaultImport === false
          ? filesMetadata.filesMapping[importedVariable.importedFrom]
              .exportedVariables[importedVariable.name]
          : filesMetadata.filesMapping[importedVariable.importedFrom]
              .exportedVariables[DEFAULT][importedVariable.name];

      variableToUpdate[Object.values(variable)[0]] = importedVariableToSet;

      variableToUpdate[
        Object.values(variable)[0]
      ].individualFileReferencesMapping[currentFileMetadata.fileLocation] =
        importedVariable.referenceCountObject;

      if (currentFileMetadata.isEntryFile)
        setEntryFileExportRecursively(
          variableToUpdate[Object.values(variable)[0]]
        );
    } else {
      variableToUpdate[Object.values(variable)[0]] =
        objectFactory.createNewDefaultVariableObject(
          currentFileMetadata.fileLocation,
          Object.keys(variable)[0],
          currentFileMetadata.isEntryFile
        );
    }
  } catch (_) {}
};

/**
 * Will recursively set all child objects present inside it as entry file's exported variable as they can be used somewhere else
 * @param {Object} objectToUse The object whose child objects have to be set
 */
export const setEntryFileExportRecursively = (objectToUse) => {
  try {
    if (objectToUse.isEntryFileObject) return;
    objectToUse.isEntryFileObject = true;
    Object.values(objectToUse).forEach((childObject) =>
      setEntryFileExportRecursively(childObject)
    );
  } catch (_) {}
};
