import objectFactory from "../../utility/factory.js";
import { getDirectoryFromPath } from "../../utility/resolver.js";
import {
  getResolvedPathFromGivenPath,
  getImportedFileAddress,
  getResolvedImportedFileDetails,
} from "../common.js";
import {
  isSpecifiersPresent,
  isRequireStatement,
  isImportStatementArgumentsPresent,
  isLazyImportDeclaration,
  isNotTraversingToCheckForImportAddresses,
  isTraversingToCheckForImportAddresses,
} from "../helper.js";
import {
  setImportedVariableInCurrentFileMetadata,
  setImportedVariablesDuringImportStage,
  updateImportedVariablesReferenceCountInRequireOrDynamicImportStatements,
  parseComment,
  updateWebpackConfigurationOfImportedFile,
} from "./utility.js";
import {
  DEFAULT,
  CHECK_USAGE,
  UPDATE_REFERENCE_COUNT,
  OBJECT_PATTERN,
  INDIVIDUAL_IMPORT,
  IDENTIFIER,
  ALL_EXPORTS_IMPORTED,
  DONT_UPDATE_REFERENCE_COUNT,
  WEBPACK_CHUNK_NAME,
} from "../../utility/constants/index.js";

/**
 * Will set that the current file has been statically imported
 * @param {Object} importNode Node in AST containing information related to the statement
 * @param {Object} currentFileMetadata Contains information related to the current file
 */
export const doImportDeclartionOperations = (
  importNode,
  currentFileMetadata
) => {
  const { importedFileAddress } = getResolvedPathFromGivenPath(
    currentFileMetadata.fileLocation,
    importNode.source.value
  );
  // Set this file as imported
  currentFileMetadata.importedFilesMapping[importedFileAddress] = true;
  currentFileMetadata.staticImportFilesMapping[importedFileAddress] = true;
};

/**
 * Will set imported variables equal to the imported file's respective exports
 * Also will update their reference counts if possible
 * @param {Object} importDecalarationOperationMetadata Contains informations like which node in AST corresponds to this statement, stage at which this function is called, and should references be added/ subtracted
 * @param {Object} currentFileMetadata Contains information related to the current file
 * @param {Object} filesMetadata Contains information related to all files
 */
export const doImportDeclartionOperationsAfterSetup = (
  { importNode, traverseType, addReferences },
  currentFileMetadata,
  filesMetadata
) => {
  const { importedFileAddress } = getResolvedPathFromGivenPath(
    currentFileMetadata.fileLocation,
    importNode.source.value
  );
  try {
    // If some variables are being imported from the import statement
    if (isSpecifiersPresent(importNode)) {
      importNode.specifiers.forEach((specifier) => {
        const specifierMetadata = {
          specifier,
          traverseType,
          importedFileAddress,
        };
        setImportedVariableInCurrentFileMetadata(
          specifierMetadata,
          currentFileMetadata,
          filesMetadata
        );
      });
    } else {
      try {
        // import "..." type statements
        const valueToAdd = addReferences ? 1 : -1;
        if (
          !filesMetadata.filesMapping[importedFileAddress].exportedVariables[
            DEFAULT
          ]
        ) {
          filesMetadata.filesMapping[importedFileAddress].exportedVariables[
            DEFAULT
          ] = objectFactory.createNewDefaultVariableObject(importedFileAddress);
        }
        if (traverseType === CHECK_USAGE)
          filesMetadata.filesMapping[importedFileAddress].exportedVariables[
            DEFAULT
          ].referenceCount += valueToAdd;
      } catch (_) {}
    }
  } catch (_) {}
};

/**
 * Set dynamic imports and require statements support, update reference counts depending upon the provided format
 * @param {Object} requireOrImportStatementMetadata Contains information like AST nodes containing imported file's address and imported variables, whether references should be added, and the stage at which this function is called
 * @param {Object} currentFileMetadata Contains information related to current file
 * @param {Object} filesMetadata Contains information related to all files
 */
