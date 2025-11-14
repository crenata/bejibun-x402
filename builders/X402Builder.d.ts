import { ERC20TokenAmount, FacilitatorConfig, PaymentPayload, PaymentRequirements, PaywallConfig, SPLTokenAmount } from "x402/types";
export type TX402Config = {
    customPaywallHtml?: string;
    description?: string;
    discoverable?: boolean;
    mimeType?: string;
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
};
export type TFacilitator = {
    verify: (payload: any, paymentRequirements: any) => Promise<any>;
    settle: (payload: any, paymentRequirements: any) => Promise<any>;
    supported: () => Promise<any>;
    list: (config?: any) => Promise<any>;
};
export type TToken = {
    maxAmountRequired: string;
    asset?: ERC20TokenAmount["asset"] | SPLTokenAmount["asset"];
};
export default class X402Builder {
    protected conf: Record<string, any>;
    protected facilitatorConfig?: FacilitatorConfig;
    protected payloadConfig?: TX402Config;
    protected paymentRequirements: Array<PaymentRequirements>;
    protected paywallConfig?: PaywallConfig;
    protected request?: Bun.BunRequest;
    protected decoded?: PaymentPayload;
    protected token?: TToken;
    constructor();
    private get config();
    private get facilitator();
    private initToken;
    private requirements;
    private get payment();
    private decode;
    private get selectedPayment();
    private verify;
    private settle;
    setConfig(config?: TX402Config): X402Builder;
    setFacilitator(config?: FacilitatorConfig): X402Builder;
    setPaywall(config?: PaywallConfig): X402Builder;
    setRequest(request: Bun.BunRequest): X402Builder;
    middleware(handler: Function): Promise<any>;
}
