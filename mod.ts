/**
 * The main entrypoints for the library.
 *
 * {@linkcode storeObjectToDirectory} stores a JavaScript object to the file system as a directory. It relies on
 * value storage handlers to guide how the various properties in the input object and their descendents are written
 * to the file system.
 *
 * The {@linkcode handlers} builder object is a convenient way to build handlers for {@linkcode storeObjectToDirectory}
 * See the {@linkcode HandlerBuilder} interface for a description of the various handlers that can be created through
 * the builder.
 *
 * @module
 */

import type {
  HandlerBuilder,
  ValueStorageHandler,
  ValueStorageHandlerOptions,
} from "./interfaces.ts";
import { newDirectoryObjectStorageHandler } from "./factories.ts";
import { HandlerBuilderImpl } from "./handler_builder.ts";

export type * from "./interfaces.ts";

/**
 * Convenience wrapper around `newDirectoryObjectStorageHandler` and `storeValue`.
 *
 * @param destinationUrl
 * @param value
 * @param handlers
 * @param options
 */
export function storeObjectToDirectory(
  destinationUrl: URL,
  value: Record<string, unknown>,
  handlers: Iterable<ValueStorageHandler>,
  options?: Readonly<ValueStorageHandlerOptions>,
): Promise<void> {
  const handler = newDirectoryObjectStorageHandler(handlers);

  return handler.storeValue("", destinationUrl, value, options);
}

/**
 * The default handler builder for the library -- imlements the {@linkcode HandlerBuilder} interface for a
 * convenient way to create storage handlers.
 */
export const handlers: HandlerBuilder = new HandlerBuilderImpl();
