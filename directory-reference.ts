import { normalize } from "@std/path/posix";

export class DirectoryEscapeError extends Error {
  constructor(
    candidatePath: string,
    escapedPath: string,
    enclosingPath: string,
  ) {
    super(
      `Attempted directory escape. Path "${candidatePath}" escapes enclosing path "${enclosingPath}" --> "${escapedPath}"`,
    );
  }
}

/**
 * Encapsulation of the concept of a directory reference in URL form.
 *
 * A directory reference has a canonical URL that has no trailing slash.
 * A directory reference can create the URL of contents by name.
 */
export class DirectoryReference {
  /**
   * The canonical URL of the directory. Does not have trailing slashes.
   */
  readonly canonicalUrl: URL;

  /**
   * The canonical URL of the directory with an extra trailing slash.
   * @private
   */
  readonly #urlWithTrailingSlash: URL;

  /**
   * Construct a new directory reference from a URL that may or may not have trailing slashes.
   *
   * @param directoryUrl The input directory URL. May have trailing slashes.
   */
  constructor(directoryUrl: URL) {
    const normalizedUrl = new URL(directoryUrl);
    normalizedUrl.pathname = normalize(normalizedUrl.pathname);

    if (normalizedUrl.pathname.endsWith("/")) {
      this.canonicalUrl = new URL(normalizedUrl);
      this.canonicalUrl.pathname = this.canonicalUrl.pathname.substring(
        0,
        this.canonicalUrl.pathname.length - 1,
      );
      this.#urlWithTrailingSlash = normalizedUrl;
    } else {
      this.canonicalUrl = normalizedUrl;
      this.#urlWithTrailingSlash = new URL(normalizedUrl);
      this.#urlWithTrailingSlash.pathname =
        this.#urlWithTrailingSlash.pathname + "/";
    }
  }

  /**
   * Get the URL of directory contents.
   *
   * @param name The name of the directory contents (a file or subdirectory).
   * @return The URL of the contents.
   * @throws DirectoryEscapeError When the name parameter results in a directory escape.
   */
  getContentsUrl(name: string): URL {
    const contentsUrl = new URL(name, this.#urlWithTrailingSlash);
    contentsUrl.pathname = normalize(contentsUrl.pathname);

    if (!contentsUrl.pathname.startsWith(this.#urlWithTrailingSlash.pathname)) {
      throw new DirectoryEscapeError(
        name,
        contentsUrl.pathname,
        this.canonicalUrl.pathname,
      );
    }

    return contentsUrl;
  }
}
