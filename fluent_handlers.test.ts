import { assert, assertEquals, assertFalse } from "@std/assert";
import { test } from "@cross/test";
import { MockValueStorageHandler } from "./mocks/value_storage_handler.mock.ts";
import { FluentValueStorageHandler } from "./fluent_handlers.ts";

const someUrl = Object.freeze(new URL("http://localhost/somewhere"));

test("Can create fluent handlers", () => {
  const mockHandler = new MockValueStorageHandler("foo");

  const fluentHandler = FluentValueStorageHandler.newHandler(
    mockHandler,
    "FOO",
  );

  // Poke something in each to make sure they don't crash and burn.
  assertEquals(fluentHandler.name, "FOO");
});

test("Fluent handler can override names", () => {
  const mockHandler = new MockValueStorageHandler("foo");

  const fluentHandler = FluentValueStorageHandler.newHandler(mockHandler);

  assertEquals(fluentHandler.name, "foo");

  const renamedFluentHandler = fluentHandler.withName("FOO");

  // Did the new name stick?
  assertEquals(renamedFluentHandler.name, "FOO");
  // Make sure it did not mutate the inner handler.
  assertEquals(fluentHandler.name, "foo");
});

test("Fluent handler passes storeValue() calls to inner handler", async () => {
  const mockHandler = new MockValueStorageHandler("foo");

  const fluentHandler = FluentValueStorageHandler.newHandler(mockHandler);
  const tmpUrl = new URL("file:///tmp");
  await fluentHandler.storeValue("/x", tmpUrl, { a: "b" }, { strict: true });

  assertEquals(mockHandler.calls.storeValue.length, 1);
  assertEquals(mockHandler.calls.storeValue[0].pathInSource, "/x");
  assertEquals(mockHandler.calls.storeValue[0].destinationUrl, tmpUrl);
  assertEquals(mockHandler.calls.storeValue[0].options, { strict: true });
});

test("Can add a path matching pattern", () => {
  const mockHandler = new MockValueStorageHandler("foo");

  mockHandler.defaultCanStoreValue = true;

  const fluentHandler = FluentValueStorageHandler.newHandler(mockHandler);

  assert(fluentHandler.canStoreValue("x/y/z", someUrl, 42));

  const fhWithPath = fluentHandler.whenPathMatches("a/*/c");

  // Not the hardcoded value
  assertFalse(fhWithPath.canStoreValue("x/y/z", someUrl, 42));

  // But the path match pattern we just set AND the hardcoded value.
  assert(fhWithPath.canStoreValue("a/b/c", someUrl, 42));

  // Make sure it did not mutate the inner handler.
  assert(fluentHandler.canStoreValue("x/y/z", someUrl, 42));

  // Try again with an inner handler that says false
  mockHandler.defaultCanStoreValue = false;
  assertFalse(fhWithPath.canStoreValue("a/b/c", someUrl, 42));
  assertFalse(fluentHandler.canStoreValue("x/y/z", someUrl, 42));
});

test("Can add multiple matching patterns (in a logical AND)", () => {
  const mockHandler = new MockValueStorageHandler("foo");

  mockHandler.defaultCanStoreValue = true;

  const fluentHandler = FluentValueStorageHandler.newHandler(mockHandler);

  assert(fluentHandler.canStoreValue("donut", someUrl, 42));

  const fhWithPaths = fluentHandler.whenPathMatchesEvery([
    "a/*/*",
    "*/b/*",
    "*/*/c",
  ]);

  // Not the hardcoded value
  assertFalse(fhWithPaths.canStoreValue("donut", someUrl, 42));

  // But any of the path match patterns we just set AND the hardcoded value.
  assert(fhWithPaths.canStoreValue("a/b/c", someUrl, 42));
  assertFalse(fhWithPaths.canStoreValue("a/y/z", someUrl, 42));
  assertFalse(fhWithPaths.canStoreValue("x/b/z", someUrl, 42));
  assertFalse(fhWithPaths.canStoreValue("x/y/c", someUrl, 42));

  mockHandler.defaultCanStoreValue = false;
  assertFalse(fhWithPaths.canStoreValue("a/b/c", someUrl, 42));
});

test("Can add multiple matching patterns (in a logical OR)", () => {
  const mockHandler = new MockValueStorageHandler("foo");

  mockHandler.defaultCanStoreValue = true;

  const fluentHandler = FluentValueStorageHandler.newHandler(mockHandler);

  assert(fluentHandler.canStoreValue("donut", someUrl, 42));

  const fhWithPaths = fluentHandler.whenPathMatchesSome(["a/*/c", "*/y/*"]);

  // Not the hardcoded value
  assertFalse(fhWithPaths.canStoreValue("donut", someUrl, 42));

  // But any of the path match patterns we just set AND the hardcoded value.
  assert(fhWithPaths.canStoreValue("a/b/c", someUrl, 42));
  assert(fhWithPaths.canStoreValue("x/y/z", someUrl, 42));

  mockHandler.defaultCanStoreValue = false;
  assertFalse(fhWithPaths.canStoreValue("a/b/c", someUrl, 42));
  assertFalse(fhWithPaths.canStoreValue("x/y/z", someUrl, 42));
});

test("Can add a coarse type test", () => {
  const mockHandler = new MockValueStorageHandler("foo");

  mockHandler.defaultCanStoreValue = true;

  const fluentHandler = FluentValueStorageHandler.newHandler(mockHandler);

  assert(fluentHandler.canStoreValue("donut", someUrl, 42));

  const fhWithTypeOf = fluentHandler.whenIsTypeOf("string");

  // Not the hardcoded value
  assertFalse(fhWithTypeOf.canStoreValue("donut", someUrl, 42));

  // But when the value type is correct (and the inner handler can store), we're good.
  assert(fhWithTypeOf.canStoreValue("x/y/z", someUrl, "this is a string"));

  mockHandler.defaultCanStoreValue = false;
  assertFalse(fhWithTypeOf.canStoreValue("x/y/z", someUrl, "this is a string"));
});

test("Can add a class instance test", () => {
  const mockHandler = new MockValueStorageHandler("foo");

  mockHandler.defaultCanStoreValue = true;

  const fluentHandler = FluentValueStorageHandler.newHandler(mockHandler);

  assert(fluentHandler.canStoreValue("donut", someUrl, 42));

  const fhWithInstanceCheck = fluentHandler.whenIsInstanceOf(URL);

  // Not the hardcoded value
  assertFalse(fhWithInstanceCheck.canStoreValue("donut", someUrl, 42));

  // But when the value type is correct (and the inner handler can store), we're good.
  assert(
    fhWithInstanceCheck.canStoreValue("x/y/z", someUrl, new URL("file:///tmp")),
  );

  mockHandler.defaultCanStoreValue = false;
  assertFalse(
    fhWithInstanceCheck.canStoreValue("x/y/z", someUrl, new URL("file:///tmp")),
  );
});