export const doRequireOrImportStatementOperations = (
  { nodeToGetAddress, nodeToGetValues, addReferences, operationType },
  currentFileMetadata,
  filesMetadata
) => {
  const { type: importType, address: givenSourceAddress } =
    getImportedFileAddress(nodeToGetAddress);
  const fileLocation = currentFileMetadata.fileLocation;
  const { fileAddress: importedFileAddress } = getResolvedImportedFileDetails(
    getDirectoryFromPath(fileLocation),
    givenSourceAddress,
    importType
  );
  currentFileMetadata.importedFilesMapping[importedFileAddress] = true;
  // As dynamic imports will be present in a different chunk
  if (isRequireStatement(nodeToGetAddress))
    currentFileMetadata.staticImportFilesMapping[importedFileAddress] = true;

  if (isNotTraversingToCheckForImportAddresses(operationType)) {
    const importStageMetadata = {
      nodeToGetValues,
      importedFileAddress,
    };
    setImportedVariablesDuringImportStage(
      importStageMetadata,
      currentFileMetadata
    );
    if (operationType === CHECK_USAGE) {
      const updateVariablesMetadata = {
        node: nodeToGetValues,
        addReferences,
        importedFileAddress,
        type: UPDATE_REFERENCE_COUNT,
      };
      updateImportedVariablesReferenceCountInRequireOrDynamicImportStatements(
        updateVariablesMetadata,
        currentFileMetadata,
        filesMetadata
      );
    }
  }
};

/**
 * Will be called by import(...).then(...) type statements
 * Will set imported variables during the CHECK_IMPORTS stage
 * @param {Object} dynamicImportsWithPromiseMetadata Contains information related to corresponding AST node, stage at which this function is called, and whether references have to be added
 * @param {Object} currentFileMetadata Will be used to update the imported variables of the current file
 */
export const doDynamicImportWithPromiseOperations = (
  { path, type, addReferences },
  currentFileMetadata
) => {
  const callExpressionNode = path.node;
  const { type: importType, address: givenSourceAddress } =
    getImportedFileAddress(callExpressionNode.callee.object);
  const { importedFileAddress } = getResolvedPathFromGivenPath(
    currentFileMetadata.fileLocation,
    givenSourceAddress,
    importType
  );
  currentFileMetadata.importedFilesMapping[importedFileAddress] = true;
  if (isNotTraversingToCheckForImportAddresses(type)) {
    const valueToMultiplyWith = addReferences ? 1 : -1;
    // No need to check for variables if we are checking for dependencies at a given depth
    try {
      if (isImportStatementArgumentsPresent(callExpressionNode)) {
        callExpressionNode.arguments[0].params.forEach((specifier) => {
          // Specific exports called by this file
          if (specifier.type === OBJECT_PATTERN) {
            specifier.properties.forEach((property) => {
              const localEntityName = property.value.name,
                importedEntityName = property.key.name,
                exportType = INDIVIDUAL_IMPORT,
                importReferenceCount =
                  localEntityName === importedEntityName ? 2 : 1;

              currentFileMetadata.importedVariablesMetadata[localEntityName] =
                objectFactory.createNewImportMetadataObject(
                  importedEntityName,
                  localEntityName,
                  exportType,
                  importedFileAddress,
                  // Giving a negative value because the variable will be referred for the same statement afterwards and at that time references will be added/subtracted accordingly
                  -importReferenceCount * valueToMultiplyWith
                );
            });
          } else if (specifier.type === IDENTIFIER) {
            const localEntityName = specifier.name,
              exportType = ALL_EXPORTS_IMPORTED;
            // All exports of another file are required
            currentFileMetadata.importedVariablesMetadata[localEntityName] =
              objectFactory.createNewImportMetadataObject(
                localEntityName,
                localEntityName,
                exportType,
                importedFileAddress,
                -1 * valueToMultiplyWith
              );
          } else {
          }
        });
      }
    } catch (_) {}
  }
};

/**
 * Called by import(...).then(...) type statements at CHECK_USAGE stage
 * Will update reference and import reference counts of imported variables
 * @param {Object} dynamicImportsWithPromiseMetadata Contains information related to corresponding AST path and whether references have to be added/ subtracted
 * @param {Object} currentFileMetadata Will be used to update the imported variables of the current file
 * @param {Object} filesMetadata Contains information related to all files
 */
