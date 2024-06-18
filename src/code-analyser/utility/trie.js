import { EMPTY_STRING } from "./constants/index.js";
import {
  getAllSubPartsOfGivenAbsolutePath,
  resolveAddressWithProvidedDirectory,
  getFileNameFromElement,
} from "./resolver.js";
import objectFactory from "./factory.js";

/**
 * Will build a trie based on the given
 * @param {Array} filesObjectsArray
 * @returns Trie containing information related to paths of all files given in the array
 */
export const buildTrie = (filesObjectsArray) => {
  const headNode = objectFactory.createNewTrieNode(EMPTY_STRING);

  filesObjectsArray.forEach((fileElement) => {
    const fileName = getFileNameFromElement(fileElement);
    const fileSubParts = getAllSubPartsOfGivenAbsolutePath(fileName);
    let nodeToTraverse = headNode;
    fileSubParts.forEach((subPart, index) => {
      if (index === 0) return;
      if (!nodeToTraverse.childrens[subPart]) {
        const pathTillNode = resolveAddressWithProvidedDirectory(
          nodeToTraverse.pathTillNode,
          subPart
        ).trim();

        nodeToTraverse.childrens[subPart] = objectFactory.createNewTrieNode(
          subPart,
          pathTillNode,
          index + 1 === fileSubParts.length
        );
      }
      nodeToTraverse = nodeToTraverse.childrens[subPart];
    });
  });
  return headNode;
};

/**
 * Will be used to ignore nodes which have just one children to allow faster parsing of the trie
 * @param {Object} givenNode Node to use
 * @returns Trie node containing zero or more than one childrens
 */
export const getFirstNodeNotContainingOneChild = (givenNode) => {
  let nodeToTraverse = givenNode;
  while (Object.keys(nodeToTraverse.childrens).length === 1) {
    nodeToTraverse =
      nodeToTraverse.childrens[Object.keys(nodeToTraverse.childrens)[0]];
  }
  return nodeToTraverse;
};
