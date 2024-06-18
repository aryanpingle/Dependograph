import { checkFileImports } from "../../checker/fileImports.js";
import {
  DISPLAY_TEXT,
  SUCCESSFUL_RETRIEVAL_OF_ALL_FILES_MESSAGE,
  SUCCESSFUL_RETRIEVAL_OF_ALL_ENTRY_FILES_MESSAGE,
} from "../constants/index.js";
import { getAllFilesToCheck, getAllEntryFiles } from "../files.js";
import { isFileExtensionValid } from "../helper.js";
import { getNumberOfSubPartsOfGivenAbsolutePath } from "../resolver.js";

/**
 * Will be used to get all the files which are imported
 * @param {Array} allEntryFiles Array containing all entry files
 * @param {Object} filesMetadata Contains information related to all files
 * @param {Object} traverseMetadata To decide whether check static imports only, check file size etc...
 */
export const setImportedFilesMapping = (
  allEntryFiles,
  filesMetadata,
  traverseMetadata
) => {
  allEntryFiles.forEach((file) => {
    checkFileImports(file, filesMetadata, traverseMetadata);
  });
};

/**
 * Used to determine the significance of a particular file
 * @param {String} file Absolute address of a file
 * @param {Object} filesMapping Contains information related to all files
 * @returns Points associated with the provided file
 */
export const getFilePoints = (file, filesMapping) => {
  const validExtendsionPoints = isFileExtensionValid(file) ? 100 : 0;
  const fileNotReferredPoints = !filesMapping[file] ? 10 : 0;
  // If present deep inside a parent folder, then it's significance is lower as compared to those present closer to a parent folder
  const subPartsCount = getNumberOfSubPartsOfGivenAbsolutePath(file);
  const totalFilePoints =
    validExtendsionPoints + fileNotReferredPoints - subPartsCount;
  return totalFilePoints;
};

/**
 * Used to get all files required by the program
 * @param {Object} programConfiguration Contains information related to which directories, entry files have to be retrieved
 * @param {RegExp} excludedFilesRegex Regex denoting the excluded files
 * @returns Object consisting of arrays of entry files and the files to check
 */
export const getAllRequiredFiles = async (
  programConfiguration,
  excludedFilesRegex
) => {
  const allFilesToCheck = await getAllFilesToCheck(
    programConfiguration.directoriesToCheck,
    excludedFilesRegex
  );
  process.send({
    text: SUCCESSFUL_RETRIEVAL_OF_ALL_FILES_MESSAGE,
    messageType: DISPLAY_TEXT,
  });

  const allEntryFiles = await getAllEntryFiles(
    programConfiguration.entry,
    allFilesToCheck,
    excludedFilesRegex
  );
  process.send({
    text: SUCCESSFUL_RETRIEVAL_OF_ALL_ENTRY_FILES_MESSAGE,
    messageType: DISPLAY_TEXT,
  });

  return { allEntryFiles, allFilesToCheck };
};
