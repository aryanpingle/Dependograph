import objectFactory from "../../utility/factory.js";
import {
  getLocalNameFromProperty,
  getImportedNameFromProperty,
} from "../common.js";
import {
  isFileMappingNotPresent,
  isFileNotExcluded,
} from "../../utility/helper.js";
import {
  ALL_EXPORTS_IMPORTED,
  IMPORT_SPECIFIER,
  IMPORT_DEFAULT_SPECIFIER,
  DEFAULT,
  INDIVIDUAL_IMPORT,
  CHECK_USAGE,
  IDENTIFIER,
  OBJECT_PATTERN,
  DONT_UPDATE_REFERENCE_COUNT,
} from "../../utility/constants/index.js";

/**
 * This function parses the specifier and set this specifier as current file's imported variable
 * Will update necessary metadata and import variable mappings
 * @param {Object} specifierMetadata Contain information like specifier's AST node, from which file it has been imported, and in which stage it is been checked
 * @param {Object} currentFileMetadata Contains information related to the current file's imports and exports
 * @param {Object} filesMetadata Contains inforamtion related to all files
 */
export const setImportedVariableInCurrentFileMetadata = (
  { specifier, importedFileAddress, traverseType },
  currentFileMetadata,
  filesMetadata
) => {
  const localEntityName = specifier.local.name;
  let importedEntityName = localEntityName;

  // default case: "import * as ... from ..."
  let type = ALL_EXPORTS_IMPORTED;
  // If import ... from ... or import {...} from ... type statements
  if (
    specifier.type === IMPORT_SPECIFIER ||
    specifier.type === IMPORT_DEFAULT_SPECIFIER
  ) {
    if (specifier.type === IMPORT_SPECIFIER)
      importedEntityName = specifier.imported.name;
    else importedEntityName = DEFAULT;

    type = INDIVIDUAL_IMPORT;
  }
  currentFileMetadata.importedVariablesMetadata[localEntityName] =
    objectFactory.createNewImportMetadataObject(
      importedEntityName,
      localEntityName,
      type,
      importedFileAddress
    );
  if (traverseType === CHECK_USAGE) {
    try {
      // import * as ... from ... type statements
      if (type === ALL_EXPORTS_IMPORTED) {
        currentFileMetadata.importedVariables[localEntityName] =
          filesMetadata.filesMapping[importedFileAddress].exportedVariables;
      }
      // If import ... from ... or import {...} from ... type statements
      else if (type === INDIVIDUAL_IMPORT) {
        currentFileMetadata.importedVariables[localEntityName] =
          filesMetadata.filesMapping[importedFileAddress].exportedVariables[
            importedEntityName
          ];
      } else {
      }
    } catch (_) {}
  }
};

/**
 * Set require and dynamic import's imported variables which were parsed from the given node
 * @param {Object} nodeToGetValues AST node which will be parsed
 * @param {String} importedFileAddress Absolute address of the imported file
 * @param {Object} currentFileMetadata Contains information related to the current file's imports and exports
 */
export const setImportedVariablesDuringImportStage = (
  { nodeToGetValues: nodeToParse, importedFileAddress },
  currentFileMetadata
) => {
  if (!nodeToParse) return;
  if (nodeToParse.type === IDENTIFIER) {
    const localName = nodeToParse.name;
    currentFileMetadata.importedVariablesMetadata[localName] =
      objectFactory.createNewImportMetadataObject(
        DEFAULT,
        localName,
        INDIVIDUAL_IMPORT,
        importedFileAddress
      );
  } else if (nodeToParse.type === OBJECT_PATTERN) {
    nodeToParse.properties.forEach((property) => {
      const localName = property.value.name;
      const importedName = property.key.name;
      currentFileMetadata.importedVariablesMetadata[localName] =
        objectFactory.createNewImportMetadataObject(
          importedName,
          localName,
          INDIVIDUAL_IMPORT,
          importedFileAddress
        );
      currentFileMetadata.importedVariablesMetadata[
        localName
      ].isDefaultImport = true;
    });
  } else {
  }
};

/**
 * Updates imported variables references count (including import reference count)
 * Will be used inside require or dynamic import type statements
 * @param {Object} updateVariablesMetadata Contains information related to AST node from which values will be retrieved, whether references have to be added, absolute address of the imported file
 * @param {Object} currentFileMetadata Contains information related to the current file's imports and exports
 * @param {Object} filesMetadata Contains inforamtion related to all files
 */
