import App from "@bejibun/app";
import { facilitator as CoinbaseFacilitator } from "@coinbase/x402";
import { x402HTTPResourceServer } from "@x402/core/http";
import { HTTPFacilitatorClient, getFacilitatorResponseError, x402ResourceServer } from "@x402/core/server";
import { BatchSettlementEvmScheme } from "@x402/evm/batch-settlement/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { UptoEvmScheme } from "@x402/evm/upto/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import fs from "fs";
import BunAdapter from "./BunAdapter";
import X402Config from "../config/x402";
import X402Exception from "../exceptions/X402Exception";
/**
 * X402Builder — assembles and drives an `@x402/core` HTTP resource server
 * for a single route, using either an app-level config file
 * (`config/x402.ts`) or per-route overrides supplied via the fluent
 * setters. Exposes `middleware()` as the entry point that performs
 * verification, handler invocation, and settlement for a Bun request.
 */
export default class X402Builder {
    /** Resolved x402 config, loaded from the app's config/x402.ts or the package default. */
    conf;
    /** Per-instance facilitator override, set via setFacilitator(). */
    _facilitator;
    /** The incoming Bun request being processed, set via setRequest(). */
    request;
    /** Per-route payment overrides (scheme, price, network, etc.), set via setRoutePayment(). */
    routePaymentConfig;
    // Static cache: persists across all X402Builder instances (new X402Builder() per request)
    static _serverCache = new Map();
    static _initPromises = new Map();
    // Resolved app config, cached once per process. Avoids re-checking the
    // filesystem and re-requiring config/x402.ts on every request, since
    // X402Builder is constructed fresh per request.
    static _resolvedConfig;
    // Resolved `accepts` array (plus its pre-stringified cache key), cached
    // per routePaymentConfig object reference. Route registration typically
    // passes the same config object on every request to a given route, so
    // this avoids rebuilding the accepts array and re-running JSON.stringify
    // on every request — including cache-hit requests, where it previously
    // ran before the server-cache lookup even happened.
    static _acceptsCache = new WeakMap();
    static _defaultAcceptsEntry;
    /**
     * Loads the x402 config: prefers the app's own `config/x402.ts` if it
     * exists on disk, otherwise falls back to the package's default config.
     * Resolved once per process and reused by every instance.
     *
     * @returns {X402Builder} A new X402Builder instance with its config resolved.
     */
    constructor() {
        if (!X402Builder._resolvedConfig) {
            const configPath = App.Path.configPath("x402.ts");
            X402Builder._resolvedConfig = fs.existsSync(configPath)
                ? require(configPath).default
                : X402Config;
        }
        this.conf = X402Builder._resolvedConfig;
    }
    /**
     * Retrieves the active config object.
     *
     * @throws {X402Exception} If no config could be resolved.
     * @returns {Record<string, any>} The resolved x402 config.
     */
    get config() {
        if (!this.conf)
            throw new X402Exception("There is no config provided.");
        return this.conf;
    }
    /**
     * Resolves the payment scheme to use.
     *
     * @returns {TScheme} The per-route override, falling back to the config file
     * value, then to `"exact"`.
     */
    get scheme() {
        return this.routePaymentConfig?.scheme ?? this.config.scheme ?? "exact";
    }
    /**
     * Resolves the price to charge.
     *
     * @returns {TPrice} The per-route override, falling back to the config file
     * value, then to `"$1"`.
     */
    get price() {
        return this.routePaymentConfig?.price ?? this.config.price ?? "$1";
    }
    /**
     * Resolves the human-readable description attached to the payment
     * requirement.
     *
     * @returns {string} The per-route override, falling back to a default description.
     */
    get description() {
        return this.routePaymentConfig?.description ?? "Monetized endpoint with x402 protocol.";
    }
    /**
     * Resolves the response MIME type to advertise/use for payment responses.
     *
     * @returns {string} The per-route override, falling back to `"application/json"`.
     */
    get mimeType() {
        return this.routePaymentConfig?.mimeType ?? "application/json";
    }
    /**
     * Resolves the facilitator to use for verification/settlement.
     *
     * @returns {TFacilitator} The instance override set via setFacilitator(), falling
     * back to the config file value, then to the default Coinbase facilitator.
     */
    get facilitator() {
        return this._facilitator ?? this.config?.facilitator ?? CoinbaseFacilitator;
    }
    /**
     * Resolves the accepts array for a route, memoized per routePaymentConfig
     * reference (or process-wide when relying purely on the global config)
     * so it's only computed once per route rather than on every request.
     *
     * @returns {{accepts: Array<TNetworkPayment>; key: string}} The cached entry containing the resolved accepts array and
     * its pre-computed JSON cache key.
     */
    get acceptsEntry() {
        if (this.routePaymentConfig) {
            const cached = X402Builder._acceptsCache.get(this.routePaymentConfig);
            if (cached)
                return cached;
        }
        else if (X402Builder._defaultAcceptsEntry) {
            return X402Builder._defaultAcceptsEntry;
        }
        const accepts = this.resolveAccepts();
        const entry = { accepts, key: JSON.stringify(accepts) };
        if (this.routePaymentConfig) {
            X402Builder._acceptsCache.set(this.routePaymentConfig, entry);
        }
        else {
            X402Builder._defaultAcceptsEntry = entry;
        }
        return entry;
    }
    /**
     * The resolved accepts array for the route, memoized via acceptsEntry.
     *
     * @returns {Array<TNetworkPayment>} The resolved list of network payment terms for the route.
     */
    get accepts() {
        return this.acceptsEntry.accepts;
    }
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
     * @returns {Array<TNetworkPayment>} The resolved list of network payment terms for the route.
     */
    resolveAccepts() {
        // 1. Explicit accepts array on the route config
        if (this.routePaymentConfig?.accepts?.length) {
            return this.routePaymentConfig.accepts.map((entry) => ({
                scheme: entry.scheme ?? this.scheme,
                price: entry.price ?? this.price,
                network: entry.network,
                payTo: entry.payTo,
                description: entry.description ?? this.description,
                mimeType: entry.mimeType ?? this.mimeType
            }));
        }
        // 2. Single-network shorthand on the route config
        if (this.routePaymentConfig?.network && this.routePaymentConfig?.payTo) {
            return [
                {
                    scheme: this.scheme,
                    price: this.price,
                    network: this.routePaymentConfig.network,
                    payTo: this.routePaymentConfig.payTo,
                    description: this.description,
                    mimeType: this.mimeType
                }
            ];
        }
        // 3. Multi-network block in config file
        if (this.config.networks?.length) {
            return this.config.networks.map((entry) => ({
                scheme: this.scheme,
                price: this.price,
                network: entry.network,
                payTo: entry.payTo,
                description: this.description,
                mimeType: this.mimeType
            }));
        }
        // 4. Built-in defaults
        const evmPayTo = "0xdABe8750061410D35cE52EB2a418c8cB004788B3";
        const svmPayTo = "GAnoyvy9p3QFyxikWDh9hA3fmSk2uiPLNWyQ579cckMn";
        const evmNetworks = [
            "eip155:8453",
            "eip155:137",
            "eip155:42161",
            "eip155:480"
        ];
        const svmNetworks = ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"];
        return [
            ...evmNetworks.map((network) => ({
                scheme: this.scheme,
                price: this.price,
                network,
                payTo: evmPayTo,
                description: this.description,
                mimeType: this.mimeType
            })),
            ...svmNetworks.map((network) => ({
                scheme: "exact",
                price: this.price,
                network,
                payTo: svmPayTo,
                description: this.description,
                mimeType: this.mimeType
            }))
        ];
    }
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
     * @param {BunAdapter} adapter - The Bun request adapter for the current route.
     * @returns {Promise<x402HTTPResourceServer>} The initialized (possibly cached) x402HTTPResourceServer.
     */
    async buildHttpServer(adapter) {
        const cacheKey = `${adapter.getMethod()} ${adapter.getPath()}:${this.acceptsEntry.key}`;
        // Return already-initialized instance immediately
        if (X402Builder._serverCache.has(cacheKey))
            return X402Builder._serverCache.get(cacheKey);
        // If another request is already initializing this same key, wait for it
        // prevents duplicate servers with different feePayers being built simultaneously
        if (X402Builder._initPromises.has(cacheKey))
            return X402Builder._initPromises.get(cacheKey);
        const initPromise = (async () => {
            try {
                const facilitatorClient = new HTTPFacilitatorClient(this.facilitator);
                const resourceServer = new x402ResourceServer(facilitatorClient);
                const registeredNetworks = new Set();
                for (const entry of this.accepts) {
                    if (registeredNetworks.has(entry.network))
                        continue;
                    registeredNetworks.add(entry.network);
                    if (entry.network.startsWith("eip155:")) {
                        const evmPayTo = entry.payTo;
                        resourceServer
                            .register(entry.network, new ExactEvmScheme())
                            .register(entry.network, new UptoEvmScheme())
                            .register(entry.network, new BatchSettlementEvmScheme(evmPayTo));
                    }
                    if (entry.network.startsWith("solana:")) {
                        resourceServer.register(entry.network, new ExactSvmScheme());
                    }
                }
                const routeKey = `${adapter.getMethod()} ${adapter.getPath()}`;
                const routes = {
                    [routeKey]: {
                        accepts: this.accepts.map((entry) => ({
                            scheme: entry.scheme,
                            payTo: entry.payTo,
                            price: entry.price,
                            network: entry.network
                        })),
                        description: this.description,
                        mimeType: this.mimeType
                    }
                };
                const httpServer = new x402HTTPResourceServer(resourceServer, routes);
                // initialize ONCE — this locks in the SVM feePayer
                try {
                    await httpServer.initialize();
                }
                catch (error) {
                    const facilitatorError = getFacilitatorResponseError(error);
                    if (facilitatorError) {
                        throw new X402Exception(facilitatorError.message);
                    }
                }
                X402Builder._serverCache.set(cacheKey, httpServer);
                return httpServer;
            }
            finally {
                // Always clean up the in-flight promise, success or failure
                X402Builder._initPromises.delete(cacheKey);
            }
        })();
        X402Builder._initPromises.set(cacheKey, initPromise);
        return initPromise;
    }
    /**
     * Overrides the facilitator used for verification/settlement on this
     * builder instance.
     *
     * @param {TFacilitator} config - The facilitator to use, or `undefined` to clear the override.
     * @returns {X402Builder} This builder instance, for chaining.
     */
    setFacilitator(config) {
        this._facilitator = config;
        return this;
    }
    /**
     * Sets per-route payment options that take priority over the
     * app-level config.
     *
     * @param {TRoutePayment} config - Route-level overrides (scheme, price, network,
     * payTo, accepts, etc.), or `undefined` to clear the override.
     * @returns {X402Builder} This builder instance, for chaining.
     */
    setRoutePayment(config) {
        this.routePaymentConfig = config;
        return this;
    }
    /**
     * Sets the incoming Bun request to be processed by middleware().
     * Must be called before middleware().
     *
     * @param {Bun.BunRequest} request - The incoming Bun request.
     * @returns {X402Builder} This builder instance, for chaining.
     */
    setRequest(request) {
        this.request = request;
        return this;
    }
    /**
     * Runs x402 payment verification and settlement via @x402/core directly.
     *
     * Flow:
     *   - No payment header  -> 402 + PAYMENT-REQUIRED header
     *   - Invalid payment    -> 402 + PAYMENT-REQUIRED header (with error)
     *   - Valid payment      -> verifies, calls handler(), settles, attaches PAYMENT-RESPONSE header
     *
     * @param {Function} handler - The route handler to invoke once payment is verified (or immediately, if no payment is required).
     * @throws {X402Exception} If setRequest() wasn't called first, or if request processing fails unexpectedly.
     * @returns {Promise<Response>} The final Response to send to the client.
     */
    async middleware(handler) {
        if (!this.request)
            throw new X402Exception("setRequest() must be called before middleware().");
        const adapter = new BunAdapter(this.request);
        // buildHttpServer is now async and handles initialize() internally, only once per route
        const httpServer = await this.buildHttpServer(adapter);
        const context = {
            adapter,
            path: adapter.getPath(),
            method: adapter.getMethod(),
            paymentHeader: adapter.getHeader("payment-signature") ?? adapter.getHeader("x-payment")
        };
        let result;
        try {
            result = await httpServer.processHTTPRequest(context);
        }
        catch (error) {
            throw new X402Exception(error.message);
        }
        if (!result) {
            result = {
                type: "no-payment-required"
            };
        }
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "*"
        };
        switch (result.type) {
            case "no-payment-required":
                return await handler();
            case "payment-error": {
                const { status, headers, body, isHtml } = result.response;
                return new Response(!body ? null : JSON.stringify(body), {
                    headers: {
                        ...headers,
                        "Content-Type": isHtml ? "text/html" : this.mimeType,
                        ...corsHeaders
                    },
                    status
                });
            }
            case "payment-verified": {
                const { cancellationDispatcher, paymentPayload, paymentRequirements, declaredExtensions } = result;
                // Run handler, cancel on throw
                let handlerResponse;
                try {
                    handlerResponse = await handler();
                }
                catch (error) {
                    await cancellationDispatcher?.cancel({ reason: "handler_threw", error });
                    throw new X402Exception(error.message);
                }
                // Cancel settlement on handler error responses (4xx/5xx)
                if (handlerResponse.status >= 400) {
                    await cancellationDispatcher?.cancel({
                        reason: "handler_failed",
                        responseStatus: handlerResponse.status
                    });
                    return handlerResponse;
                }
                // Read body for settlement context
                const responseBody = await handlerResponse.arrayBuffer();
                const responseHeaders = {};
                handlerResponse.headers.forEach((value, key) => {
                    responseHeaders[key] = value;
                });
                // Settle payment
                try {
                    const settlement = await httpServer.processSettlement(paymentPayload, paymentRequirements, declaredExtensions, {
                        request: context,
                        responseBody: Buffer.from(responseBody),
                        responseHeaders
                    });
                    if (!settlement.success) {
                        const { status, headers, body, isHtml } = settlement.response;
                        return new Response(!body ? null : JSON.stringify(body), {
                            headers: {
                                ...headers,
                                "Content-Type": isHtml ? "text/html" : this.mimeType,
                                ...corsHeaders
                            },
                            status
                        });
                    }
                    // Merge settlement headers into response
                    const mergedHeaders = new Headers(handlerResponse.headers);
                    Object.entries(settlement.headers).forEach(([k, v]) => mergedHeaders.set(k, v));
                    Object.entries(corsHeaders).forEach(([k, v]) => mergedHeaders.set(k, v));
                    mergedHeaders.set("Content-Type", this.mimeType);
                    return new Response(responseBody, {
                        headers: mergedHeaders,
                        status: handlerResponse.status
                    });
                }
                catch (error) {
                    const facilitatorError = getFacilitatorResponseError(error);
                    if (facilitatorError) {
                        return new Response(JSON.stringify({
                            error: facilitatorError.message
                        }), {
                            headers: {
                                "Content-Type": "application/json",
                                ...corsHeaders
                            },
                            status: 502
                        });
                    }
                    // Fallback: return 402 status
                    return new Response(JSON.stringify({}), {
                        headers: {
                            "Content-Type": "application/json",
                            ...corsHeaders
                        },
                        status: 402
                    });
                }
            }
            default:
                throw new X402Exception("Whoops, something went wrong. Please try again...");
        }
    }
}
