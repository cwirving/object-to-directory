# Object-To-Directory

This library is the reverse of
[@scroogieboy/directory-to-object](https://jsr.io/@scroogieboy/directory-to-object).
It makes it easy to write out the contents of a JavaScript object structure to
the file system in a granular fashion: instead of writing a single JSON, YAML or
other format file, the data is written to a directory, with properties written
to various formats (or directories) based on configuration.

## Concepts

The central concept of this library is the value storage handler: an object
implementing interface
(`ValueStorageHandler`)[./doc/interfaces/~/ValueStorageHandler] whose
responsibility it is to store a value in the file system. There are value
storage handlers that write to files (e.g., text files, JSON files, etc.) and
there are value storage handlers that write objects/arrays to directories by
storing their individual properties/items within each directory.

The value storage handlers can be created in a fluent fashion using the
`Handlers` singleton. For example, in the Deno REPL:

```
> import * as otd from "jsr:@scroogieboy/object-to-directory";
undefined
> let x = otd.Handlers.textFile().whenPathMatches("**/*foo*").withName("foo handler")
undefined
> x.name
"foo handler"
```

Value storage handlers have a simple interface: a `name` property, a method to
determine if a value can be stored using the handler and a method to perform the
storage.

```typescript
export interface ValueStorageHandler {
  readonly name: string;

  canStoreValue(
    pathInSource: string,
    destinationUrl: URL,
    value: unknown,
  ): boolean;

  storeValue(
    pathInSource: string,
    destinationUrl: URL,
    value: unknown,
    options?: Readonly<ValueStorageHandlerOptions>,
  ): Promise<void>;
}
```

At runtime, as each property of an object to store is visited, the configured
handlers are queried in order -- calling `canStoreValue` on each until one
responds `true`. The property is then stored by calling the `storeValue` on the
first handler that responded to the `canStoreValue` query.

See the examples below for more concrete code that makes use of handler
configuration.

## API

The (`storeObjectToDirectory`)[./doc/~/storeObjectToDirectory] function stores a
JavaScript object to the file system as a directory. It relies on value storage
handlers to guide how the various properties in the input object and their
descendents are written to the file system.

The (`Handlers`)[./doc/~~/Handlers] singleton variable builder singleton is a
convenient way to build handlers for `storeObjectToDirectory`. See the
(`HandlerBuilder`)[./doc/interfaces/~~/HandlerBuilder] interface for a
description of the various handlers that can be created through the builder.

## Examples

### Write the OpenAPI "pet store" spec in a decomposed directory structure, then read it back using `@scroogieboy/directory-to-object`

This example uses a small set of handlers set up to define output format choices
for specific paths in the spec.

It also makes use of the property name encoder option to map characters that are
forbidden in the file system to more aesthetic choices (mapping the forward
slash to a full-width solidus).

Finally, it reads the directory structure back into memory using the
`@scroogieboy/directory-to-object` package and verifies that the specs match.

```typescript
import { assertEquals } from "@std/assert";
import {
  Handlers,
  storeObjectToDirectory,
} from "@scroogieboy/object-to-directory";
import { loadObjectFromDirectory } from "@scroogieboy/directory-to-object";
import petstore from "./petstore.json" with { type: "json" };

const destinationUrl = new URL(import.meta.resolve("../tmp/petstore"));

const handlers = [
  // Write the "openapi" value as its own file.
  Handlers.textFile().whenPathMatches("/openapi"),
  // These are the path patterns we want to write out as JSON files.
  Handlers.jsonFile().whenPathMatchesSome([
    "/components/schemas/*",
    "/info",
    "/paths/*",
    "/servers",
  ]),
  // Any remaining objects will be written as directories.
];

// Clean up the destination directory, if it exists.
try {
  await Deno.remove(destinationUrl, { recursive: true });
} catch (e) {
  if (!(e instanceof Deno.errors.NotFound)) {
    throw e;
  }
}

// Let's use a little Unicode trickery to make the paths look pretty: replace "/" with
// the full-width solidus character, which is allowed in the file system.
await storeObjectToDirectory(destinationUrl, petstore, handlers, {
  strict: true,
  propertyNameEncoder: (name) => name.replaceAll("/", "／"),
});

// Use directory-to-object to load the OpenAPI spec back in, with the corresponding name decoding.
const loadedPetstore = await loadObjectFromDirectory(destinationUrl, {
  propertyNameDecoder: (name: string) => name.replaceAll("／", "/"),
});

// The specs should be identical 😀.
assertEquals(loadedPetstore, petstore);
```

The full example source code can be found in the [examples](./examples)
directory.

Running this program will write the OpenAPI spec decomposed into multiple files:

```
tmp
└── petstore
    ├── components
    │   └── schemas
    │       ├── Error.json
    │       ├── Pet.json
    │       └── Pets.json
    ├── info.json
    ├── openapi.txt
    ├── paths
    │   ├── ／pets.json
    │   └── ／pets／{petId}.json
    └── servers.json
```

### Unpack the vulnerabilities from a Trivy scan JSON file

This is a somewhat contrived example that makes use of nested directory handlers
to unpack the contents of a [Trivy](https://trivy.dev/) container image scan
(e.g., the Deno distroless Docker image) into a directory structure and write
the vulnerabilities as a CSV file.

We'll use the [json-2-csv](https://www.npmjs.com/package/json-2-csv) NPM package
for the actual CSV file writing.

```typescript
import { json2csv } from "json-2-csv";
import {
  Handlers,
  storeObjectToDirectory,
} from "@scroogieboy/object-to-directory";
import trivyOutput from "./trivy_output.json" with { type: "json" };

const destinationUrl = new URL(import.meta.resolve("../tmp/trivy_output"));

// Let's roll our own CSV handler.
const csvHandler = Handlers.customFile({
  serializer: (v) => Array.isArray(v) ? json2csv(v) : "",
  extension: ".csv",
  name: "CSV Handler",
});

// Set up the handlers for the "/Results" path -- we want to treat this path differently.
const resultsHandlers = [
  csvHandler.whenIsArray(),
  Handlers.textFile(),
];

const handlers = [
  // Plain-text properties go to .txt files.
  Handlers.textFile(),
  // The "Results" array property is written as a directory containing CSV files of vulnerabilities.
  Handlers.arrayToDirectory({
    keyProperty: "Target",
    handlers: resultsHandlers,
  }).whenPathMatches("/Results"),
  // Default to writing any other properties as JSON files.
  Handlers.jsonFile(),
];

// Clean up the destination directory, if it exists.
try {
  await Deno.remove(destinationUrl, { recursive: true });
} catch (e) {
  if (!(e instanceof Deno.errors.NotFound)) {
    throw e;
  }
}

// Let's write out a directory structure with the Trivy output broken out, including the
// vulnerabilities as a CSV file.
await storeObjectToDirectory(destinationUrl, trivyOutput, handlers, {
  strict: true,
});
```

```
tmp
└── trivy_output
    ├── ArtifactName.txt
    ├── ArtifactType.txt
    ├── CreatedAt.txt
    ├── Metadata.json
    ├── Results
    │   └── denoland%2Fdeno:distroless (debian 12.8)
    │       ├── Class.txt
    │       ├── Target.txt
    │       ├── Type.txt
    │       └── Vulnerabilities.csv
    └── SchemaVersion.json
```

```
```
