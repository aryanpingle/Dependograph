import {
  checkFileUsage,
  checkDeadFileImportsUsage,
} from "../../checker/fileUsage.js";
import { checkFileImportsExports } from "../../checker/fileImportsExports.js";
import {
  DISPLAY_TEXT,
  DEFAULT,
  ANALYSED_CODEBASE_MESSAGE,
  SUCCESSFUL_IDENTIFICATION_OF_DEAD_FILES_MESSAGE,
  UNSUCCESSFUL_IDENTIFICATION_OF_DEAD_FILES_MESSAGE,
} from "../constants/index.js";
import { isFileNotExcluded } from "../helper.js";
import { getFilePoints } from "./common.js";

/**
 * Sets each file's exported variables which will be used later on during the CHECK_USAGE stage
 * @param {Array} allEntryFiles Array containing all entry files
 * @param {Object} filesMetadata Contains information related to all files
 * @param {Object} entryFilesMapping Mapping to check whether a file is an entry file or not
 */
export const setAllFilesExports = (
  allEntryFiles,
  filesMetadata,
  entryFilesMapping
) => {
  allEntryFiles.forEach((entryFile) =>
    checkFileImportsExports(entryFile, filesMetadata, entryFilesMapping)
  );
};

/**
 * Analyses the code and updates the references of parsed files
 * @param {Array} allEntryFiles Array containing all entry files
 * @param {Object} filesMetadata Contains information related to all files
 */
export const analyseCode = (allEntryFiles, filesMetadata) => {
  allEntryFiles.forEach((entryFile) =>
    checkFileUsage(entryFile, filesMetadata)
  );
  process.send({
    text: ANALYSED_CODEBASE_MESSAGE,
    messageType: DISPLAY_TEXT,
  });
};

/**
 * Used to find dead files present in the feasible array of files provided
 * Also sends message to parent process whether it identified all dead files successfully or not
 * @param {Array} allFilesToCheck Array of feasible files which have to be checked for dead files
 * @param {Object} filesMetadata Contains information related to all files
 * @returns Array of dead files found inside the allFilesToCheck array
 */
export const getDeadFilesAndSendMessageToParent = (
  allFilesToCheck,
  filesMetadata
) => {
  const allDeadFiles = getAllDeadFiles(filesMetadata, allFilesToCheck);
  // If no errors were found while parsing these files
  if (filesMetadata.unparsableVistedFiles === 0)
    process.send({
      text: SUCCESSFUL_IDENTIFICATION_OF_DEAD_FILES_MESSAGE,
      messageType: DISPLAY_TEXT,
    });
  else
    process.send({
      text: UNSUCCESSFUL_IDENTIFICATION_OF_DEAD_FILES_MESSAGE,
      messageType: DISPLAY_TEXT,
    });

  return allDeadFiles;
};

/**
 * Will be used to retrieve all dead files present
 * Will recursively check whether a dead file's imported files are dead files too or not
 * @param {Object} filesMetadata Contains information related to all files
 * @param {Array} allFilesToCheck Array consisting of all files we have to check to detect dead files
 * @returns Array of dead files
 */
const getAllDeadFiles = (filesMetadata, allFilesToCheck) => {
  const filesMapping = filesMetadata.filesMapping;
  const excludedFilesRegex = filesMetadata.excludedFilesRegex;
  const deadFileVisitedMapping = {};
  const deadFilesArray = allFilesToCheck
    .filter((file) => isGivenFileDead(filesMapping, file))
    .map((file) => {
      deadFileVisitedMapping[file] = true;
      return { file, filePoints: getFilePoints(file, filesMapping) };
    });
  deadFilesArray.forEach((fileObject) => {
    const file = fileObject.file;
    deadFileVisitedMapping[file] = true;
    if (!filesMapping[file]) return;
    // Will be used to check whether imports of a dead file where referred inside this file only, if so then they will also become dead file now
    checkDeadFileImportsUsage(file, filesMetadata);
    Object.keys(filesMapping[file].importedFilesMapping).forEach(
      (importedFile) => {
        if (
          // First we haven't checked that file
          !deadFileVisitedMapping[importedFile] &&
          // File isn't excluded
          isFileNotExcluded(excludedFilesRegex, importedFile) &&
          // And it is a dead file too
          isGivenFileDead(filesMapping, importedFile)
        ) {
          deadFileVisitedMapping[importedFile] = true;
          deadFilesArray.push({
            file: importedFile,
            filePoints: getFilePoints(importedFile, filesMapping),
          });
        }
      }
    );
  });
  return deadFilesArray;
};

