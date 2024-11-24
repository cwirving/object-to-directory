import { DirectoryReference } from "./directory_reference.ts";
import type {
  DirectoryObjectStorerOptions,
  FileValueStorer,
} from "./interfaces.ts";
import { default as picomatch } from "picomatch";
import { isObject } from "./merge_utilities.ts";

const dummyUrl = new URL("http://placeholder");

/**
 * A handler that decides whether to store the contents of the state passed in or not.
 *
 * If it does store it, returns a promise. If it does not store it, returns `undefined`.
 */
export type DirectoryEntryHandler = (
  state: StoreObjectToDirectoryExState,
) => Promise<void> | undefined;

/**
 * The state representing a value to potentially store.
 */
export interface StoreObjectToDirectoryExState {
  /**
   * The location in the file system where the object would be written.
   */
  destinationUrl: URL;

  /**
   * The path in the source object where the contents can be found.
   * The path elements are separated by slashes ("/") and any slashes in property values are replaced with "%2F".
   */
  currentPathInSource: string;

  /**
   * The contents to store.
   */
  contents: unknown;

  /**
   * The currently applicable handlers.
   */
  handlers: DirectoryEntryHandler[];

  /**
   * Options to pass to storers.
   */
  options?: DirectoryObjectStorerOptions;
}

/**
 * Compile storer matching expressions into an array of handlers to apply sequentially until one of them succeeds.
 *
 * @param storers
 */
export function compileStorers(
  storers: Iterable<Readonly<[string, FileValueStorer]>>,
): DirectoryEntryHandler[] {
  const handlers: DirectoryEntryHandler[] = [];

  // Compile all the matching expressions we were given.
  for (const [key, value] of storers) {
    const isMatch = picomatch(key);
    handlers.push((state: StoreObjectToDirectoryExState) =>
      (isMatch(state.currentPathInSource))
        ? value.storeValueToFile(
          state.destinationUrl,
          state.contents,
          state.options,
        )
        : undefined
    );
  }

  // Add a final default handler for directories
  handlers.push((state: StoreObjectToDirectoryExState) =>
    isObject(state.contents) ? storeObjectToDirectoryEx(state) : undefined
  );

  return handlers;
}

export async function storeObjectToDirectoryEx(
  state: StoreObjectToDirectoryExState,
): Promise<void> {
  state.options?.signal?.throwIfAborted();

  const directoryReference = new DirectoryReference(state.destinationUrl);

  if(!isObject(state.contents)) {
    throw new TypeError("storeObjectToDirectoryEx called with non-object contents");
  }

  const nestedState: StoreObjectToDirectoryExState = {
    handlers: state.handlers,
    options: state.options,

    // placeholders
    destinationUrl: dummyUrl,
    currentPathInSource: "",
    contents: undefined
  };

  for (const [key, value] of Object.entries(state.contents)) {
    nestedState.destinationUrl = directoryReference.getContentsUrl(key); // TODO: use a mapping function.
    nestedState.currentPathInSource = `${state.currentPathInSource}/${key.replace("/", "%2F")}`;
    nestedState.contents = value;

    let handledPromise: Promise<void> | undefined = undefined;
    for (const handler of state.handlers) {
      handledPromise = handler(state);
      if (handledPromise) break;
    }

    await handledPromise;

    if (!handledPromise && state.options?.strict) {
      throw new Error(
        `Could not store item at path "${state.currentPathInSource}" -- no storer matches it`,
      );
    }
  }
}
