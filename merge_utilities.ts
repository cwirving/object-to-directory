/**
 * A helper function to merge default and explicit options.
 *
 * Note: This is for internal use only. Not part of the public library API.
 *
 * @param defaultOptions The default options, if any.
 * @param options The explicit options, if any.
 * @returns The union of default and explicit options (with the explicit options overriding defaults) or `undefined` if both were themselves `undefined`.
 */
export function mergeOptions<T extends object>(
  defaultOptions: Readonly<T> | undefined,
  options: Readonly<T> | undefined,
): Readonly<T> | undefined {
  if (!defaultOptions) {
    return options;
  }

  if (!options) {
    return defaultOptions;
  }

  const mergedOptions: T = {} as T;
  Object.assign(mergedOptions, defaultOptions);
  Object.assign(mergedOptions, options);
  return mergedOptions;
}


export function isObject(candidate: unknown): candidate is Record<string, unknown> {
  return typeof (candidate === "object") && (candidate !== null) && !Array.isArray(candidate);
}
