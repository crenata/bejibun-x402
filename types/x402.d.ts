/**
 * A price expressed as a specific on-chain asset and amount, rather than
 * a fiat-style money string (e.g. USDC on a given network).
 */
export type TAssetAmount = {
    /** Asset identifier (e.g. a token contract address or symbol). */
    asset: string;

    /** Amount of the asset, as a string to preserve precision. */
    amount: string;

    /** Optional extra metadata describing the asset amount. */
    extra?: Record<string, unknown>;
};

/**
 * Facilitator connection info for verifying and settling payments. `url`
 * points at the facilitator's API; `createAuthHeaders` optionally builds
 * per-operation auth headers (verify/settle/supported/bazaar).
 */
export type TFacilitator = {
    /** Base URL of the facilitator's API. */
    url?: string;

    /** Builds auth headers for each facilitator operation, if required. */
    createAuthHeaders?: () => Promise<{
        /** Headers to send with verify requests. */
        verify: Record<string, string>;

        /** Headers to send with settle requests. */
        settle: Record<string, string>;

        /** Headers to send with supported-schemes requests. */
        supported: Record<string, string>;

        /** Headers to send with bazaar requests, if supported. */
        bazaar?: Record<string, string>;
    }>;
};

/**
 * A CAIP-2-style network identifier in the form `<namespace>:<reference>`,
 * e.g. `eip155:8453` (Base) or `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`.
 */
export type TNetwork = `${string}:${string}`;

/**
 * A fiat-style money value, either as a formatted string (e.g. "$1") or
 * a plain number.
 */
export type TMoney = string | number;

/** The price to charge: either fiat-style money or a specific asset amount. */
export type TPrice = TAssetAmount | TMoney;

/** The payment scheme for verifying and settling a payment. */
export type TScheme = "exact" | "upto" | "batch-settlement";

/**
 * A single network's payment terms, used when building the `accepts`
 * array for a route (one entry per network/payout combination).
 */
export type TNetworkPayment = {
    /** Payment scheme for this network entry; falls back to the route/config default. */
    scheme?: TScheme;

    /** Price for this network entry; falls back to the route/config default. */
    price?: TPrice;

    /** Network this payment terms entry applies to. */
    network: TNetwork;

    /** Address/account that should receive payment on this network. */
    payTo: string;

    /** Description for this network entry; falls back to the route/config default. */
    description?: string;

    /** Response MIME type for this network entry; falls back to the route/config default. */
    mimeType?: string;
};

/**
 * Per-route payment configuration passed to X402Builder.setRoutePayment()
 * / X402.setRoutePayment(). Supports either a single network shorthand
 * (network + payTo) or an explicit multi-network `accepts` list.
 */
export type TRoutePayment = {
    /** Payment scheme for the route; falls back to the config default. */
    scheme?: TScheme;

    /** Price for the route; falls back to the config default. */
    price?: TPrice;

    /** Network for the single-network shorthand form. */
    network: TNetwork;

    /** Payout address/account for the single-network shorthand form. */
    payTo?: string;

    /** Description shown for the payment requirement. */
    description?: string;

    /** Response MIME type used for payment responses. */
    mimeType?: string;

    /** Explicit multi-network payment terms; overrides the single-network shorthand fields. */
    accepts?: Array<TNetworkPayment>;
};
