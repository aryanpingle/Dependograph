import cliTableBuilder from "cli-table3";
import {
  GREEN_COLOR,
  YELLOW_COLOR,
  GO_BACK,
  CLEAR,
} from "../constants/index.js";
import { buildTrie, getFirstNodeNotContainingOneChild } from "../trie.js";
import enquirer from "enquirer";
import { displayChunkMetadaRelatedInformation } from "./chunkMetadataOfAGivenChunk.js";

/**
 * Will display the given array in a tabular form on the console
 * @param {Array} filesArray Array which is needed to be displayed on the console
 */
export const displayFilesOnScreen = (filesArray) => {
  if (filesArray.length) {
    filesArray.sort(
      (fileOne, fileTwo) => fileTwo.filePoints - fileOne.filePoints
    );
    const statsTable = new cliTableBuilder({ head: ["Index", "File Address"] });
    filesArray.forEach((fileObject, index) =>
      statsTable.push([index + 1, fileObject.file])
    );
    console.log(statsTable.toString());
  }
  // Print that no file found to display if the given array is empty
  else
    console.log(
      GREEN_COLOR,
      "\nNo file meeting the required criteria present."
    );
};

/**
 * Can be used to display all files along with additional information to display with them on the screen interactively
 * @param {Array} filesArray Contains file name and other information
 * @param {Object} metadata Contains additional information which are printed specifically for some features
 */
export const displayAllFilesInteractively = async (
  filesArray,
  {
    filesUsageMapping = {},
    checkMetadataOfGivenChunk = false,
    cacheMapping = {},
  }
) => {
  if (filesArray.length === 0) {
    console.log(
      GREEN_COLOR,
      "\nNo file meeting the required criteria present."
    );
  }
  const headNode = buildTrie(filesArray);
  const nodesInLastVisitedPaths = [
    { node: headNode, selectedChoiceIndex: null },
  ];

  while (nodesInLastVisitedPaths.length) {
    const lastVisitedNode =
      nodesInLastVisitedPaths[nodesInLastVisitedPaths.length - 1];

    const firstNodeNotContainingOneChild = getFirstNodeNotContainingOneChild(
      lastVisitedNode.node
    );
    const pathToCheck = firstNodeNotContainingOneChild.pathTillNode;
    displayAdditionalInformationIfRequired(
      {
        filesUsageMapping,
        checkMetadataOfGivenChunk,
        cacheMapping,
      },
      pathToCheck
    );
    const { selectedNode: nextNodeToCheck, choiceIndex } =
      await interactivelyDisplayAndGetNextNode(
        firstNodeNotContainingOneChild,
        lastVisitedNode.selectedChoiceIndex
      );

    if (nextNodeToCheck === GO_BACK) nodesInLastVisitedPaths.pop();
    else {
      lastVisitedNode.selectedChoiceIndex = choiceIndex;
      nodesInLastVisitedPaths.push({
        node: nextNodeToCheck,
        selectedChoiceIndex: null,
      });
    }
    process.stdout.write(CLEAR);
  }
};

/**
 * Function to display additional information related to given file if it is required
 * @param {Object} metadata Contains required information mappings and values which will be used to check whether additional information should be displayed or not
 * @param {String} pathToCheck Absolute address of the file whose additional information has to be printed
 */
const displayAdditionalInformationIfRequired = (
  { filesUsageMapping, checkMetadataOfGivenChunk, cacheMapping },
  pathToCheck
) => {
  if (filesUsageMapping[pathToCheck])
    displayFileAdditionalInformation(
      pathToCheck,
      filesUsageMapping[pathToCheck]
    );

  if (checkMetadataOfGivenChunk && cacheMapping[pathToCheck])
    displayChunkMetadaRelatedInformation(cacheMapping, pathToCheck);
};

/**
 * Provides users with choices to select the next file/ folder to visit
 * @param {Object} nodeToCheck Current trie node which is being visited
 * @param {String} selectedChoiceIndex Previously selected choice's index
 * @returns Next trie node to visit
 */
const interactivelyDisplayAndGetNextNode = async (
  nodeToCheck,
  selectedChoiceIndex = GO_BACK
) => {
  const choices = [GO_BACK];
  const addressToNodeMapping = { [GO_BACK]: GO_BACK };
  let prompt;
  // Leaf node
  if (Object.keys(nodeToCheck.childrens).length === 0) {
    prompt = new enquirer.Select({
      message: `Currently at location: ${nodeToCheck.pathTillNode}\n`,
      choices: choices,
      autofocus: selectedChoiceIndex,
    });
  } else {
    Object.values(nodeToCheck.childrens).forEach((childNode) => {
      const nodeToCheckAddress = childNode.pathTillNode;
      choices.push(nodeToCheckAddress);
      addressToNodeMapping[nodeToCheckAddress] = childNode;
    });
    prompt = new enquirer.Select({
      message: `Currently at location: ${nodeToCheck.pathTillNode}\nPick file/folder to check:`,
      choices,
      autofocus: selectedChoiceIndex,
    });
  }
  const choicePicked = await prompt.run();
  return {
    selectedNode: addressToNodeMapping[choicePicked],
    choiceIndex: choicePicked,
  };
};

/**
 * Used to display additional information along with the file's name
 * @param {String} file File whose details have to be displayed
 * @param {Array} additionalInformationArray Array consisting of information to display related to the given file
 */
const displayFileAdditionalInformation = (file, additionalInformationArray) => {
  const statsTable = new cliTableBuilder({
    head: ["Index", file],
  });
  additionalInformationArray.forEach((information, index) => {
    statsTable.push([index + 1, information]);
  });
  console.log(statsTable.toString());
};

export const displayTextOnConsole = ({ text, fileLocation }) => {
  if (fileLocation) console.log(YELLOW_COLOR, "Unable to parse:", fileLocation);
  console.log(GREEN_COLOR, text);
};
