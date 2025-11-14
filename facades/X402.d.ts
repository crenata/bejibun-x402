import type { TX402Config } from "../builders/X402Builder";
import type { FacilitatorConfig as TFacilitator, PaywallConfig as TPaywall } from "x402/types";
import X402Builder from "../builders/X402Builder";
export type { TFacilitator, TPaywall, TX402Config };
export default class X402 {
    static setConfig(config?: TX402Config): X402Builder;
    static setFacilitator(config?: TFacilitator): X402Builder;
    static setPaywall(config?: TPaywall): X402Builder;
    static setRequest(config: Bun.BunRequest): X402Builder;
}