export const doDynamicImportWithPromiseOperationsAfterSetup = (
  { path, addReferences },
  currentFileMetadata,
  filesMetadata
) => {
  const callExpressionNode = path.node;
  const { type: importType, address: givenSourceAddress } =
    getImportedFileAddress(callExpressionNode.callee.object);
  const { importedFileAddress } = getResolvedPathFromGivenPath(
    currentFileMetadata.fileLocation,
    givenSourceAddress,
    importType
  );
  if (isImportStatementArgumentsPresent(callExpressionNode)) {
    // Will update reference count of each parsed variable, (present inside specifier AST node)
    callExpressionNode.arguments[0].params.forEach((specifier) => {
      try {
        const updateVariablesMetadata = {
          node: specifier,
          addReferences,
          importedFileAddress,
          type: DONT_UPDATE_REFERENCE_COUNT,
        };
        updateImportedVariablesReferenceCountInRequireOrDynamicImportStatements(
          updateVariablesMetadata,
          currentFileMetadata,
          filesMetadata
        );
      } catch (_) {}
    });
  }
};

/**
 * Will be used to parse individual import(...) of each dynamic import
 * Will parse magic comments present inside it to get the chunk in which it will be present
 * @param {Object} dynamicImportMetadata Contains information related to corresponding AST path and the stage at which this funciton is being called
 * @param {Object} currentFileMetadata Will be used to update the imported variables of the current file
 * @param {Object} filesMetadata Contains information related to all files
 */
export const doOperationsOnSubPartOfDynamicImports = (
  { path, operationType },
  currentFileMetadata,
  filesMetadata
) => {
  const callExpressionNode = path.node;
  const { type: importType, address: givenSourceAddress } =
    getImportedFileAddress(callExpressionNode);
  const { importedFileAddress } = getResolvedPathFromGivenPath(
    currentFileMetadata.fileLocation,
    givenSourceAddress,
    importType
  );
  currentFileMetadata.importedFilesMapping[importedFileAddress] = true;
  if (isTraversingToCheckForImportAddresses(operationType)) {
    // By default each dynamic import will be present in a different chunk
    let webpackChunkName = importedFileAddress;
    // Magic comments Array
    const leadingCommentsArray =
      callExpressionNode.arguments[0].leadingComments;

    if (leadingCommentsArray) {
      leadingCommentsArray.forEach((comment) => {
        const { key, value, valid } = parseComment(comment);
        if (valid && key === WEBPACK_CHUNK_NAME) {
          webpackChunkName = value;
        }
      });
    }
    updateWebpackConfigurationOfImportedFile(
      importedFileAddress,
      webpackChunkName,
      filesMetadata
    );
  }
};

/**
 * Will be called inside const ... = lazy(()=>import(...)) type statements
 * @param {Object} dynamicImportMetadata Contains information related to AST nodes which contains address of the imported file and the imported variables, also contains the stage at which this function is called
 * @param {Object} currentFileMetadata Will be used to update the imported variables of the current file
 * @param {Object} filesMetadata Contains information related to all files
 */
export const doDynamicImportsUsingLazyHookOperations = (
  { parentNode, childNode, operationType },
  currentFileMetadata,
  filesMetadata
) => {
  try {
    const callExpressionNode = childNode;
    const { type: importType, address: givenSourceAddress } =
      getImportedFileAddress(callExpressionNode);
    const { importedFileAddress } = getResolvedPathFromGivenPath(
      currentFileMetadata.fileLocation,
      givenSourceAddress,
      importType
    );

    let identifier = null;
    // X = lazy(()=>{import(...)}) type statement
    if (parentNode.left) {
      identifier = parentNode.left.name;
    }
    // const X = lazy(()=>{import(...)}) type statement
    else if (isLazyImportDeclaration(parentNode)) {
      identifier = parentNode.declarations[0].id.name;
    } else if (parentNode.key) {
      // Class property
      identifier = parentNode.key.name;
    } else {
    }

    if (identifier) {
      currentFileMetadata.importedVariablesMetadata[identifier] =
        objectFactory.createNewImportMetadataObject(
          DEFAULT,
          identifier,
          INDIVIDUAL_IMPORT,
          importedFileAddress
        );
      if (operationType === CHECK_USAGE)
        // As we will get only the default exported variable using this statement
        currentFileMetadata.importedVariables[identifier] =
          filesMetadata.filesMapping[importedFileAddress].exportedVariables[
            DEFAULT
          ];
    }
  } catch (_) {}
};
