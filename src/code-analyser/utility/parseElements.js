import { NUMBER, BOOLEAN, TRUE, SIZES_ARRAY } from "./constants/index.js";

// Parses the given string and return the appropriate type element (number, regex, string)
export const getRequiredTypeElementFromString = (
  arrayElement,
  cannotBeRegex = false
) => {
  if (typeof arrayElement === NUMBER || typeof arrayElement === BOOLEAN)
    return arrayElement;
  arrayElement = arrayElement.trim();
  // if path is provided
  if (/['"].*['"]/.test(arrayElement) || cannotBeRegex)
    return arrayElement.replace(/['"](.*)['"]/, "$1");
  // if true/false given
  else if (/true|false/.test(arrayElement)) return arrayElement === TRUE;
  else {
  }
  // if regex given
  arrayElement = arrayElement.replace(/\/(.*)\//, "$1");
  return new RegExp(arrayElement);
};

// Returns an array consisting of elements which have been parsed from a string
export const getArrayOfElementsFromString = (arrayString) => {
  return arrayString
    .slice(1, -1)
    .split(",")
    .map((entryElement) => {
      return getRequiredTypeElementFromString(entryElement);
    });
};

export const getSizeFromInteger = (givenInteger) => {
  const possibleSizes = SIZES_ARRAY;
  const MULTIPLIER_TO_GET_NEXT_SIZE = 1024;
  let sizeToCheck = 1;
  let valueToReturn = null;

  possibleSizes.some((size) => {
    sizeToCheck *= MULTIPLIER_TO_GET_NEXT_SIZE;
    if (givenInteger / sizeToCheck < 1) {
      sizeToCheck /= MULTIPLIER_TO_GET_NEXT_SIZE;
      valueToReturn = `${(givenInteger / sizeToCheck).toFixed(2)} ${size}`;
      return true;
    }
    return false;
  });
  if (valueToReturn) return valueToReturn;
  sizeToCheck /= MULTIPLIER_TO_GET_NEXT_SIZE;
  return `${(givenInteger / sizeToCheck).toFixed(2)} ${
    possibleSizes[possibleSizes.length - 1]
  }`;
};
