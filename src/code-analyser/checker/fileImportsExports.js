import process from "process";
import { traverseAST, buildAST } from "../ast/index.js";
import objectFactory from "../utility/factory.js";
import {
  isFileExtensionValid,
  isFileNotVisited,
  isFileMappingNotPresent,
} from "../utility/helper.js";
import {
  getUsedFilesMapping,
  updateFilesMetadata,
  traverseChildrenFiles,
} from "./utility.js";
import {
  CHECK_IMPORTS,
  CHECK_EXPORTS,
  DISPLAY_TEXT,
} from "../utility/constants/index.js";

/**
 * Will be used to check file to get it's import and export variables, which will be used in the next stage where their usage will be checked
 * @param {String} entyFileLocation Address of the entry file
 * @param {Object} filesMetadata Object containing information related to all files
 * @param {Object} entryFilesMapping Mapping to check whether a given file is entry file or not
 */
export const checkFileImportsExports = (
  entyFileLocation,
  filesMetadata,
  entryFilesMapping
) => {
  if (isFileMappingNotPresent(entyFileLocation, filesMetadata)) {
    filesMetadata.filesMapping[entyFileLocation] =
      objectFactory.createNewDefaultFileObject(entyFileLocation);
  }
  filesMetadata.filesMapping[entyFileLocation].isEntryFile = true;
  if (
    isFileNotVisited(entyFileLocation, filesMetadata) &&
    isFileExtensionValid(entyFileLocation)
  ) {
    traverseFileForCheckingImportsExports(
      entyFileLocation,
      filesMetadata,
      entryFilesMapping
    );
  }
};

/**
 * This function will traverse a file to get all imports and exports variable
 * Will also set their corresponding objects (imports will refer exported variables' objects)
 * @param {String} fileLocation Address of the file which has to be traversed
 * @param {Object} filesMetadata Object containing information related to all files
 * @param {Object} entryFilesMapping To check whether a file is entry file or not
 */
const traverseFileForCheckingImportsExports = (
  fileLocation,
  filesMetadata,
  entryFilesMapping
) => {
  filesMetadata.visitedFilesMapping[fileLocation] = true;
  try {
    let ast = buildAST(fileLocation);
    let currentFileMetadata =
      objectFactory.createNewDefaultCurrentFileMetadataObject(fileLocation);
    let traversalRelatedMetadata = {
      ast,
      currentFileMetadata,
      filesMetadata,
    };
    traverseAST(traversalRelatedMetadata, CHECK_IMPORTS);
    updateFilesMetadata(filesMetadata, currentFileMetadata);
    const requiredImportedFilesMapping =
      getUsedFilesMapping(currentFileMetadata);
    // Setting ast as null, to save memory, will build it again after traversing all imported files of the current file
    ast = null;
    currentFileMetadata = null;
    traversalRelatedMetadata = null;

    const childrenTraversalMetadata = {
      arrayToTraverse: Object.keys(requiredImportedFilesMapping),
      functionUsedToTraverse: traverseFileForCheckingImportsExports,
      functionSpecificParameters: entryFilesMapping,
      filesMetadata,
    };
    traverseChildrenFiles(childrenTraversalMetadata);

    ast = buildAST(fileLocation);
    const isEntryFile = entryFilesMapping[fileLocation] ? true : false;
    currentFileMetadata =
      objectFactory.createNewDefaultCurrentFileMetadataObject(
        fileLocation,
        isEntryFile
      );
    traversalRelatedMetadata = {
      ast,
      currentFileMetadata,
      filesMetadata,
    };

    traverseAST(traversalRelatedMetadata, CHECK_EXPORTS);
    updateFilesMetadata(filesMetadata, currentFileMetadata);
  } catch (err) {
    // If some error is found during parsing, reporting it back on the console
    filesMetadata.unparsableVistedFiles++;
    process.send({
      text: err,
      fileLocation,
      messageType: DISPLAY_TEXT,
    });
  }
};
