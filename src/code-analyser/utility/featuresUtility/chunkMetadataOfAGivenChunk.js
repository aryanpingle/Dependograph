import { isFileNotExcluded } from "../helper.js";
import { cacheMapping } from "../configuration.js";

/**
 * Function to find all the dependencies of the provided file and their file sizes
 * @param {String} fileLocation File whose dependencies are needed
 * @param {Object} filesMetadata Contains information related to all files
 * @returns Set containing all dependencies of a given file along with their size
 */
export const getAllDependentFiles = (fileLocation, filesMetadata) => {
  const currentFilesSet = new Set();
  currentFilesSet.add(fileLocation);
  cacheMapping[fileLocation] = {
    dependencySet: currentFilesSet,
    effectiveSize: filesMetadata.filesMapping[fileLocation].fileSize,
  };

  Object.keys(
    filesMetadata.filesMapping[fileLocation].staticImportFilesMapping
  ).forEach((dependentFile) => {
    if (!isFileNotExcluded(filesMetadata.excludedFilesRegex, dependentFile))
      return;
    const dependentFileSet = cacheMapping[dependentFile]
      ? cacheMapping[dependentFile].dependencySet
      : getAllDependentFiles(dependentFile, filesMetadata);
    dependentFileSet.forEach((dependentFileSetElement) => {
      currentFilesSet.add(dependentFileSetElement);
    });
  });
  cacheMapping[fileLocation] = {
    dependencySet: currentFilesSet,
    dependencyArray: Array.from(currentFilesSet),
    effectiveSize: getEffectiveSizeFromSet(
      Array.from(currentFilesSet),
      filesMetadata
    ),
  };
  return currentFilesSet;
};

const getEffectiveSizeFromSet = (currentFilesArray, filesMetadata) => {
  return currentFilesArray.reduce((reducedValue, file) => {
    return (
      reducedValue +
      (filesMetadata.filesMapping[file] &&
      filesMetadata.filesMapping[file].fileSize
        ? filesMetadata.filesMapping[file].fileSize
        : 0)
    );
  }, 0);
};
