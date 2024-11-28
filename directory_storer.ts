import { DirectoryReference } from "./directory_reference.ts";
import type {
  DirectoryCreator,
  ValueStorageHandler,
  ValueStorageHandlerOptions,
  ValueStorageHandlerWithHandlers,
} from "./interfaces.ts";
import { isObject, mergeOptions } from "./merge_utilities.ts";

export class DirectoryValueStorageHandler
  implements ValueStorageHandlerWithHandlers {
  readonly #name: string;
  readonly #handlers: ValueStorageHandler[];
  readonly #directoryCreator: DirectoryCreator;
  readonly #defaultOptions: Readonly<ValueStorageHandlerOptions> | undefined;

  constructor(
    name: string,
    handlers: ValueStorageHandler[],
    directoryCreator: DirectoryCreator,
    defaultOptions?: Readonly<ValueStorageHandlerOptions>,
  ) {
    this.#name = name;
    this.#handlers = handlers;
    this.#directoryCreator = directoryCreator;
    this.#defaultOptions = defaultOptions;
  }

  get name(): string {
    return this.#name;
  }

  get handlers(): ValueStorageHandler[] {
    return this.#handlers;
  }

  canStoreValue(
    _pathInSource: string,
    _destinationUrl: URL,
    value: unknown,
  ): boolean {
    return isObject(value);
  }

  async storeValue(
    pathInSource: string,
    destinationUrl: URL,
    value: unknown,
    options?: Readonly<ValueStorageHandlerOptions>,
  ): Promise<void> {
    if (!isObject(value)) {
      throw new TypeError(
        `Attempting to store non-object value at path "${pathInSource}" as a directory.`,
      );
    }

    const directoryReference = new DirectoryReference(destinationUrl);
    const mergedOptions = mergeOptions(this.#defaultOptions, options);

    // First things first, let's make sure the destination directory is created...
    await this.#directoryCreator.createDirectory(
      directoryReference.canonicalUrl,
    );

    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      const nestedPathInSource = `${pathInSource}/${
        nestedKey.replace("/", "%2F")
      }`;
      const nestedDestinationUrl = directoryReference.getContentsUrl(nestedKey); // TODO: use a mapping function.
      let stored = false;

      for (const candidateHandler of this.#handlers) {
        if (
          candidateHandler.canStoreValue(
            nestedPathInSource,
            nestedDestinationUrl,
            nestedValue,
          )
        ) {
          await candidateHandler.storeValue(
            nestedPathInSource,
            nestedDestinationUrl,
            nestedValue,
            mergedOptions,
          );
          stored = true;
          break;
        }
      }

      if (!stored) {
        if (
          this.canStoreValue(
            nestedPathInSource,
            nestedDestinationUrl,
            nestedValue,
          )
        ) {
          await this.storeValue(
            nestedPathInSource,
            nestedDestinationUrl,
            nestedValue,
            mergedOptions,
          );
        } else {
          if (mergedOptions?.strict) {
            throw new Error(
              `Could not store value at path "${nestedPathInSource}" -- no storage handler matches it`,
            );
          }
        }
      }
    }
  }
}
