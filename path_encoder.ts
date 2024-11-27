/**
 * Encode a path element so that it does not contain any forward slashes (and can be decoded).
 * This is a tiny subset of URI element encoding.
 *
 * @param element The path element string to encode.
 * @returns An encoded string guaranteed not to contain forward slashes.
 */
export function encodePathElement(element: string): string {
  return element.replaceAll("%", "%25").replaceAll("/", "%2F");
}

/**
 * Perform the reverse of {@linkcode encodePathElement}: decode a path element back to its original form.
 *
 * @param element The path element to decode.
 * @returns The decoded path element
 */
export function decodePathElement(element: string): string {
  return element.replaceAll("%2F", "/").replaceAll("%25", "%");
}
