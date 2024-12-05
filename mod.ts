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
import { HandlerBuilderImpl } from "./handler_builder.ts";

export type * from "./interfaces.ts";

/**
 * Convenience wrapper around the handler builder in {@linkcode handlers} and the
 * {@linkcode ValueStorageHandler.storeValue} directory storage handler method to write the contents
 * of an object to a directory in one step.
 *
 * @param destinationUrl The destination in the file system of the directory to create, as a URL.
 * @param value The object to store.
 * @param valueHandlers The value storage handlers to consult when storing the properties in the object.
 * @param options Options to control the specifics of the storage.
 */
export function storeObjectToDirectory(
  destinationUrl: URL,
  value: Record<string, unknown>,
  valueHandlers: Iterable<ValueStorageHandler>,
  options?: Readonly<ValueStorageHandlerOptions>,
): Promise<void> {
  const handler = handlers.objectToDirectory({handlers: valueHandlers});

  return handler.storeValue("", destinationUrl, value, options);
}

/**
 * The default handler builder for the library -- imlements the {@linkcode HandlerBuilder} interface for a
 * convenient way to create storage handlers.
 */
export const handlers: HandlerBuilder = new HandlerBuilderImpl();
