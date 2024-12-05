import type {
  HandlerBuilder,
  ValueStorageHandler,
  ValueStorageHandlerOptions,
} from "./interfaces.ts";

import { DefaultHandlerBuilder } from "./factories.ts";

/**
 * Convenience wrapper around the handler builder in {@linkcode Handlers} and the
 * {@linkcode ValueStorageHandler.storeValue} directory storage handler method to write the contents
 * of an object to a directory in one step.
 *
 * @param destinationUrl The destination in the file system of the directory to create, as a URL.
 * @param value The object to store.
 * @param handlers The value storage handlers to consult when storing the properties in the object.
 * @param options Options to control the specifics of the storage.
 */
export function storeObjectToDirectory(
  destinationUrl: URL,
  value: Record<string, unknown>,
  handlers: Iterable<ValueStorageHandler>,
  options?: Readonly<ValueStorageHandlerOptions>,
): Promise<void> {
  const handler = Handlers.objectToDirectory({ handlers: handlers });

  return handler.storeValue("", destinationUrl, value, options);
}

/**
 * The default handler builder for the library -- imlements the {@linkcode HandlerBuilder} interface for a
 * convenient way to create storage handlers.
 */
export const Handlers: HandlerBuilder = new DefaultHandlerBuilder();