export const updateImportedVariablesReferenceCountInRequireOrDynamicImportStatements =
  (
    { node, addReferences, importedFileAddress, type },
    currentFileMetadata,
    filesMetadata
  ) => {
    const valueToMultiplyWith = addReferences ? 1 : -1;
    if (!node) {
      try {
        // no imported values used (eg. css, html imports)
        if (
          !filesMetadata.filesMapping[importedFileAddress].exportedVariables[
            DEFAULT
          ]
        ) {
          filesMetadata.filesMapping[importedFileAddress].exportedVariables[
            DEFAULT
          ] = objectFactory.createNewDefaultVariableObject(importedFileAddress);
        }
        const exportedVariable =
          filesMetadata.filesMapping[importedFileAddress].exportedVariables[
            DEFAULT
          ];
        exportedVariable.referenceCount += 1 * valueToMultiplyWith;
      } catch (_) {}
      // Importing default export of a file. Eg. const X = require(...);
    } else if (node.type === IDENTIFIER) {
      try {
        const localEntityName = node.name;

        currentFileMetadata.importedVariables[localEntityName] =
          filesMetadata.filesMapping[importedFileAddress].exportedVariables[
            DEFAULT
          ];

        if (type === DONT_UPDATE_REFERENCE_COUNT)
          currentFileMetadata.importedVariables[
            localEntityName
          ].referenceCount -= 1 * valueToMultiplyWith;
      } catch (_) {}
    }
    // Selective imports, Eg. const {...}  = require(...)
    else if (node.type === OBJECT_PATTERN) {
      const patternToCheck = node.properties;
      patternToCheck.forEach((property) => {
        const importedEntityName = getImportedNameFromProperty(property);
        const localEntityName = getLocalNameFromProperty(property);
        // An identifier will be referenced twice if local and import names are same
        const importReferenceCount =
          importedEntityName === localEntityName ? 2 : 1;
        try {
          // Individual import
          currentFileMetadata.importedVariables[localEntityName] =
            filesMetadata.filesMapping[importedFileAddress].exportedVariables[
              DEFAULT
            ][importedEntityName];
          // Update references as it is an import type reference
          if (type === DONT_UPDATE_REFERENCE_COUNT)
            currentFileMetadata.importedVariables[
              localEntityName
            ].referenceCount -= importReferenceCount * valueToMultiplyWith;
        } catch (_) {}
      });
    } else {
    }
  };

/**
 * Will parse the provided comment to get it's two sub parts representing key value pair of a magic comment
 * @param {String} comment String which has to be parsed
 * @returns Object containing information whether this comment may be a magic comment or not
 */
export const parseComment = (comment) => {
  const commentSubParts = comment.value.split(":");
  if (commentSubParts.length === 2) {
    commentSubParts[0] = commentSubParts[0].trim();
    commentSubParts[1] = commentSubParts[1].trim();
    let parsedValue;
    // If the value given as a string
    parsedValue = commentSubParts[1].replace(/^(['"])(.*)\1$/, "$2");
    if (parsedValue !== commentSubParts[1])
      return { key: commentSubParts[0], value: parsedValue, valid: true };
    // If the value given as a regex
    parsedValue = commentSubParts[1].replace(/^\/(.*)\/(.*)/, "$1");
    parsedValue = new RegExp(parsedValue);
    return { key: commentSubParts[0], value: parsedValue, valid: true };
  }
  // Invalid format
  return { valid: false };
};

/**
 * Will update the webpack chunks in which the provided file is present
 * @param {String} givenFileAddress Provided file address whose webpack configuration has to be updated
 * @param {String} webpackChunkName Contains information related to the webpack chunk in which this file is present
 * @param {Object} filesMetadata Contains information related to all files
 */
export const updateWebpackConfigurationOfImportedFile = (
  givenFileAddress,
  webpackChunkName,
  filesMetadata
) => {
  try {
    if (
      isFileMappingNotPresent(givenFileAddress, filesMetadata) &&
      isFileNotExcluded(filesMetadata.excludedFilesRegex, givenFileAddress)
    ) {
      filesMetadata.filesMapping[givenFileAddress] =
        objectFactory.createNewDefaultFileObject(givenFileAddress);
    }

    // This file is now present inside the provided webpack chunk too
    filesMetadata.filesMapping[givenFileAddress].webpackChunkConfiguration[
      webpackChunkName
    ] = true;
  } catch (_) {}
};
