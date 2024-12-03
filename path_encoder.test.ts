import { assertEquals, assertFalse } from "@std/assert";
import fc from "fast-check";
import { test } from "@cross/test";
import { decodePathElement, encodePathElement } from "./path_encoder.ts";

test("Trivial path encodings", () => {
  assertEquals(encodePathElement(""), "");
  assertEquals(encodePathElement(""), encodeURIComponent(""));
  assertEquals(encodePathElement("%"), encodeURIComponent("%"));
  assertEquals(encodePathElement("/"), encodeURIComponent("/"));
});

test("Trivial path decoding examples", () => {
  assertEquals(decodePathElement(""), "");
  assertEquals(decodePathElement(""), decodeURIComponent(""));
  assertEquals(decodePathElement("%25"), decodeURIComponent("%25"));
  assertEquals(decodePathElement("%2F"), decodeURIComponent("%2F"));
});

test("Encoded strings never contain slashes", () => {
  fc.assert(fc.property(fc.string({ maxLength: 256 }), (s: string) => {
    assertFalse(s.includes(encodePathElement("/")));
  }));
});

test("Encoding and decoding round trip properly", () => {
  fc.assert(fc.property(fc.string({ maxLength: 256 }), (s: string) => {
    assertEquals(decodePathElement(encodePathElement(s)), s);
  }));
});
