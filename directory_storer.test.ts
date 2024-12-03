import {
  assert,
  assertEquals,
  assertExists,
  assertFalse,
  assertRejects,
} from "@std/assert";
import { test } from "@cross/test";
import { DirectoryValueStorageHandler } from "./directory_storer.ts";
import { MockDirectoryCreator } from "./mocks/directory_creator.mock.ts";
import { MockValueStorageHandler } from "./mocks/value_storage_handler.mock.ts";

test("Can create DirectoryValueStorageHandler", () => {
  const handler = new DirectoryValueStorageHandler(
    "test1",
    [],
    new MockDirectoryCreator("x"),
  );
  assertEquals(handler.name, "test1");

  const handlerWithDefaultOptions = new DirectoryValueStorageHandler(
    "test2",
    [],
    new MockDirectoryCreator("x"),
    { strict: true },
  );
  assertEquals(handlerWithDefaultOptions.name, "test2");
});

test("DirectoryValueStorageHandler can only store objects", () => {
  const handler = new DirectoryValueStorageHandler(
    "test",
    [],
    new MockDirectoryCreator("x"),
  );

  const tmpUrl = new URL("file:///tmp");
  assert(handler.canStoreValue("", tmpUrl, {}));
  assert(handler.canStoreValue("", tmpUrl, new URL("http:///google.com/")));
  assertFalse(handler.canStoreValue("", tmpUrl, 42));
  assertFalse(handler.canStoreValue("", tmpUrl, [{}, {}]));
});

test("DirectoryValueStorageHandler throws on wrong type", async () => {
  const handler = new DirectoryValueStorageHandler(
    "test",
    [],
    new MockDirectoryCreator("x"),
  );

  const tmpUrl = new URL("file:///tmp");
  await assertRejects(() => {
    return handler.storeValue("", tmpUrl, 42);
  }, TypeError);
});

test("DirectoryValueStorageHandler creates the destination directory", async () => {
  const mockCreator = new MockDirectoryCreator("x");
  const handler = new DirectoryValueStorageHandler("test1", [], mockCreator);
  const destinationUrl = new URL("file:///tmp/xyz");

  await handler.storeValue("", destinationUrl, {});
  assertEquals(mockCreator.calls.length, 1);
  assertEquals(mockCreator.calls[0].directoryUrl, destinationUrl);
  assertExists(mockCreator.calls[0].options);
  assertEquals(mockCreator.calls[0].options.recursive, true);
});

test("DirectoryValueStorageHandler creates nested directories", async () => {
  const mockCreator = new MockDirectoryCreator("x");
  const handler = new DirectoryValueStorageHandler("test1", [], mockCreator);
  const destinationUrl = new URL("file:///tmp/xyz");

  await handler.storeValue("", destinationUrl, { a: {} });
  assertEquals(mockCreator.calls.length, 2);
  assertEquals(mockCreator.calls[0].directoryUrl, destinationUrl);
  assertExists(mockCreator.calls[0].options);
  assertEquals(mockCreator.calls[0].options.recursive, true);
  assertEquals(mockCreator.calls[1].directoryUrl.pathname, "/tmp/xyz/a");
  assertExists(mockCreator.calls[1].options);
  assertEquals(mockCreator.calls[1].options.recursive, true);
});

