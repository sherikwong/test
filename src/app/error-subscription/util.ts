
export function binarySearchArrays(array1: any[], array2: any[], inclusive?: boolean) {
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

  const unique = [];

  largerArray.forEach(item => {
    const searchResult = binarySearch(smallerArray, item, 0, smallerArray.length);
    if (inclusive ? searchResult >= 0 : searchResult === null) {
      unique.push(item);
    }
  })
  return unique;
}

export function binarySearch(array, target, start, end) {
  if (start >= end) return null;
  const middle = Math.floor((start + end) / 2);
  if (target === array[middle]) return middle;
  if (target > array[middle]) return binarySearch(array, target, middle + 1, end);
  if (target < array[middle]) return binarySearch(array, target, start, middle);
}