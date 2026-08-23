import type {HTTPAdapter} from "@x402/core/http";
import {defineValue} from "@bejibun/utils";

/**
 * BunAdapter —- Implements @x402/core HTTPAdapter directly against Bun.BunRequest.
 */
export default class BunAdapter implements HTTPAdapter {
    private readonly request: Bun.BunRequest;

    private readonly url: URL;

    /**
     * @param request - The raw Bun request to wrap. The full URL is parsed
     * once up front so path/query lookups don't re-parse on every call.
     */
    public constructor(request: Bun.BunRequest) {
        this.request = request;
        this.url = new URL(this.request.url);
    }

    /**
     * Retrieves the value of a request header.
     *
     * @param name - The header name to look up (case-insensitive).
     * @returns The header value, or `undefined` if it isn't present.
     */
    public getHeader(name: string): string | undefined {
        return defineValue(this.request.headers.get(name), undefined);
    }

    /**
     * Retrieves the HTTP method of the request.
     *
     * @returns The upper-cased HTTP method (e.g. `"GET"`).
     */
    public getMethod(): string {
        return this.request.method.toUpperCase();
    }

    /**
     * Retrieves the request's path.
     *
     * @returns The URL pathname, excluding the query string.
     */
    public getPath(): string {
        return this.url.pathname;
    }

    /**
     * Retrieves the full request URL.
     *
     * @returns The complete URL string, including the query string.
     */
    public getUrl(): string {
        return this.request.url;
    }

    /**
     * Retrieves the request's `Accept` header.
     *
     * @returns The `Accept` header value, or an empty string if absent.
     */
    public getAcceptHeader(): string {
        return defineValue(this.request.headers.get("accept"), "");
    }

    /**
     * Retrieves the request's `User-Agent` header.
     *
     * @returns The `User-Agent` header value, or an empty string if absent.
     */
    public getUserAgent(): string {
        return defineValue(this.request.headers.get("user-agent"), "");
    }

    /**
     * Retrieves a single query string parameter.
     *
     * @param name - The query parameter name to look up.
     * @returns The parameter value, or `undefined` if it isn't present.
     */
    public getQueryParam(name: string): string | undefined {
        return defineValue(this.url.searchParams.get(name), undefined);
    }

    /**
     * Retrieves all query string parameters.
     *
     * @returns A flat key/value map of every query string parameter.
     */
    public getQueryParams(): Record<string, string> {
        const params: Record<string, string> = {};

        this.url.searchParams.forEach((value: string, key: string) => {
            params[key] = value;
        });

        return params;
    }
}
