import type {
  ValueStorageHandler,
  ValueStorageHandlerOptions,
} from "./interfaces.ts";
import { default as picomatch } from "picomatch";

type conditionFn = (
  pathInSource: string,
  destinationUrl: URL,
  value: unknown,
) => boolean;

export class FluentValueStorageHandler implements ValueStorageHandler {
  readonly #innerHandler: ValueStorageHandler;
  readonly #condition: conditionFn;

  static newHandler(
    handler: ValueStorageHandler,
    condition?: conditionFn,
  ): Readonly<FluentValueStorageHandler> {
    return Object.freeze(new FluentValueStorageHandler(handler, condition));
  }

  static not(
    handler: ValueStorageHandler,
  ): Readonly<FluentValueStorageHandler> {
    return FluentValueStorageHandler.newHandler(
      handler,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        !handler.canStoreValue(pathInSource, destinationUrl, value),
    );
  }

  private constructor(handler: ValueStorageHandler, condition?: conditionFn) {
    this.#innerHandler = handler;
    this.#condition = condition ??
      ((pathInSource: string, destinationUrl: URL, value: unknown) =>
        handler.canStoreValue(pathInSource, destinationUrl, value));
  }

  get name(): string {
    return this.#innerHandler.name;
  }

  canStoreValue(
    pathInSource: string,
    destinationUrl: URL,
    value: unknown,
  ): boolean {
    return this.#condition(pathInSource, destinationUrl, value);
  }

  storeValue(
    pathInSource: string,
    destinationUrl: URL,
    value: unknown,
    options?: Readonly<ValueStorageHandlerOptions>,
  ): Promise<void> {
    return this.#innerHandler.storeValue(
      pathInSource,
      destinationUrl,
      value,
      options,
    );
  }

  whenPathMatches(pattern: string): Readonly<FluentValueStorageHandler> {
    const matcher = picomatch(pattern);

    return FluentValueStorageHandler.newHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        matcher(pathInSource) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }

  whenIsTypeOf(
    type:
      | "string"
      | "number"
      | "bigint"
      | "boolean"
      | "symbol"
      | "undefined"
      | "object"
      | "function",
  ): Readonly<FluentValueStorageHandler> {
    return FluentValueStorageHandler.newHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        (typeof value === type) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }

  whenIsInstanceOf(
    classConstructor: new () => unknown,
  ): Readonly<FluentValueStorageHandler> {
    return FluentValueStorageHandler.newHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        (value instanceof classConstructor) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }
}
