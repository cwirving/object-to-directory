import type {
  ValueStorageHandler,
  ValueStorageHandlerOptions,
  ValueStorageHandlerWithHandlers
} from '../interfaces.ts';

export interface MockValueStorageHandlerCall {
  pathInSource: string;
  destinationUrl: URL;
  value: unknown;
  options?: Readonly<ValueStorageHandlerOptions>;
}

export class MockValueStorageHandler implements ValueStorageHandler {
  name: string;

  defaultCanStoreValue = true;

  calls: {
    canStoreValue: MockValueStorageHandlerCall[];
    storeValue: MockValueStorageHandlerCall[];
  } = { canStoreValue: [], storeValue: [] };

  constructor(name: string) {
    this.name = name;
  }

  canStoreValue(pathInSource: string, destinationUrl: URL, value: unknown): boolean {
    this.calls.canStoreValue.push({pathInSource, destinationUrl, value});
    return this.defaultCanStoreValue;
  }

  storeValue(pathInSource: string, destinationUrl: URL, value: unknown, options?: Readonly<ValueStorageHandlerOptions>): Promise<void> {
    this.calls.storeValue.push({pathInSource, destinationUrl, value, options});
    return Promise.resolve();
  }
}

export class MockValueStorageHandlerWithHandlers extends MockValueStorageHandler implements ValueStorageHandlerWithHandlers {
  handlers: ValueStorageHandler[] = [];

  constructor(name: string) {
    super(name);
  }
}
