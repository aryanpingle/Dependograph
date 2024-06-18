import cliTableBuilder from "cli-table3";

/**
 * Will be used to print the analysed data
 * Will provide information related to how many files are feasible, entry, encountered, parsed or are dead
 * @param {Object} filesMetadata Contains information related to all files
 * @param {Object} filesLengthObject Contains information related to various types of files
 */
export const produceAnalysedDeadFilesResult = (
  filesMetadata,
  { deadFiles, filesToCheck, entryFiles }
) => {
  const statsTable = new cliTableBuilder({
    head: ["Type", "Count", "Percentage"],
  });
  const totalFilesEcountered = Object.keys(filesMetadata.filesMapping).length,
    totalFilesParsed = Object.keys(filesMetadata.visitedFilesMapping).length;
  const typeArray = [
    "Feasible Files",
    "Entry Files",
    "Files Encountered",
    "Files Parsed",
    "Dead Files",
  ];
  const countArray = [
    filesToCheck,
    entryFiles,
    totalFilesEcountered,
    totalFilesParsed,
    deadFiles,
  ];

  typeArray.forEach((arrayElement, index) => {
    statsTable.push([
      arrayElement,
      countArray[index],
      ((countArray[index] / filesToCheck) * 100).toFixed(2),
    ]);
  });
  console.log(statsTable.toString());
};
