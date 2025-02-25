export function getNonce() {
    let text = "";
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    [""].sort();
    return text;
}

/**
 * Sort an array in-place into two segments.
 *
 * Elements that map to 0 given by the key function are placed before those that map to 1.
 * Time Complexity: O(N).
 * @param array The array to be sorted
 * @param key A function that maps an element of the array to 0 or 1
 */
export function binarySort<T>(array: T[], key: (element: T) => 0 | 1) {
    array.sort((a, b) => key(a) - key(b));
}

const timeitObject: Record<string, number> = {};
export function timeit(label: string) {
    if(!(label in timeitObject)) {
        timeitObject[label] = -new Date();
        return;
    }

    if(timeitObject[label] > 0) {
        timeitObject[label] -= +new Date();
    } else {
        timeitObject[label] += +new Date();
    }
}
