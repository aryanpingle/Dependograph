import yargs from "yargs";
import {
  EMPTY_STRING,
  IGNORED_FILES_REGEX,
  IGNORED_FOLDERS_REGEX,
  RED_COLOR,
  UNRECOGNIZED_CONFIGURATION_PROVIDED,
  ENTRY,
  INCLUDE,
  EXCLUDE,
  CHECK_DEAD_FILES_IN_A_PROJECT,
  CHECK_DEPENDENCIES_FOLLOWING_DEPTH_CRITERIA,
  CHECK_FILES_IN_MULTIPLE_CHUNKS,
  CHECK_CHUNK_METADATA_USING_GIVEN_CHUNK,
  IS_DEPTH_FROM_FRONT,
  MODULE_TO_CHECK,
  DIRECTORIES_TO_CHECK,
  ROOT_DIRECTORY,
  DEPTH,
  INTERACT,
  CHECK_ALL,
  TOTAL_FILES_TO_SHOW,
  UNDERSCORE,
  FIRST_ARGUMENT,
} from "./constants/index.js";
import {
  getRequiredTypeElementFromString,
  getArrayOfElementsFromString,
} from "./parseElements.js";

export function initConfigObject() {
  Object.assign(codeAnalyserConfigurationObject, {
    checkDeadFiles: false,
    checkDependenciesAtGivenDepth: false,
    checkFilesContributingInMultipleChunks: false,
    checkChunkMetadataUsingGivenChunk: false,
    include: [],
    exclude: [IGNORED_FILES_REGEX, IGNORED_FOLDERS_REGEX],
    rootDirectory: EMPTY_STRING,
    isDepthFromFront: false,
    checkAll: false,
    totalFilesToShow: -1,
    depth: 1,
    interact: false,
  });
}

// Global Configuration object which will be used to decide which files have to be parsed
export const codeAnalyserConfigurationObject = {};

export function setupConfigurationObject() {
  initConfigObject();
  const configurationObject = yargs(process.argv).parse();
  Object.entries(configurationObject).forEach(
    ([configurationName, subObject]) => {
      switch (configurationName) {
        case ENTRY:
          codeAnalyserConfigurationObject[configurationName] =
            getArrayOfElementsFromString(subObject);
          break;
        case INCLUDE:
          codeAnalyserConfigurationObject[configurationName].push(
            ...getArrayOfElementsFromString(subObject)
          );
          break;
        case EXCLUDE:
          codeAnalyserConfigurationObject[configurationName].push(
            ...getArrayOfElementsFromString(subObject)
          );
          break;
        case CHECK_DEAD_FILES_IN_A_PROJECT:
          codeAnalyserConfigurationObject[configurationName] =
            getRequiredTypeElementFromString(subObject);
          break;
        case CHECK_DEPENDENCIES_FOLLOWING_DEPTH_CRITERIA:
          codeAnalyserConfigurationObject[configurationName] =
            getRequiredTypeElementFromString(subObject);
          break;
        case CHECK_FILES_IN_MULTIPLE_CHUNKS:
          codeAnalyserConfigurationObject[configurationName] =
            getRequiredTypeElementFromString(subObject);
          break;
        case CHECK_CHUNK_METADATA_USING_GIVEN_CHUNK:
          codeAnalyserConfigurationObject[configurationName] =
            getRequiredTypeElementFromString(subObject);
          break;
        case IS_DEPTH_FROM_FRONT:
          codeAnalyserConfigurationObject[configurationName] =
            getRequiredTypeElementFromString(subObject);
          break;
        case MODULE_TO_CHECK:
          codeAnalyserConfigurationObject[configurationName] =
            getRequiredTypeElementFromString(subObject, true);
          break;
        case DIRECTORIES_TO_CHECK:
          codeAnalyserConfigurationObject[configurationName] =
            getArrayOfElementsFromString(subObject);
          break;
        case ROOT_DIRECTORY:
          codeAnalyserConfigurationObject[configurationName] =
            getRequiredTypeElementFromString(subObject, true);
          break;
        case DEPTH:
          codeAnalyserConfigurationObject[configurationName] =
            getRequiredTypeElementFromString(subObject);
          break;
        case INTERACT:
          codeAnalyserConfigurationObject[configurationName] =
            getRequiredTypeElementFromString(subObject);
          break;
        case CHECK_ALL:
          codeAnalyserConfigurationObject[configurationName] =
            getRequiredTypeElementFromString(subObject);
          break;
        case TOTAL_FILES_TO_SHOW:
          codeAnalyserConfigurationObject[configurationName] =
            getRequiredTypeElementFromString(subObject);
          break;
        default:
          if (
            configurationName !== UNDERSCORE &&
            configurationName !== FIRST_ARGUMENT
          ) {
            // console.log(RED_COLOR, UNRECOGNIZED_CONFIGURATION_PROVIDED);
            // process.exit();

            // VSCode adds its own keys like "skipWorkspaceStorageLock" which causes code-analyser to fail
            // So we assume the configuration details will be correct
          }
      }
    }
  );
  if (codeAnalyserConfigurationObject.directoriesToCheck)
    codeAnalyserConfigurationObject.include.push(
      ...codeAnalyserConfigurationObject.directoriesToCheck
    );
}

// Used to cache already computed dependencies of a given file (Used when checking chunk metadata of a given file)
export const cacheMapping = {};
