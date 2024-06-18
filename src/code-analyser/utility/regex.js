import process from "process";
import {
  resolveAddressWithProvidedDirectory,
  joinSubPartsTillGivenDepth,
  getAllSubPartsOfGivenAbsolutePath,
} from "./resolver.js";
import { isInstanceofRegexExpression } from "./helper.js";
import { EMPTY_STRING, DEFAULT_REGEX_STRING } from "./constants/index.js";

/**
 * Builds a regex which excludes files based on the input given in the configuration file initially
 * @param {Array} excludedModulesArray Array consisting of paths/ regex expressions of files/ directories which have to be exlcuded
 * @returns Regex denoting the excluded files
 */
export const buildExcludedFilesRegex = (
  excludedModulesArray,
  includedModulesArray
) => {
  let excludedFilesAddressToRegexString = EMPTY_STRING,
    excludedFilesRegexString = EMPTY_STRING,
    includedFilesAddressToRegexString = EMPTY_STRING;

  let excludedPathsWithRegexCount = 0,
    excludedPathsWithoutRegexCount = 0,
    includedPathsWithoutRegexCount = 0;

  excludedModulesArray.forEach((file) => {
    if (isInstanceofRegexExpression(file)) {
      // Add "|" to set the regex as either match this regex or some other regex
      excludedFilesRegexString += `${file.source}|`;
      excludedPathsWithRegexCount++;
    } else {
      const moduleAbsoluteAddress = resolveAddressWithProvidedDirectory(
        process.cwd(),
        file
      );
      // Either match this module's address or another module's address
      excludedFilesAddressToRegexString += `${convertAddressIntoRegexCompatibleFormat(
        moduleAbsoluteAddress
      )}|`;
      excludedPathsWithoutRegexCount++;
    }
  });
  // To include only those files which are required to be checked
  includedModulesArray.forEach((file) => {
    const moduleAbsoluteAddress = resolveAddressWithProvidedDirectory(
      process.cwd(),
      file
    );
    includedPathsWithoutRegexCount++;
    includedFilesAddressToRegexString += `${convertAddressIntoRegexCompatibleFormat(
      moduleAbsoluteAddress
    )}|`;
  });

  excludedFilesRegexString = excludedPathsWithRegexCount
    ? excludedFilesRegexString.slice(0, -1)
    : DEFAULT_REGEX_STRING;

  excludedFilesAddressToRegexString = excludedPathsWithoutRegexCount
    ? excludedFilesAddressToRegexString.slice(0, -1)
    : DEFAULT_REGEX_STRING;

  includedFilesAddressToRegexString = includedPathsWithoutRegexCount
    ? `^(?!(${includedFilesAddressToRegexString.slice(0, -1)}))`
    : DEFAULT_REGEX_STRING;

  // Either match the regex provided or provided modules paths or based on the included addresses provided
  const regexInStringFormat = `${excludedFilesRegexString}|${excludedFilesAddressToRegexString}|${includedFilesAddressToRegexString}`;
  const excludedPointsRegex = new RegExp(regexInStringFormat, "i");
  return excludedPointsRegex;
};

/**
 * Build a regex which will be used to set the dependencies at given depth check's required condition
 * @param {String} moduleLocation Absolute/ Relative path of the module relative to which the check has to be performed
 * @param {Boolean} isDepthFromFront To check whether the depth has to be measured from front or back
 * @param {Integer} depth Depth at which dependencies should be checked
 * @returns Regex containg the dependencies at given depth's required condition
 */
export const buildDependenciesAtGivenDepthRegex = ({
  moduleLocation,
  isDepthFromFront,
  depth,
}) => {
  const pathSubPartsArray = getAllSubPartsOfGivenAbsolutePath(moduleLocation);
  const pathSubPartsArrayLength = pathSubPartsArray.length;
  const resolvedDepth = isDepthFromFront
    ? depth + 1
    : pathSubPartsArrayLength - depth;
  // Directory containg the required module which is at depth = resolvedDepth from the provided module's location
  const directoryToCheckAtGivenDepth = joinSubPartsTillGivenDepth(
    pathSubPartsArray,
    resolvedDepth + 1
  );

  const regexCompatibleDirectoryLocation = `${convertAddressIntoRegexCompatibleFormat(
    directoryToCheckAtGivenDepth
  )}(([\\/\].+)*)`;
  // Regex denotes any module which starts with the siblingLocation's path but doesn't start with module's ancestor directory at the given depth
  return {
    outsideModuleCheckRegex: new RegExp(
      `^(?!${regexCompatibleDirectoryLocation})`,
      "i"
    ),
    insideModuleCheckRegex: new RegExp(
      `^${regexCompatibleDirectoryLocation}`,
      "i"
    ),
  };
};

/**
 * Converts the given address into a format whose meaning will not change when placed inside a regex expression
 * @param {String} addressString Absolute address of the file which has to be converted into regex compatible format
 * @returns Regex compatible address string
 */
const convertAddressIntoRegexCompatibleFormat = (addressString) => {
  const characterArray = [...addressString];
  const convertedAddress = characterArray.reduce((parsedAddress, character) => {
    // Use regex to check for any special character used
    parsedAddress += /[\/\[\]\*\+\?\.\|\^\{\}\-\$\,]/.test(character)
      ? `\\${character}`
      : character;
    return parsedAddress;
  }, EMPTY_STRING);
  return convertedAddress;
};
