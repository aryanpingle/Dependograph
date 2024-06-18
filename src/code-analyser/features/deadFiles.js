import { codeAnalyserConfigurationObject } from "../utility/configuration.js";
import { CHECK_DEAD_FILES } from "../utility/constants/index.js";
import {
  getDeadFilesAndSendMessageToParent,
  analyseCode,
  setAllFilesExports,
  buildEntryFilesMappingFromArray,
  getAllRequiredFiles,
} from "../utility/featuresUtility/index.js";

/**
 * Function which first analyses the code and prints the dead files present on the console
 * @param {Object} filesMetadata Object which contains information related to all files parsed
 * @param {Object} programConfiguration Object which contains information related to which files have to be checked
 */
export const analyseCodeAndDetectDeadfiles = async (
  filesMetadata,
  programConfiguration
) => {
  const excludedFilesRegex = filesMetadata.excludedFilesRegex;

  // allEntryFiles: An array of absolute paths to all entry files
  // allFilesToCheck: Same, for all files in the directory to be checked
  const { allEntryFiles, allFilesToCheck } = await getAllRequiredFiles(
    {
      directoriesToCheck: programConfiguration.directoriesToCheck,
      entry: programConfiguration.entry,
    },
    excludedFilesRegex
  );

  // Build a simple object that maps { entry_file: true }
  const entryFilesMapping = buildEntryFilesMappingFromArray(allEntryFiles);
  // Recursively go through every entry file, setting the imports and exported variables
  setAllFilesExports(allEntryFiles, filesMetadata, entryFilesMapping);

  // Reset the visited files, will traverse them again
  filesMetadata.visitedFilesMapping = {};
  // Revisit all files, checking for usage
  // This effectively just changes the variable reference counts
  analyseCode(allEntryFiles, filesMetadata);
};
