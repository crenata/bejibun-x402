/**
 * BunAdapter —- Implements @x402/core HTTPAdapter directly against Bun.BunRequest.
 */
export default class BunAdapter {
    request;
    url;
    /**
     * @param {Bun.BunRequest} request - The raw Bun request to wrap. The full URL is parsed
     * once up front so path/query lookups don't re-parse on every call.
     */
    constructor(request) {
        this.request = request;
        this.url = new URL(this.request.url);
    }
    /**
     * Retrieves the value of a request header.
     *
     * @param {string} name - The header name to look up (case-insensitive).
     * @returns {string | undefined} The header value, or `undefined` if it isn't present.
     */
    getHeader(name) {
        return this.request.headers.get(name) || undefined;
    }
    /**
     * Retrieves the HTTP method of the request.
     *
     * @returns {string} The upper-cased HTTP method (e.g. `"GET"`).
     */
    getMethod() {
        return this.request.method.toUpperCase();
    }
    /**
     * Retrieves the request's path.
     *
     * @returns {string} The URL pathname, excluding the query string.
     */
    getPath() {
        return this.url.pathname;
    }
    /**
     * Retrieves the full request URL.
     *
     * @returns {string} The complete URL string, including the query string.
     */
    getUrl() {
        return this.request.url;
    }
    /**
     * Retrieves the request's `Accept` header.
     *
     * @returns {string} The `Accept` header value, or an empty string if absent.
     */
    getAcceptHeader() {
        return this.request.headers.get("accept") || "";
    }
    /**
     * Retrieves the request's `User-Agent` header.
     *
     * @returns {string} The `User-Agent` header value, or an empty string if absent.
     */
    getUserAgent() {
        return this.request.headers.get("user-agent") || "";
    }
    /**
     * Retrieves a single query string parameter.
     *
     * @param {string} name - The query parameter name to look up.
     * @returns {string | undefined} The parameter value, or `undefined` if it isn't present.
     */
    getQueryParam(name) {
        return this.url.searchParams.get(name) || undefined;
    }
    /**
     * Retrieves all query string parameters.
     *
     * @returns {Record<string, string>} A flat key/value map of every query string parameter.
     */
    getQueryParams() {
        const params = {};
        this.url.searchParams.forEach((value, key) => {
            params[key] = value;
        });
        return params;
    }
}
