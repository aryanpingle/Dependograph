import cliTableBuilder from "cli-table3";

// Same as produceAnalysedDeadFilesResult function but will provide information related to dependencies at a given depth instead of dead files
export const produceAnalysedDependenciesAtGivenDepthResult = (
  filesMetadata,
  { dependenciesAtGivenDepth, entryFiles }
) => {
  const statsTable = new cliTableBuilder({
    head: ["Type", "Count", "Percentage"],
  });
  const totalFilesEcountered = Object.keys(filesMetadata.filesMapping).length,
    totalFilesParsed = Object.keys(filesMetadata.visitedFilesMapping).length;

  const typeArray = [
    "Files Encountered",
    "Files Parsed",
    "Entry Files",
    "Feasible Static Dependencies",
    "Dependencies at the provided depth",
  ];
  const countArray = [
    totalFilesEcountered,
    totalFilesParsed,
    entryFiles,
    totalFilesEcountered - entryFiles,
    dependenciesAtGivenDepth,
  ];
  typeArray.forEach((arrayElement, index) => {
    statsTable.push([
      arrayElement,
      countArray[index],
      ((countArray[index] / totalFilesEcountered) * 100).toFixed(2),
    ]);
  });
  console.log(statsTable.toString());
};
  