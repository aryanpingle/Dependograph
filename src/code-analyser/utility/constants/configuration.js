export const DEFAULT_ENTRY_ARRAY = [/.[jt]sx?$/];
export const DEFAULT_REGEX_STRING = "!^()";
export const DEFAULT_TRUE_REGEX_STRING = "^()";
export const IGNORED_FILES_REGEX =
  /(\.git)|(\.spec\.(.*))|(\.mock\.(.*))|(\.fixtures?\.(.*))|(\.test\.(.*))|\.md$|\.woff2$|\.hdr$|\.mp[0-9]$|\.glb$|\.mdx$|\.jade$|\.coffee$|\.styl$|\.story\.(.*)|\.babelrc$|\.env$|\.config\.(.*)|\.DS_Store$/;
export const IGNORED_FOLDERS_REGEX =
  /node_modules|__spec__|__mocks?__|__tests?__|__fixtures?__|\/spec\/|\/tests?\/|\/mocks?\/|\/fixtures?\/|__generated__|storybook|stories/;
export const JSCONFIG_FILE = "jsconfig.json";
export const TSCONFIG_FILE = "tsconfig.json";

export const VALID_EXTENSIONS_ARRAY = [".js", ".jsx", ".ts", ".tsx", ".d.ts"];
export const DEFAULT_MODULES_ARRAY = ["src", "node_modules"];
export const SIZES_ARRAY = ["B", "KB", "MB", "GB", "TB", "PB"];

export const OBJECT = "object";
export const PROPERTY = "property";
export const IMPORT = "Import";
export const THEN = "then";
export const REQUIRE = "require";
export const MODULE = "module";
export const EXPORTS = "exports";

export const ENTRY = "entry";
export const INCLUDE = "include";
export const EXCLUDE = "exclude";
export const CHECK_DEAD_FILES_IN_A_PROJECT = "checkDeadFiles";
export const CHECK_DEPENDENCIES_FOLLOWING_DEPTH_CRITERIA =
  "checkDependenciesAtGivenDepth";
export const CHECK_FILES_IN_MULTIPLE_CHUNKS =
  "checkFilesContributingInMultipleChunks";
export const CHECK_CHUNK_METADATA_USING_GIVEN_CHUNK =
  "checkChunkMetadataUsingGivenChunk";
export const IS_DEPTH_FROM_FRONT = "isDepthFromFront";
export const MODULE_TO_CHECK = "moduleToCheck";
export const DIRECTORIES_TO_CHECK = "directoriesToCheck";
export const ROOT_DIRECTORY = "rootDirectory";
export const DEPTH = "depth";
export const INTERACT = "interact";
export const CHECK_ALL = "checkAll";
export const TOTAL_FILES_TO_SHOW = "totalFilesToShow";
