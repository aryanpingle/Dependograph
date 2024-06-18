import { DEFAULT, FILE, SPACE } from "./constants/index.js";
import { isFileExtensionNotValid } from "./helper.js";
import { buildExcludedFilesRegex } from "./regex.js";
import { getPathBaseName } from "./resolver.js";

/**
 * Returns the default filesMetadata object
 * @param {RegExp} exclude Regex expression denoting excluded files
 * @param {RegExp} include Regex expression denoting included files
 * @returns Object containing all files' metadata
 */
const createNewFilesMetadataObject = (exclude, include) => {
  return {
    filesMapping: {},
    visitedFilesMapping: {},
    excludedFilesRegex: buildExcludedFilesRegex(exclude, include),
    unparsableVistedFiles: 0,
  };
};

/**
 * Returns an object which sets the default values corresponding to each file's object
 * @param {String} fileLocation Address of the file for which default object has to be created
 * @param {String} type Denotes whether it is a "FILE" or "UNRESOLVED_TYPE"
 * @returns Object consisting of default information related to that file
 */
const createNewDefaultFileObject = (fileLocation, type = FILE) => {
  const newFileObject = {
    name: getPathBaseName(fileLocation),
    type,
    fileLocation: fileLocation,
    isEntryFile: false,
    exportedVariables: {
      // If the whole exportVariables object is referred
      referenceCount: 0,
      individualFileReferencesMapping: {},
    },
    staticImportFilesMapping: {},
    webpackChunkConfiguration: {},
    importedFilesMapping: {},
  };
  if (isFileExtensionNotValid(fileLocation))
    newFileObject.exportedVariables[DEFAULT] =
      createNewDefaultVariableObject(fileLocation);

  return newFileObject;
};

/**
 * Will generate a new object which will used by other file's to refer the exported variables
 * @param {String} fileLocation Address of the file inside which the object was first generated
 * @param {String} name Local name of the object
 * @returns Object containing information which will used to check whether it has been used or not
 */
const createNewDefaultVariableObject = (
  fileLocation,
  name = DEFAULT,
  isEntryFileObject = false
) => {
  return {
    localName: name,
    firstReferencedAt: fileLocation,
    referenceCount: 0,
    isEntryFileObject,
    individualFileReferencesMapping: {},
  };
};

/**
 * Returns the default current File Metadata object
 * @param {String} fileLocation Address of the file whose metadata has to be returned
 * @returns Object containing current file's default metadata
 */
const createNewDefaultCurrentFileMetadataObject = (
  fileLocation,
  isEntryFile = false
) => {
  const newFileObject = {
    importedVariables: {},
    importedVariablesMetadata: {},
    exportedVariables: {
      referenceCount: 0,
      isEntryFileObject: isEntryFile,
      individualFileReferencesMapping: {},
    },
    importedFilesMapping: {},
    staticImportFilesMapping: {},
    fileLocation,
    isEntryFile,
  };
  if (isFileExtensionNotValid(fileLocation))
    // If not a valid extension, then as we won't parse it therefore create a default export object for it
    newFileObject.exportedVariables[DEFAULT] =
      createNewDefaultVariableObject(fileLocation);

  return newFileObject;
};

/**
 * Returns a new import object which will be used during the "CHECK_IMPORTS" stage
 * @param {String} name Import name of the variable
 * @param {String} localName Local name in the current file
 * @param {String} type To tell whether all exports will be imported or a specific import will be taken
 * @param {String} importedFileAddress Absolute address of the imported file
 * @returns Object which contains the above information
 */
const createNewImportMetadataObject = (
  name,
  localName,
  type,
  importedFileAddress,
  count = 0
) => {
  return {
    name,
    localName,
    type,
    isDefaultImport: false,
    importedFrom: importedFileAddress,
    referenceCountObject: {
      referenceCount: count,
      exportReferenceCount: 0,
    },
  };
};

// Returns new trie node with the provided properties
const createNewTrieNode = (baseName, pathTillNode = SPACE, isFile = false) => {
  return {
    baseName,
    pathTillNode,
    childrens: {},
    isFile,
  };
};

/**
 * Used to create a new object which will contain the chunks inside which this file is present initially
 * @param {Object} filesMetadata Contains information related to all files
 * @param {String} fileLocation Absolute address of the file to check
 * @returns Object containing an array of initial chunks inside which the given file is present
 */
const createNewDefaultFileChunksObject = (filesMetadata, fileLocation) => {
  const defaultObject = { chunks: [] };
  if (filesMetadata.filesMapping[fileLocation].isEntryFile) {
    defaultObject.chunks.push(fileLocation);
  }
  return defaultObject;
};

// Factory which will create all the objects that are used by the program
export default {
  createNewFilesMetadataObject,
  createNewDefaultFileObject,
  createNewDefaultCurrentFileMetadataObject,
  createNewDefaultVariableObject,
  createNewImportMetadataObject,
  createNewTrieNode,
  createNewDefaultFileChunksObject,
};
