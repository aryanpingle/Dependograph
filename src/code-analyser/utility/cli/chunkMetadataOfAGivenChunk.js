import cliTableBuilder from "cli-table3";
import yargs from "yargs";
import { BOLD } from "../constants/index.js";
import { getSizeFromInteger } from "../parseElements.js";

/**
 * Function which displays the metadata of a given chunk, which is formed by taking the given file as the entry
 * @param {Object} cacheMapping Cached data which is used to display information related to each file which is present inside the chunk
 * @param {String} fileLocation Absolute address of the file which will used as an entry to build the chunk's metadata
 */
export const displayChunkMetadaRelatedInformation = (
  cacheMapping,
  fileLocation
) => {
  const fileInformationArray = cacheMapping[fileLocation].dependencyArray;
  if (fileInformationArray.length === 0) return;
  fileInformationArray.sort(
    (firstFile, secondFile) =>
      cacheMapping[secondFile].effectiveSize -
      cacheMapping[firstFile].effectiveSize
  );
  const statsTable = new cliTableBuilder({
    head: ["Index", "File Name", "Effective Size"],
  });
  const totalFilesToShow = yargs(process.argv).parse().totalFilesToShow;
  fileInformationArray.forEach((file, index) => {
    if (totalFilesToShow !== -1 && index >= totalFilesToShow) return;
    const currentFileSize = cacheMapping[file]
      ? cacheMapping[file].effectiveSize
      : 0;
    statsTable.push([index + 1, file, getSizeFromInteger(currentFileSize)]);
  });
  console.log(statsTable.toString());
  console.log(
    BOLD,
    `\nTotal Chunk Size: ${getSizeFromInteger(
      cacheMapping[fileInformationArray[0]].effectiveSize
    )}\n`
  );
};
