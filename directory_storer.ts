import { DirectoryReference } from "./directory_reference.ts";
import type {
  DirectoryCreator,
  ValueStorageHandler,
  ValueStorageHandlerOptions,
} from "./interfaces.ts";
import { isObject, mergeOptions } from "./merge_utilities.ts";
import { encodePathElement } from "./path_encoder.ts";

export class DirectoryValueStorageHandler implements ValueStorageHandler {
  readonly #name: string;
  readonly #handlers: Readonly<ValueStorageHandler[]>;
  readonly #directoryCreator: DirectoryCreator;
  readonly #defaultOptions: Readonly<ValueStorageHandlerOptions> | undefined;

  constructor(
    name: string,
    handlers: Readonly<ValueStorageHandler[]>,
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
    options?.signal?.throwIfAborted();

    if (!isObject(value)) {
      throw new TypeError(
        `Attempting to store non-object value at path "${pathInSource}" as a directory.`,
      );
    }

    const directoryReference = new DirectoryReference(destinationUrl);
    const mergedOptions = mergeOptions(this.#defaultOptions, options);
    const propertyNameEncoder = mergedOptions?.propertyNameEncoder ??
      encodePathElement;

    // First things first, let's make sure the destination directory is created...
    await this.#directoryCreator.createDirectory(
      directoryReference.canonicalUrl,
      { recursive: true },
    );

    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      const nestedPathInSource = `${pathInSource}/${
        encodePathElement(nestedKey)
      }`;
      const nestedDestinationUrl = directoryReference.getContentsUrl(
        encodeURIComponent(propertyNameEncoder(nestedKey)),
      );
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
