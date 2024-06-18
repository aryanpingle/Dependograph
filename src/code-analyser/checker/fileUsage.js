import process from "process";
import { traverseAST, buildAST } from "../ast/index.js";
import objectFactory from "../utility/factory.js";
import { CHECK_USAGE, DISPLAY_TEXT } from "../utility/constants/index.js";
import {
  isFileExtensionValid,
  isFileNotVisited,
  isFileMappingNotPresent,
  isFileNotExcluded,
  isFileTraversable,
} from "../utility/helper.js";
import { getUsedFilesMapping } from "./utility.js";

/**
 * Will be used to check file to update the imported, exported variables when they are referred
 * @param {String} entyFileLocation Address of the entry file
 * @param {Object} filesMetadata Object containing information related to all files
 */
export const checkFileUsage = (entyFileLocation, filesMetadata) => {
  if (isFileMappingNotPresent(entyFileLocation, filesMetadata))
    filesMetadata.filesMapping[entyFileLocation] =
      objectFactory.createNewDefaultFileObject(entyFileLocation);

  filesMetadata.filesMapping[entyFileLocation].isEntryFile = true;
  if (
    isFileNotVisited(entyFileLocation, filesMetadata) &&
    isFileExtensionValid(entyFileLocation)
  ) {
    traverseFileForCheckingUsage(entyFileLocation, filesMetadata);
  }
};

/**
 * Will be used to remove imported file's references made for this file
 * @param {String} deadFileLocation String denoting the absolute address of a dead file
 * @param {Object} filesMetadata Contains information related to all files
 */
export const checkDeadFileImportsUsage = (deadFileLocation, filesMetadata) => {
  if (
    isFileExtensionValid(deadFileLocation) &&
    isFileNotExcluded(filesMetadata.excludedFilesRegex, deadFileLocation)
  ) {
    try {
      let ast = buildAST(deadFileLocation);
      let currentFileMetadata =
        objectFactory.createNewDefaultCurrentFileMetadataObject(
          deadFileLocation
        );
      let traversalRelatedMetadata = {
        ast,
        currentFileMetadata,
        filesMetadata,
        addReferences: false,
      };
      traverseAST(traversalRelatedMetadata, CHECK_USAGE);
    } catch (err) {
      process.send({
        text: err,
        fileLocation: deadFileLocation,
        messageType: DISPLAY_TEXT,
      });
    }
  }
};

/**
 * This function will traverse a file to find usage of each imported, and exported variable
 * @param {String} fileLocation Address of the file which has to be traversed
 * @param {Object} filesMetadata Object containing information related to all files
 */
const traverseFileForCheckingUsage = (fileLocation, filesMetadata) => {
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
    traverseAST(traversalRelatedMetadata, CHECK_USAGE);

    // Get all files whose exports were referred to by this file
    const requiredImportedFilesMapping =
      getUsedFilesMapping(currentFileMetadata);
    // Setting ast as null, to save memory, will build it again after traversing all imported files of the current file
    ast = null;
    currentFileMetadata = null;
    traversalRelatedMetadata = null;

    Object.keys(requiredImportedFilesMapping).forEach((file) => {
      if (isFileTraversable(file, filesMetadata))
        traverseFileForCheckingUsage(file, filesMetadata);
    });
  } catch (err) {
    process.send({
      text: err,
      fileLocation,
      messageType: DISPLAY_TEXT,
    });
  }
};
