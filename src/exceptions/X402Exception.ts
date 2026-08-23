import Logger from "@bejibun/logger";
import {defineValue} from "@bejibun/utils";

/**
 * X402Exception — thrown for any x402 protocol/config/facilitator error
 * (missing config, invalid payments, facilitator failures, etc). Logs
 * itself on construction and defaults to a 502 status code, matching
 * upstream facilitator failure semantics.
 */
export default class X402Exception extends Error {
    /** HTTP-style status code associated with this error. Defaults to 502. */
    public code: number;

    /** Optional additional context/payload attached to the error. */
    public data?: any;

    /**
     * Creates and logs a new X402Exception.
     *
     * @param message - Human-readable error message.
     * @param data - Optional extra context to attach to the error.
     * @param code - Optional status code override (defaults to 502).
     * @returns A new X402Exception instance.
     */
    public constructor(message?: string, data?: any, code?: number) {
        super(message);
        this.name = "X402Exception";
        this.code = defineValue(code, 502);
        this.data = defineValue(data);

        Logger.setContext(this.name).error(this.message).trace(this.stack);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, X402Exception);
        }
    }
}
