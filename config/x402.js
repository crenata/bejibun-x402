import { facilitator } from "@coinbase/x402";
/**
 * Default x402 configuration used when the consuming app doesn't provide
 * its own `config/x402.ts`. Defines the default payment scheme/price, the
 * networks (and payout addresses) accepted, and the payment facilitator.
 */
const config = {
    scheme: "exact",
    price: "$1",
    networks: [
        {
            network: "eip155:8453",
            payTo: "0xdABe8750061410D35cE52EB2a418c8cB004788B3"
        },
        {
            network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
            payTo: "GAnoyvy9p3QFyxikWDh9hA3fmSk2uiPLNWyQ579cckMn"
        }
    ],
    facilitator: facilitator
};
export default config;
