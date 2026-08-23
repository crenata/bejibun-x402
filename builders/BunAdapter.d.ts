import type { HTTPAdapter } from "@x402/core/http";
/**
 * BunAdapter —- Implements @x402/core HTTPAdapter directly against Bun.BunRequest.
 */
export default class BunAdapter implements HTTPAdapter {
    private readonly request;
    private readonly url;
    /**
     * @param request - The raw Bun request to wrap. The full URL is parsed
     * once up front so path/query lookups don't re-parse on every call.
     */
    constructor(request: Bun.BunRequest);
    /**
     * Retrieves the value of a request header.
     *
     * @param name - The header name to look up (case-insensitive).
     * @returns The header value, or `undefined` if it isn't present.
     */
    getHeader(name: string): string | undefined;
    /**
     * Retrieves the HTTP method of the request.
     *
     * @returns The upper-cased HTTP method (e.g. `"GET"`).
     */
    getMethod(): string;
    /**
     * Retrieves the request's path.
     *
     * @returns The URL pathname, excluding the query string.
     */
    getPath(): string;
    /**
     * Retrieves the full request URL.
     *
     * @returns The complete URL string, including the query string.
     */
    getUrl(): string;
    /**
     * Retrieves the request's `Accept` header.
     *
     * @returns The `Accept` header value, or an empty string if absent.
     */
    getAcceptHeader(): string;
    /**
     * Retrieves the request's `User-Agent` header.
     *
     * @returns The `User-Agent` header value, or an empty string if absent.
     */
    getUserAgent(): string;
    /**
     * Retrieves a single query string parameter.
     *
     * @param name - The query parameter name to look up.
     * @returns The parameter value, or `undefined` if it isn't present.
     */
    getQueryParam(name: string): string | undefined;
    /**
     * Retrieves all query string parameters.
     *
     * @returns A flat key/value map of every query string parameter.
     */
    getQueryParams(): Record<string, string>;
}
