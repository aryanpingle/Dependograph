import path from "path";
import enhancedResolve from "enhanced-resolve";
import { existsSync, statSync } from "fs";
import { codeAnalyserConfigurationObject } from "./configuration.js";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import JsConfigPathsPlugin from "jsconfig-paths-webpack-plugin";
import process from "process";
import {
  JSCONFIG_FILE,
  TSCONFIG_FILE,
  FILE,
  UNRESOLVED_TYPE,
  INBUILT_NODE_MODULE,
  EMPTY_STRING,
  SPACE,
  OBJECT,
  VALID_EXTENSIONS_ARRAY,
  DEFAULT_MODULES_ARRAY,
} from "./constants/index.js";

/**
 * Checks if the given path is absolute or not
 * @param {String} pathToCheck Path of the required module to check
 * @returns Boolean value denoting whether the given path is absolute or not
 */
export const isPathAbsolute = (pathToCheck) =>
  pathToCheck && path.isAbsolute(pathToCheck);

/**
 * Returns the provided path's directory address
 * @param {String} pathToRetrieveFrom
 * @returns Address of the path's directory
 */
export const getDirectoryFromPath = (pathToRetrieveFrom) =>
  path.dirname(pathToRetrieveFrom);

/**
 * Function to get the address of an ancestor directory of the provided path
 * @param {String} pathToRetrieveFrom Given path from which the predecessor directory's path will be retrieved
 * @param {Integer} depthFromCurrentNode Smallest distance between the ancestor and current nodes
 * @returns Address of the ancestor directory of the provided path at the given depth
 */
export const getPredecessorDirectory = (
  pathToRetrieveFrom,
  depthFromCurrentNode
) => {
  // If current node is the required ancestor node
  if (depthFromCurrentNode === 0) return pathToRetrieveFrom;
  // Else recursicely traverse this node with one less depth
  return getPredecessorDirectory(
    getDirectoryFromPath(pathToRetrieveFrom),
    depthFromCurrentNode - 1
  );
};

/**
 * Resolves the address and returns an absolute path to that module
 * @param {String} parentDirectoryAddress Absolute address of the module's parent directory
 * @param {String} givenModuleAddress Given module's path
 * @returns Absolute address of the required module
 */
export const resolveAddressWithProvidedDirectory = (
  parentDirectoryAddress,
  givenModuleAddress
) => {
  if (isPathAbsolute(givenModuleAddress)) return givenModuleAddress;
  return path.join(parentDirectoryAddress, givenModuleAddress);
};

/**
 * Checks if the provided path actually exists or not
 * @param {String} givenPath Path which has to be checked
 * @returns Boolean value which denotes whether the path is present or not
 */
const isGivenPathPresent = (givenPath) => givenPath && existsSync(givenPath);

/**
 * Checks if the given path represents a file
 * @param {String} givenPath Address to check
 * @returns Boolean value denoting whether the path is a file's address or not
 */
export const isFilePath = (givenPath) => {
  if (isGivenPathPresent(givenPath)) return statSync(givenPath).isFile();
  return false;
};

/**
 * This function will resolve the address of the required file using it's directory and file address
 * @param {String} directoryAddress Absolute address of the required file/ folder's directory
 * @param {String} fileAddress Given path of the file (relative, absolute, node module)
 * @param {String} pathType Provided type of path (either FILE or UNRESOLVED TYPE)
 * @returns Resolved path of the given address
 */
export const pathResolver = (
  directoryAddress,
  fileAddress,
  pathType = FILE
) => {
  try {
    // Unresolved type is given to the paths which are declared using template literals (They can be dynamic strings)
    if (
      pathType === UNRESOLVED_TYPE &&
      isGivenPathPresent(
        resolveAddressWithProvidedDirectory(directoryAddress, fileAddress)
      )
    ) {
      return {
        type: UNRESOLVED_TYPE,
        fileAddress: resolveAddressWithProvidedDirectory(
          directoryAddress,
          fileAddress
        ),
      };
    }
    return {
      type: FILE,
      fileAddress: enhancedResolver(directoryAddress, fileAddress),
    };
  } catch (_) {
    if (
      fileAddress &&
      isGivenPathPresent(
        resolveAddressWithProvidedDirectory(directoryAddress, fileAddress)
      )
    ) {
      // If this path exists, then it means the program is unable to resolve it's type (file/ folder)
      return {
        type: UNRESOLVED_TYPE,
        fileAddress: resolveAddressWithProvidedDirectory(
          directoryAddress,
          fileAddress
        ),
      };
    }
    return { type: INBUILT_NODE_MODULE, fileAddress };
  }
};

/**
 * Will find all the sub-parts which are present in a given path
 * For eg. path: A/B/C/D -> returned value [A, B, C, D]
 * @param {String} givenPath Absolute address of the path from which sub-parts have to be retrieved
 * @returns Array consisting of all sub-parts (in order) of the given path
 */
export const getAllSubPartsOfGivenAbsolutePath = (givenPath) => {
  const subPartsArray = [];
  let pathToRetrieveFrom = givenPath;
  while (pathToRetrieveFrom.length > 1) {
    subPartsArray.unshift(getPathBaseName(pathToRetrieveFrom));
    pathToRetrieveFrom = getDirectoryFromPath(pathToRetrieveFrom);
  }
  subPartsArray.unshift(EMPTY_STRING);
  return subPartsArray;
};

export const getNumberOfSubPartsOfGivenAbsolutePath = (givenPath) => {
  let subPartsCount = 0;
  let pathToRetrieveFrom = givenPath;
  while (pathToRetrieveFrom.length > 1) {
    subPartsCount += 1;
    pathToRetrieveFrom = getDirectoryFromPath(pathToRetrieveFrom);
  }
  return subPartsCount;
};
/**
 * Will join together the sub-parts to form an absolute address which contains at most given depth's sub parts
 * @param {Array} subPartsArray Array consisting of sub-parts
 * @param {Integer} depth Will be used to decide till what level sub-parts should be present
 * @returns Absolute address joined using the provided array and depth
 */
export const joinSubPartsTillGivenDepth = (subPartsArray, depth) => {
  const arrayAtGivenDepth = subPartsArray.filter((_, index) => index < depth);
  const pathAtGivenDepth = arrayAtGivenDepth.reduce(
    (reducer, subPart) => path.join(reducer, subPart),
    SPACE
  );
  return pathAtGivenDepth.trim();
};

export const getPathBaseName = (fileLocation) => path.basename(fileLocation);

export const getFileNameFromElement = (fileElement) =>
  typeof fileElement === OBJECT ? fileElement.file : fileElement;

const settings = {
  extensions: VALID_EXTENSIONS_ARRAY,
  modules: DEFAULT_MODULES_ARRAY,
  plugins: [],
};

// Improving resolver if root directory provided
if (codeAnalyserConfigurationObject.rootDirectory)
  [JSCONFIG_FILE, TSCONFIG_FILE].forEach((file, index) => {
    const resolvedPath = resolveAddressWithProvidedDirectory(
      resolveAddressWithProvidedDirectory(
        process.cwd(),
        codeAnalyserConfigurationObject.rootDirectory
      ),
      file
    );
    if (isFilePath(resolvedPath)) {
      if (index)
        settings.plugins.push(
          new TsconfigPathsPlugin({
            configFile: resolvedPath,
          })
        );
      else
        settings.plugins.push(
          new JsConfigPathsPlugin({ configFile: resolvedPath })
        );
    }
  });

const enhancedResolver = new enhancedResolve.create.sync(settings);
