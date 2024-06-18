import { isFilePath } from "./resolver.js";

export const isDeadFilesCheckRequired = (programConfiguration) =>
  programConfiguration && programConfiguration.checkDeadFiles;

export const isDependenciesAtGivenDepthCheckRequired = (programConfiguration) =>
  programConfiguration && programConfiguration.checkDependenciesAtGivenDepth;

export const isFilesContributingInMultipleChunksCheckRequired = (
  programConfiguration
) =>
  programConfiguration &&
  programConfiguration.checkFilesContributingInMultipleChunks;

export const isMetadataOfGivenChunkCheckRequired = (programConfiguration) =>
  programConfiguration &&
  programConfiguration.checkChunkMetadataUsingGivenChunk;

export const isInstanceofRegexExpression = (givenString) =>
  givenString instanceof RegExp;

export const isFileMappingNotPresent = (file, filesMetadata) =>
  !filesMetadata.filesMapping[file];

export const isFileNotExcluded = (
  excludedFilesRegex,
  directoyAbsoluteAddress
) =>
  isFilePath(directoyAbsoluteAddress) &&
  !excludedFilesRegex.test(directoyAbsoluteAddress);

// Valid extensions to parse are .js, .jsx, .ts, .tsx
export const isFileExtensionNotValid = (fileLocation) =>
  !/[jt]sx?$/.test(fileLocation);

export const isFileNotVisited = (fileLocation, filesMetadata) =>
  !filesMetadata.visitedFilesMapping[fileLocation];

export const isFileExtensionValid = (fileLocation) =>
  /\.[jt]sx?$/.test(fileLocation);

export const isFileTraversable = (file, filesMetadata) =>
  isFileNotVisited(file, filesMetadata) &&
  isFileExtensionValid(file) &&
  isFileNotExcluded(filesMetadata.excludedFilesRegex, file);
