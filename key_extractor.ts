import { isObject } from "./merge_utilities.ts";

/**
 * The signature of key extractor functions used by the array storage handler to determine
 * directory entry names for array items.
 */
export type keyExtractorFunc = (
  value: unknown,
  index: number,
) => string | undefined;

/**
 * The default key extractor for arrays: use the index converted to a string.
 *
 * @param _value - The value from the collection (not used in the extraction).
 * @param index - The index of the item in the array.
 * @return A string representation of the index, which serves as the key.
 */
export function indexKeyExtractor(_value: unknown, index: number): string {
  return String(index);
}

/**
 * A function used to build a key extractor for named properties on objects. Returns the named property (converted to
 * a string) on the value if the value is an object, `undefined` otherwise.
 *
 * @param keyProperty The name of the property to extract.
 * @param value The value where the property should be retrieved.
 * @returns The named property on the value object (converted to a string) or `undefined` if the value is not an object or the property does not exist.
 */
export function parameterizedKeyExtractor(
  keyProperty: string,
  value: unknown,
): string | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const maybeKey = value[keyProperty];
  return (maybeKey !== undefined) ? String(maybeKey) : undefined;
}
