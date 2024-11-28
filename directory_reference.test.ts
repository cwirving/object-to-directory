import { test } from "@cross/test";
import { assertEquals, assertThrows } from "@std/assert";
import {
  DirectoryEscapeError,
  DirectoryReference,
} from "./directory_reference.ts";

test("Can create DirectoryReference instances", () => {
  const dr1 = new DirectoryReference(new URL("http://foo.bar"));
  assertEquals(dr1.canonicalUrl.href, "http://foo.bar/");

  const dr2 = new DirectoryReference(new URL("http://foo.bar/"));
  assertEquals(dr2.canonicalUrl.href, "http://foo.bar/");

  const dr3 = new DirectoryReference(new URL("file:///"));
  assertEquals(dr3.canonicalUrl.href, "file:///");

  const dr4 = new DirectoryReference(new URL("file:///foo/bar/"));
  assertEquals(dr4.canonicalUrl.href, "file:///foo/bar");

  const dr5 = new DirectoryReference(new URL("file:///foo//bar"));
  assertEquals(dr5.canonicalUrl.href, "file:///foo/bar");

  const dr6 = new DirectoryReference(new URL("file:///foo//bar//baz//"));
  assertEquals(dr6.canonicalUrl.href, "file:///foo/bar/baz");

  const dr7 = new DirectoryReference(new URL("file:///foo/bar/../../baz"));
  assertEquals(dr7.canonicalUrl.href, "file:///baz");
});

test("DirectoryReference constructor does not escape the file system", () => {
  // Not advertised behavior, but we don't want surprises later.
  const dr = new DirectoryReference(new URL("file:///foo/bar/../../../baz"));
  assertEquals(dr.canonicalUrl.href, "file:///baz");
});

test("DirectoryReference getContentsUrl() behaves as expected for normal inputs", () => {
  const dr1 = new DirectoryReference(new URL("http://foo.bar"));
  assertEquals(dr1.getContentsUrl("x").href, "http://foo.bar/x");

  const dr2 = new DirectoryReference(new URL("http://foo.bar/"));
  assertEquals(dr2.getContentsUrl("x/").href, "http://foo.bar/x/");

  const dr3 = new DirectoryReference(new URL("file:///"));
  assertEquals(dr3.getContentsUrl("x/y/z").href, "file:///x/y/z");

  const dr4 = new DirectoryReference(new URL("file:///foo/bar/"));
  assertEquals(dr4.getContentsUrl("x//y///z").href, "file:///foo/bar/x/y/z");

  const dr5 = new DirectoryReference(new URL("file:///foo//bar"));
  assertEquals(dr5.getContentsUrl("x/../z").href, "file:///foo/bar/z");

  // We don't prevent directory escape attempts that end up back in the same directory.
  const dr6 = new DirectoryReference(new URL("file:///foo//bar//baz//"));
  assertEquals(
    dr6.getContentsUrl("../../../foo/bar/baz/z").href,
    "file:///foo/bar/baz/z",
  );
});

test("DirectoryReference getContentsUrl() detects directory escapes", () => {
  const dr1 = new DirectoryReference(new URL("http://foo.bar/baz"));
  assertThrows(() => {
    dr1.getContentsUrl("../x");
  }, DirectoryEscapeError);

  const dr2 = new DirectoryReference(new URL("file:///foo/bar/baz"));
  assertThrows(() => {
    dr2.getContentsUrl("x/../../y");
  }, DirectoryEscapeError);
});
