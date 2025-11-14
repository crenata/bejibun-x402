import type {TX402Config} from "@/builders/X402Builder";
import type {FacilitatorConfig as TFacilitator, PaywallConfig as TPaywall} from "x402/types";
import X402Builder from "@/builders/X402Builder";

export type {TFacilitator, TPaywall, TX402Config};

export default class X402 {
    public static setConfig(config?: TX402Config): X402Builder {
        return new X402Builder().setConfig(config);
    }

    public static setFacilitator(config?: TFacilitator): X402Builder {
        return new X402Builder().setFacilitator(config);
    }

    public static setPaywall(config?: TPaywall): X402Builder {
        return new X402Builder().setPaywall(config);
    }

    public static setRequest(config: Bun.BunRequest): X402Builder {
        return new X402Builder().setRequest(config);
    }
}