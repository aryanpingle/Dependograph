import {
  DISPLAY_TEXT,
  SUCCESSFUL_IDENTIFICATION_OF_ALL_DEPENDENCIES_AT_GIVEN_DEPTH_MESSAGE,
  UNSUCCESSFUL_IDENTIFICATION_OF_ALL_DEPENDENCIES_AT_GIVEN_DEPTH_MESSAGE,
} from "../constants/index.js";
import { isFileNotExcluded } from "../helper.js";
import { isFilePath } from "../resolver.js";
import { getFilePoints } from "./common.js";

/**
 * Checks for all dependencies at a provided depth which were actually referred by any file
 * @param {Object} outsideModuleCheckRegex Regex to decide whether a given file is a dependency at a given depth or not
 * @param {Object} filesMetadata Contains information related to all files
 * @returns Array of files which are dependencies at a given depth of the provided module location
 */
export const getDependenciesAtGivenDepth = (
  outsideModuleCheckRegex,
  filesMetadata
) => {
  const excludedFilesRegex = filesMetadata.excludedFilesRegex;
  const dependenciesAtGivenDepthArray = [];
  const filesMapping = filesMetadata.filesMapping;
  Object.keys(filesMapping).forEach((file) => {
    if (
      // If the file is not excluded, satisfies dependency at a given depth condition, and is also reffered
      outsideModuleCheckRegex.test(file) &&
      isFilePath(file) &&
      isFileNotExcluded(excludedFilesRegex, file)
    ) {
      dependenciesAtGivenDepthArray.push({
        file,
        filePoints: getFilePoints(file, filesMapping),
      });
    }
  });
  // If no errors found during traversal
  if (filesMetadata.unparsableVistedFiles === 0)
    process.send({
      text: SUCCESSFUL_IDENTIFICATION_OF_ALL_DEPENDENCIES_AT_GIVEN_DEPTH_MESSAGE,
      messageType: DISPLAY_TEXT,
    });
  else
    process.send({
      text: UNSUCCESSFUL_IDENTIFICATION_OF_ALL_DEPENDENCIES_AT_GIVEN_DEPTH_MESSAGE,
      messageType: DISPLAY_TEXT,
    });

  return dependenciesAtGivenDepthArray;
};

/**
 * Will generate a mapping containing information related to dependency at a given depth and the files which import them
 * @param {Array} dependenciesAtGivenDepthArray Array containing the dependencies at a given depth
 * @param {Object} filesMetadata Contains information related to all files
 * @returns Mapping of files which follows the depth criteria and the files which imports them
 */
export const getDependenciesAtGivenDepthUsageMapping = (
  dependenciesAtGivenDepthArray,
  filesMetadata
) => {
  const dependenciesUsageMapping = {};
  dependenciesAtGivenDepthArray.forEach(
    (fileObject) => (dependenciesUsageMapping[fileObject.file] = [])
  );
  Object.entries(filesMetadata.filesMapping).forEach(
    ([fileName, fileObject]) => {
      Object.keys(fileObject.staticImportFilesMapping).forEach(
        (dependentFile) => {
          if (dependenciesUsageMapping[dependentFile])
            dependenciesUsageMapping[dependentFile].push(fileName);
        }
      );
    }
  );
  return dependenciesUsageMapping;
};
