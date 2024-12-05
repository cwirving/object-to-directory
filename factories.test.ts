import {
  assert,
  assertEquals,
  assertExists,
  assertFalse,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import * as fs from "@cross/fs";
import { test } from "@cross/test";
import {
  newBinaryFileValueStorageHandler,
  newDirectoryCreator,
  newFileWriter,
  newTextFileValueStorageHandler,
} from "./factories.ts";
import { MockFileWriter } from "./mocks/file_writer.mock.ts";
import type { ValueStorageHandlerOptions } from "./interfaces.ts";

const tmpUrl = new URL("file:///tmp/xyz");

async function cleanDestinationDirectory(create: boolean): Promise<URL> {
  const destinationDirUrl = new URL(import.meta.resolve("./tmp"));
  if (await fs.exists(destinationDirUrl.pathname)) {
    await fs.rm(destinationDirUrl, { recursive: true });
  }

  if (create) {
    await fs.mkdir(destinationDirUrl);
  }

  return destinationDirUrl;
}

test("newFileWriter creates a working file writer", async () => {
  const writer = newFileWriter();
  assertExists(writer.name);

  const destinationDirUrl = await cleanDestinationDirectory(true);
  const utf8Encoder = new TextEncoder();
  const utf8Decoder = new TextDecoder("utf-8");

  const textFileUrl = new URL("tmp/textFile.txt", destinationDirUrl);
  await writer.writeTextToFile(textFileUrl, "this is a test!");
  const textActual = utf8Decoder.decode(await fs.readFile(textFileUrl));
  assertEquals(textActual, "this is a test!");

  const binaryFileUrl = new URL("tmp/binaryFile.bin", destinationDirUrl);
  const binaryExpected = utf8Encoder.encode("this is a binary test!");
  await writer.writeBinaryToFile(binaryFileUrl, binaryExpected);
  const binaryActual = await fs.readFile(binaryFileUrl);
  assertEquals(binaryExpected.byteLength, binaryActual.byteLength);
  assertEquals(binaryExpected.buffer, binaryActual.buffer);

  await fs.rm(destinationDirUrl, { recursive: true });
});

test("newDirectoryCreator creates a working directory creator", async () => {
  const creator = newDirectoryCreator();
  assertExists(creator.name);

  const destinationDirUrl = await cleanDestinationDirectory(false);

  await creator.createDirectory(destinationDirUrl);
  assert(fs.isDir(destinationDirUrl.pathname));

  const nestedDirUrl = new URL("tmp/a/b/c", destinationDirUrl);
  // We can't create the nested directory without the "recursive option"
  await assertRejects(() => creator.createDirectory(nestedDirUrl));
  // But it should work when it is set to true.
  await creator.createDirectory(nestedDirUrl, { recursive: true });
  assert(fs.isDir(nestedDirUrl.pathname));

  await fs.rm(destinationDirUrl, { recursive: true });
});

test("newTextFileValueStorageHandler writes text files for strings (only)", async () => {
  const mockWriter = new MockFileWriter("x");
  const options: ValueStorageHandlerOptions = {};

  const txtHandler = newTextFileValueStorageHandler(mockWriter);
  assert(txtHandler.canStoreValue("/foo", tmpUrl, "foo"));
  assertFalse(txtHandler.canStoreValue("/foo", tmpUrl, 42));

  const destinationUrl = new URL("foo.bar", tmpUrl);
  await txtHandler.storeValue(
    "/foo",
    destinationUrl,
    "this is a test",
    options,
  );

  const expectedPath = new URL(destinationUrl);
  expectedPath.pathname = destinationUrl.pathname + ".txt";
  assertEquals(mockWriter.calls.writeTextToFile.length, 1);
  assertEquals(mockWriter.calls.writeBinaryToFile.length, 0);
  assertEquals(mockWriter.calls.writeTextToFile[0].path, expectedPath);
  assertEquals(mockWriter.calls.writeTextToFile[0].contents, "this is a test");
  assertStrictEquals(mockWriter.calls.writeTextToFile[0].options, options);

  const fooHandler = newTextFileValueStorageHandler(mockWriter, ".foo");
  assert(fooHandler.canStoreValue("/foo", tmpUrl, "bar"));
  assertFalse(fooHandler.canStoreValue("/foo", tmpUrl, 42));

  mockWriter.calls.writeTextToFile.length = 0;
  await fooHandler.storeValue("/foo", destinationUrl, "this is a test");

  expectedPath.pathname = destinationUrl.pathname + ".foo";
  assertEquals(mockWriter.calls.writeTextToFile.length, 1);
  assertEquals(mockWriter.calls.writeBinaryToFile.length, 0);
  assertEquals(mockWriter.calls.writeTextToFile[0].path, expectedPath);
  assertEquals(mockWriter.calls.writeTextToFile[0].contents, "this is a test");
  assertStrictEquals(mockWriter.calls.writeTextToFile[0].options, undefined);
});

test("newBinaryFileValueStorageHandler writes binary files for binary data", async () => {
  const mockWriter = new MockFileWriter("x");
  const options: ValueStorageHandlerOptions = {};

  const binHandler = newBinaryFileValueStorageHandler(mockWriter);
  assert(binHandler.canStoreValue("/foo", tmpUrl, new Uint8Array(1)));
  assertFalse(binHandler.canStoreValue("/foo", tmpUrl, "foo"));
  assertFalse(binHandler.canStoreValue("/foo", tmpUrl, 42));

  const destinationUrl = new URL("foo.bar", tmpUrl);
  await assertRejects(() =>
    binHandler.storeValue("/foo", destinationUrl, "not binary")
  );

  const binaryArray = new Uint8Array([1, 2, 3, 4, 5]);
  await binHandler.storeValue("/foo", destinationUrl, binaryArray, options);

  const expectedPath = new URL(destinationUrl);
  expectedPath.pathname = destinationUrl.pathname + ".bin";
  assertEquals(mockWriter.calls.writeTextToFile.length, 0);
  assertEquals(mockWriter.calls.writeBinaryToFile.length, 1);
  assertEquals(mockWriter.calls.writeBinaryToFile[0].path, expectedPath);
  assertEquals(mockWriter.calls.writeBinaryToFile[0].contents, binaryArray);
  assertStrictEquals(mockWriter.calls.writeBinaryToFile[0].options, options);

  const binaryArrayBuffer = new ArrayBuffer(12);
  const view32 = new Uint32Array(binaryArrayBuffer);
  view32[0] = 1234;
  const fooHandler = newBinaryFileValueStorageHandler(mockWriter, ".foo");
  assert(fooHandler.canStoreValue("/foo", tmpUrl, binaryArrayBuffer));
  assertFalse(fooHandler.canStoreValue("/foo", tmpUrl, "bar"));
  assertFalse(fooHandler.canStoreValue("/foo", tmpUrl, 42));

  mockWriter.calls.writeBinaryToFile.length = 0;
  await fooHandler.storeValue("/foo", destinationUrl, binaryArrayBuffer);

  expectedPath.pathname = destinationUrl.pathname + ".foo";
  assertEquals(mockWriter.calls.writeTextToFile.length, 0);
  assertEquals(mockWriter.calls.writeBinaryToFile.length, 1);
  assertEquals(mockWriter.calls.writeBinaryToFile[0].path, expectedPath);
  assertEquals(
    mockWriter.calls.writeBinaryToFile[0].contents,
    new Uint8Array(binaryArrayBuffer),
  );
  assertStrictEquals(mockWriter.calls.writeBinaryToFile[0].options, undefined);

  mockWriter.calls.writeBinaryToFile.length = 0;
  await fooHandler.storeValue(
    "/foo",
    destinationUrl,
    new DataView(binaryArrayBuffer),
  );

  assertEquals(mockWriter.calls.writeBinaryToFile.length, 1);
  assertEquals(
    mockWriter.calls.writeBinaryToFile[0].contents,
    new Uint8Array(binaryArrayBuffer),
  );
});
