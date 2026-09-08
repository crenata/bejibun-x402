import Logger from "@bejibun/logger";
/**
 * X402Exception — thrown for any x402 protocol/config/facilitator error
 * (missing config, invalid payments, facilitator failures, etc). Logs
 * itself on construction and defaults to a 502 status code, matching
 * upstream facilitator failure semantics.
 */
export default class X402Exception extends Error {
    /** HTTP-style status code associated with this error. Defaults to 502. */
    code;
    /** Optional additional context/payload attached to the error. */
    data;
    /**
     * Creates and logs a new X402Exception.
     *
     * @param {string} message - Human-readable error message.
     * @param {any} data - Optional extra context to attach to the error.
     * @param {number} code - Optional status code override (defaults to 502).
     * @returns {X402Exception} A new X402Exception instance.
     */
    constructor(message, data, code) {
        super(message);
        this.name = "X402Exception";
        this.code = code || 502;
        this.data = data || undefined;
        Logger.setContext(this.name).error(this.message).trace(this.stack);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, X402Exception);
        }
    }
}
