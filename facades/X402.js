import X402Builder from "../builders/X402Builder";
/**
 * X402 — static facade over X402Builder, providing a fluent entry point
 * for configuring and running x402 payment middleware without manually
 * instantiating a builder.
 */
export default class X402 {
    /**
     * Starts a new X402Builder with a facilitator override applied.
     *
     * @param config - The facilitator to use, or `undefined` for the default.
     * @returns A new X402Builder instance with the facilitator applied.
     */
    static setFacilitator(config) {
        return new X402Builder().setFacilitator(config);
    }
    /**
     * Starts a new X402Builder with per-route payment options applied.
     *
     * @param config - Route-level payment overrides (scheme, price,
     * network, payTo, accepts, etc.).
     * @returns A new X402Builder instance with the route payment applied.
     */
    static setRoutePayment(config) {
        return new X402Builder().setRoutePayment(config);
    }
    /**
     * Starts a new X402Builder bound to the given request, ready for
     * middleware() to be called.
     *
     * @param request - The incoming Bun request.
     * @returns A new X402Builder instance bound to the request.
     */
    static setRequest(request) {
        return new X402Builder().setRequest(request);
    }
}