/**
 * Checks whether a given file is a dead file or not
 * @param {Object} filesMapping Contains information related to the file to check
 * @param {String} file Absolute address of the file which has to be checked
 * @returns Boolean value denoting whether the file is dead or not
 */
const isGivenFileDead = (filesMapping, file) =>
  // Either file was never imported/ referred or if imported but never used
  !filesMapping[file] ||
  (filesMapping[file].isEntryFile === false &&
    !isFileReferred(filesMapping, file));

/**
 * Checks if a file is not a dead file and was actually used by some other file
 * @param {Object} filesMapping Contains information related to all files
 * @param {String} fileLocation Address of the file which has to be check
 * @returns Boolean value denoting whether this file was referred or not
 */
const isFileReferred = (filesMapping, fileLocation) => {
  let isReferred = false;
  if (!filesMapping[fileLocation]) return false;
  const allExportedVariables = filesMapping[fileLocation].exportedVariables;
  try {
    // If the entire object of the file was referred
    const referencesUsingThisFile = getReferencesOfVariableUsingGivenFile(
      allExportedVariables,
      fileLocation
    );
    if (referencesUsingThisFile || allExportedVariables.isEntryFileObject)
      isReferred = true;
  } catch (_) {}
  if (isReferred) return true;
  Object.entries(allExportedVariables).some(
    ([variableName, variableObject]) => {
      try {
        const referencesUsingThisFile = getReferencesOfVariableUsingGivenFile(
          variableObject,
          fileLocation
        );
        if (referencesUsingThisFile || variableObject.isEntryFileObject) {
          isReferred = true;
          return true;
        }
        // default exports can contain many exports declared inside this file itself
        if (variableName !== DEFAULT) return false;

        Object.entries(variableObject).some(([_, childObject]) => {
          try {
            const referencesUsingThisFile =
              getReferencesOfVariableUsingGivenFile(childObject, fileLocation);

            if (referencesUsingThisFile || childObject.isEntryFileObject) {
              isReferred = true;
              return true;
            }
            return false;
          } catch (_) {
            return false;
          }
        });
        return isReferred;
      } catch (_) {
        return false;
      }
    }
  );
  return isReferred;
};

/**
 * Used to check the references of a particular variable made using a file which exports this variable
 * @param {Object} variable Variable to check
 * @param {String} fileLocation Absolute address of the provided file
 * @returns Integer denoting references made using this file
 */
const getReferencesOfVariableUsingGivenFile = (variable, fileLocation) => {
  let referencesUsingThisFile = variable.referenceCount;
  if (
    variable.individualFileReferencesMapping &&
    variable.individualFileReferencesMapping[fileLocation]
  ) {
    // If file refers this variable too, then remove those references
    referencesUsingThisFile -=
      variable.individualFileReferencesMapping[fileLocation].referenceCount -
      variable.individualFileReferencesMapping[fileLocation]
        .exportReferenceCount;
  }
  return referencesUsingThisFile;
};

/**
 * Used to check whether a file is an entry file or not
 * @param {Array} entryFilesArray Array of entry files
 * @returns Mapping of files
 */
export const buildEntryFilesMappingFromArray = (entryFilesArray) => {
  const entryFilesMapping = {};
  entryFilesArray.forEach((file) => (entryFilesMapping[file] = true));
  return entryFilesMapping;
};
