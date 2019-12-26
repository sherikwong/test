
export function hasUniqueEntry(array1, array2) {
  let unique = [];

  let smallerArray;
  let largerArray;
  if (array2.length < array1.length) {
    smallerArray = array2;
    largerArray = array1;
  } else {
    smallerArray = array1;
    largerArray = array2;
  }

  const sortedArray = (array) => array.sort((a, b) => a.toLowerCase() < 1 ? -1 : (a.toLowerCase() > b.toLowerCase() ? 1 : 0));

  smallerArray = sortedArray(smallerArray);
  largerArray = sortedArray(largerArray);

  largerArray.forEach(item => {
    const searchResult = binarySearch(smallerArray, item, 0, smallerArray.length);
    if (!searchResult) {
      unique.push(item);
    }
  })
  return unique;
}

export function binarySearch(array, target, start, end) {
  if (start >= end) return false;
  const middle = Math.floor((start + end) / 2);
  if (target === array[middle]) return true;
  if (target > array[middle]) return binarySearch(array, target, middle + 1, end);
  if (target < array[middle]) return binarySearch(array, target, start, middle);
}
