import cliTableBuilder from "cli-table3";
import { GREEN_COLOR } from "../constants/index.js";

/**
 * Will create a new table on the CLI which shows a file, along with the chunks (inside which it is present), which is present in more than one chunk
 * @param {Array} filesObjectArray Array containing the each file's object which contains the chunks inside which it is present and it's address
 */
export const displayFilesContributingInMultipleChunksDetails = (
  filesObjectArray
) => {
  if (filesObjectArray.length === 0) {
    console.log(
      GREEN_COLOR,
      "\n No file meeting the required criteria present."
    );
  }
  filesObjectArray.forEach((fileObject) => {
    const statsTable = new cliTableBuilder({
      head: ["File", fileObject.file],
    });
    fileObject.chunksArray.forEach((chunk, index) => {
      statsTable.push([`Chunk ${index + 1}`, chunk]);
    });
    console.log(statsTable.toString());
  });
};
