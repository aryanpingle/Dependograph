import process from "process";
import fsPromises from "fs/promises";
import { resolveAddressWithProvidedDirectory, isFilePath } from "./resolver.js";
import { isInstanceofRegexExpression, isFileNotExcluded } from "./helper.js";
import { DEFAULT_ENTRY_ARRAY } from "./constants/index.js";

/**
 * Get all entry files from the directories to check/ module to check (provided in the configuration file)
 * @param {Array} entryArray Array of regex/ paths denoting which entry files are requied
 * @param {Array} allFilesToCheck All files inside the directories where the program will run
 * @param {RegExp} excludedFilesRegex Regex denoting excluded files
 * @returns Array consisting of all entry files
 */
export const getAllEntryFiles = async (
  entryArray = DEFAULT_ENTRY_ARRAY,
  allFilesToCheck = [],
  excludedFilesRegex
) => {
  // Mapping required to remove redundant traversal of directories
  const visitedEntryDirectoriesMapping = {};
  const entryFilesArray = await entryArray.reduce(
    async (discoveredEntryFilesPromise, entry) => {
      const discoveredEntryFiles = await discoveredEntryFilesPromise;
      if (isInstanceofRegexExpression(entry)) {
        allFilesToCheck.forEach((file) => {
          // if a file matches the regex and also is not excluded
          if (entry.test(file) && isFileNotExcluded(excludedFilesRegex, file))
            discoveredEntryFiles.push(file);
        });
      } else {
        // getAllFiles will return all non-excluded files from the "entry" directory
        const filesInsideThisDirectory =
          await getAllFilesInsideProvidedDirectories(
            [entry],
            visitedEntryDirectoriesMapping,
            excludedFilesRegex
          );
        // Simply using deconstructor to add these files inside the array may result in memory overflow
        filesInsideThisDirectory.forEach((file) => {
          discoveredEntryFiles.push(file);
        });
      }
      return discoveredEntryFiles;
    },
    Promise.resolve([])
  );
  return entryFilesArray;
};

/**
 * Get all feasible files present in any one of the directories which are provided
 * @param {Array} directoriesToCheck Array of directories from which all files will be extracted
 * @param {RegExp} excludedFilesRegex Regex denoting excluded files
 * @returns Array of feasible files present in any one of the directories which have to be checked
 */
export const getAllFilesToCheck = async (
  directoriesToCheck = [],
  excludedFilesRegex
) => {
  // Mapping required to remove redundant traversal of directories
  const visitedDirectoriesToCheckMapping = {};
  return await getAllFilesInsideProvidedDirectories(
    directoriesToCheck,
    visitedDirectoriesToCheckMapping,
    excludedFilesRegex
  );
};

/**
 * Returns all feasible files present inside the provided directories
 * @param {Array} allDirectories Array of directories to check
 * @param {Object} visitedDirectoriesMapping Mapping to remove redundant traversal of directories
 * @param {RegExp} excludedFilesRegex Regex denoting excluded files
 * @returns Array of feasible files present in any one of the provided directories
 */
const getAllFilesInsideProvidedDirectories = async (
  allDirectories,
  visitedDirectoriesMapping,
  excludedFilesRegex
) => {
  const allFiles = await allDirectories.reduce(
    async (discoveredDirectoriesPromise, directory) => {
      const discoveredDirectories = await discoveredDirectoriesPromise;
      const directoyAbsoluteAddress = resolveAddressWithProvidedDirectory(
        // This directory is inside utility, so get it's parent directory according to which paths were provided in the configuration file
        process.cwd(),
        directory
      );
      if (isFilePath(directoyAbsoluteAddress)) {
        if (isFileNotExcluded(excludedFilesRegex, directoyAbsoluteAddress))
          discoveredDirectories.push(directoyAbsoluteAddress);

        return discoveredDirectories;
      }

      const directoriesFiles = await getAllFilesInsideOneDirectory(
        directoyAbsoluteAddress,
        visitedDirectoriesMapping,
        excludedFilesRegex
      );
      directoriesFiles.forEach((file) => discoveredDirectories.push(file));
      return discoveredDirectories;
    },
    Promise.resolve([])
  );
  return allFiles;
};

/**
 * Returns all feasible files present inside a directory
 * @param {String} directoryLocation Path of the given directory
 * @param {Object} visitedDirectoriesMapping Mapping to keep track of visited locations
 * @param {RegExp} excludedFilesRegex Regex denoting excluded files
 * @returns Array of feasible files present inside the provided directory
 */
const getAllFilesInsideOneDirectory = async (
  directoryLocation,
  visitedDirectoriesMapping,
  excludedFilesRegex
) => {
  if (
    visitedDirectoriesMapping[directoryLocation] ||
    excludedFilesRegex.test(directoryLocation)
  )
    return [];

  // If not excluded then mark this location as visited, to remove redundant traversals of this location
  visitedDirectoriesMapping[directoryLocation] = true;
  const allFilesAndDirectoriesInsideThisDirectoryInDirentFormat =
    await fsPromises.readdir(directoryLocation, {
      withFileTypes: true,
    });
  const allFilesAndDirectoriesInsideThisDirectory =
    allFilesAndDirectoriesInsideThisDirectoryInDirentFormat.map(
      (fileObject) => {
        return { name: fileObject.name, isDirectory: fileObject.isDirectory() };
      }
    );
  const allFiles = await allFilesAndDirectoriesInsideThisDirectory.reduce(
    async (retrievedElementsPromise, childElement) => {
      const retrievedElements = await retrievedElementsPromise;
      if (childElement.isDirectory) {
        // location is a directory
        const filesInsideThisSubDirectory = await getAllFilesInsideOneDirectory(
          resolveAddressWithProvidedDirectory(
            directoryLocation,
            childElement.name
          ),
          visitedDirectoriesMapping,
          excludedFilesRegex
        );
        filesInsideThisSubDirectory.forEach((file) =>
          retrievedElements.push(file)
        );
      } else {
        // location is a file
        const fileLocation = resolveAddressWithProvidedDirectory(
          directoryLocation,
          childElement.name
        );
        if (isFileNotExcluded(excludedFilesRegex, fileLocation))
          retrievedElements.push(fileLocation);
      }
      return retrievedElements;
    },
    Promise.resolve([])
  );
  return allFiles;
};