test("DirectoryValueStorageHandler merges options", async () => {
  const abortController = new AbortController();
  const abortSignal = abortController.signal;
  const mockCreator = new MockDirectoryCreator("x");
  const mockHandler = new MockValueStorageHandler("y");
  const handler = new DirectoryValueStorageHandler(
    "test1",
    [mockHandler],
    mockCreator,
    { mode: 0o666, signal: abortSignal },
  );
  const destinationUrl = new URL("file:///tmp/xyz");

  // First case: if there are no runtime options:
  await handler.storeValue("", destinationUrl, { a: "b" });
  assertEquals(mockHandler.calls.canStoreValue.length, 1);
  assertEquals(mockHandler.calls.canStoreValue[0].pathInSource, "/a");
  assertEquals(mockHandler.calls.canStoreValue[0].value, "b");
  assertEquals(
    mockHandler.calls.canStoreValue[0].destinationUrl,
    new URL("file:///tmp/xyz/a"),
  );
  assertEquals(mockHandler.calls.storeValue.length, 1);
  assertEquals(mockHandler.calls.storeValue[0].pathInSource, "/a");
  assertEquals(mockHandler.calls.storeValue[0].value, "b");
  assertEquals(
    mockHandler.calls.storeValue[0].destinationUrl,
    new URL("file:///tmp/xyz/a"),
  );
  assertEquals(mockHandler.calls.storeValue[0].options, {
    mode: 0o666,
    signal: abortSignal,
  });

  // Second case: there are runtime options: let's make sure that they override the default options
  function encoderFn(n: string): string {
    return n.toLowerCase();
  }

  mockHandler.calls.canStoreValue.length = 0;
  mockHandler.calls.storeValue.length = 0;

  await handler.storeValue("", destinationUrl, { a: "b" }, {
    mode: 0o777,
    propertyNameEncoder: encoderFn,
  });
  assertEquals(mockHandler.calls.storeValue.length, 1);
  assertEquals(mockHandler.calls.storeValue[0].options?.mode, 0o777); // Overridden
  assertEquals(mockHandler.calls.storeValue[0].options?.signal, abortSignal); // Default option
  assertEquals(
    mockHandler.calls.storeValue[0].options?.propertyNameEncoder,
    encoderFn,
  ); // Runtime option
});

test("DirectoryValueStorageHandler calls handlers in order", async () => {
  const mockCreator = new MockDirectoryCreator("x");
  const mockHandler1 = new MockValueStorageHandler("h1");
  const mockHandler2 = new MockValueStorageHandler("h2");
  const handler = new DirectoryValueStorageHandler(
    "test1",
    [mockHandler1, mockHandler2],
    mockCreator,
  );
  const destinationUrl = new URL("file:///tmp/xyz");

  // If the first handler returns true, the second one should never be called.
  mockHandler1.defaultCanStoreValue = true;
  await handler.storeValue("", destinationUrl, { a: "b" });
  assertEquals(mockHandler1.calls.canStoreValue.length, 1);
  assertEquals(mockHandler2.calls.canStoreValue.length, 0);

  // If the first handler returns false, the second one should be called.
  mockHandler1.calls.canStoreValue.length = 0;
  mockHandler1.calls.storeValue.length = 0;
  mockHandler1.defaultCanStoreValue = false;
  await handler.storeValue("", destinationUrl, { a: "b" });
  assertEquals(mockHandler1.calls.canStoreValue.length, 1);
  assertEquals(mockHandler1.calls.storeValue.length, 0);
  assertEquals(mockHandler2.calls.canStoreValue.length, 1);
  assertEquals(mockHandler2.calls.storeValue.length, 1);
});

test("DirectoryValueStorageHandler throws when strict", async () => {
  const mockCreator = new MockDirectoryCreator("x");
  const mockHandler = new MockValueStorageHandler("y");
  mockHandler.defaultCanStoreValue = false;
  const handler = new DirectoryValueStorageHandler(
    "test1",
    [mockHandler],
    mockCreator,
  );
  const destinationUrl = new URL("file:///tmp/xy");

  // Not `strict` -- no exception.
  await handler.storeValue("", destinationUrl, { a: "b" });
  assertEquals(mockHandler.calls.canStoreValue.length, 1);
  assertEquals(mockHandler.calls.storeValue.length, 0);

  // `strict` -- rejects with an exception.
  mockHandler.calls.canStoreValue.length = 0;
  await assertRejects(() => {
    return handler.storeValue("", destinationUrl, { a: "b" }, { strict: true });
  });
  assertEquals(mockHandler.calls.canStoreValue.length, 1);
  assertEquals(mockHandler.calls.storeValue.length, 0);
});
