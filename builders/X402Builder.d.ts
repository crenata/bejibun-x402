import type { TFacilitator, TRoutePayment } from "../types/x402";
/**
 * X402Builder — assembles and drives an `@x402/core` HTTP resource server
 * for a single route, using either an app-level config file
 * (`config/x402.ts`) or per-route overrides supplied via the fluent
 * setters. Exposes `middleware()` as the entry point that performs
 * verification, handler invocation, and settlement for a Bun request.
 */
export default class X402Builder {
    /** Resolved x402 config, loaded from the app's config/x402.ts or the package default. */
    protected conf: Record<string, any>;
    /** Per-instance facilitator override, set via setFacilitator(). */
    protected _facilitator?: TFacilitator;
    /** The incoming Bun request being processed, set via setRequest(). */
    protected request?: Bun.BunRequest;
    /** Per-route payment overrides (scheme, price, network, etc.), set via setRoutePayment(). */
    protected routePaymentConfig?: TRoutePayment;
    private static _serverCache;
    private static _initPromises;
    private static _resolvedConfig?;
    private static _acceptsCache;
    private static _defaultAcceptsEntry?;
    /**
     * Loads the x402 config: prefers the app's own `config/x402.ts` if it
     * exists on disk, otherwise falls back to the package's default config.
     * Resolved once per process and reused by every instance.
     *
     * @returns A new X402Builder instance with its config resolved.
     */
    constructor();
    /**
     * Retrieves the active config object.
     *
     * @throws {X402Exception} If no config could be resolved.
     * @returns The resolved x402 config.
     */
    private get config();
    /**
     * Resolves the payment scheme to use.
     *
     * @returns The per-route override, falling back to the config file
     * value, then to `"exact"`.
     */
    private get scheme();
    /**
     * Resolves the price to charge.
     *
     * @returns The per-route override, falling back to the config file
     * value, then to `"$1"`.
     */
    private get price();
    /**
     * Resolves the human-readable description attached to the payment
     * requirement.
     *
     * @returns The per-route override, falling back to a default description.
     */
    private get description();
    /**
     * Resolves the response MIME type to advertise/use for payment responses.
     *
     * @returns The per-route override, falling back to `"application/json"`.
     */
    private get mimeType();
    /**
     * Resolves the facilitator to use for verification/settlement.
     *
     * @returns The instance override set via setFacilitator(), falling
     * back to the config file value, then to the default Coinbase facilitator.
     */
    private get facilitator();
    /**
     * Resolves the accepts array for a route, memoized per routePaymentConfig
     * reference (or process-wide when relying purely on the global config)
     * so it's only computed once per route rather than on every request.
     *
     * @returns The cached entry containing the resolved accepts array and
     * its pre-computed JSON cache key.
     */
    private get acceptsEntry();
    /**
     * The resolved accepts array for the route, memoized via acceptsEntry.
     *
     * @returns The resolved list of network payment terms for the route.
     */
    private get accepts();
    /**
     * Builds the accepts array for a route. Not memoized itself — called
     * once per route by acceptsEntry, which caches the result.
     *
     * Priority order:
     *   1. routePaymentConfig.accepts  — explicit multi-network list
     *   2. routePaymentConfig single-network fields (network + payTo)
     *   3. config.networks             — both EVM + SVM from config file
     *   4. built-in defaults (EVM Base + Solana mainnet)
     *
     * @returns The resolved list of network payment terms for the route.
     */
    private resolveAccepts;
    /**
     * Builds (or reuses a cached) x402HTTPResourceServer for the current
     * route + accepts combination.
     *
     * Servers are cached by a key derived from method, path, and the
     * resolved `accepts` array, since each unique combination needs its
     * own registered schemes and its own one-time `initialize()` call
     * (which locks in the SVM fee payer). Concurrent requests for a route
     * that hasn't been initialized yet share the same in-flight promise
     * so only one server is ever built per key.
     *
     * @param adapter - The Bun request adapter for the current route.
     * @returns The initialized (possibly cached) x402HTTPResourceServer.
     */
    private buildHttpServer;
    /**
     * Overrides the facilitator used for verification/settlement on this
     * builder instance.
     *
     * @param config - The facilitator to use, or `undefined` to clear the override.
     * @returns This builder instance, for chaining.
     */
    setFacilitator(config?: TFacilitator): X402Builder;
    /**
     * Sets per-route payment options that take priority over the
     * app-level config.
     *
     * @param config - Route-level overrides (scheme, price, network,
     * payTo, accepts, etc.), or `undefined` to clear the override.
     * @returns This builder instance, for chaining.
     */
    setRoutePayment(config?: TRoutePayment): X402Builder;
    /**
     * Sets the incoming Bun request to be processed by middleware().
     * Must be called before middleware().
     *
     * @param request - The incoming Bun request.
     * @returns This builder instance, for chaining.
     */
    setRequest(request: Bun.BunRequest): X402Builder;
    /**
     * Runs x402 payment verification and settlement via @x402/core directly.
     *
     * Flow:
     *   - No payment header  -> 402 + PAYMENT-REQUIRED header
     *   - Invalid payment    -> 402 + PAYMENT-REQUIRED header (with error)
     *   - Valid payment      -> verifies, calls handler(), settles, attaches PAYMENT-RESPONSE header
     *
     * @param handler - The route handler to invoke once payment is verified (or immediately, if no payment is required).
     * @throws {X402Exception} If setRequest() wasn't called first, or if request processing fails unexpectedly.
     * @returns The final Response to send to the client.
     */
    middleware(handler: () => Promise<Response>): Promise<Response>;
}
