import { codeAnalyserConfigurationObject } from "../utility/configuration.js";
import { CHECK_FILES_CONTRIBUTING_IN_MULTIPLE_CHUNKS } from "../utility/constants/index.js";
import {
  getAllRequiredFiles,
  setImportedFilesMapping,
  createWebpackChunkMetadata,
  getFilesContributingInMultipleChunks,
  getFilesContributingInMultipleChunksMapping,
} from "../utility/featuresUtility/index.js";

/**
 * Function which first analyses the code and then prints the files which are present in more than one chunk on the console
 * @param {Object} filesMetadata Object which contains information related to all files parsed
 * @param {Object} programConfiguration Object which contains information related to which files have to be checked
 */
export const analyseCodeAndDetectAllFilesPresentInMultipleChunks = async (
  filesMetadata,
  programConfiguration
) => {
  const excludedFilesRegex = filesMetadata.excludedFilesRegex;
  const { allEntryFiles } = await getAllRequiredFiles(
    {
      directoriesToCheck: programConfiguration.directoriesToCheck,
      entry: programConfiguration.entry,
    },
    excludedFilesRegex
  );
  setImportedFilesMapping(allEntryFiles, filesMetadata, {
    checkStaticImportsOnly: false,
  });
  const webpackChunkMetadata = createWebpackChunkMetadata(filesMetadata);
  const allFilesInMultipleChunks =
    getFilesContributingInMultipleChunks(webpackChunkMetadata);
  const allFilesInMultipleChunksMapping =
    getFilesContributingInMultipleChunksMapping(allFilesInMultipleChunks);

  process.send({
    filesArray: allFilesInMultipleChunks,
    filesUsageMapping: allFilesInMultipleChunksMapping,
    messageType: CHECK_FILES_CONTRIBUTING_IN_MULTIPLE_CHUNKS,
    interact: codeAnalyserConfigurationObject.interact,
  });
};
