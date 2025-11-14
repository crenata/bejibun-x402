import App from "@bejibun/app";
import {defineValue, isEmpty, isNotEmpty} from "@bejibun/utils";
import fs from "fs";
import {getAddress} from "viem";
import {getPaywallHtml} from "x402/paywall";
import {exact} from "x402/schemes";
import {
    findMatchingPaymentRequirements,
    processPriceToAtomicAmount,
    toJsonSafe
} from "x402/shared";
import {
    ERC20TokenAmount,
    FacilitatorConfig,
    moneySchema,
    PaymentPayload,
    PaymentRequirements,
    PaywallConfig,
    SPLTokenAmount,
    settleResponseHeader,
    SupportedEVMNetworks,
    SupportedSVMNetworks
} from "x402/types";
import {useFacilitator} from "x402/verify";
import X402Config from "@/config/x402";
import X402Exception from "@/exceptions/X402Exception";

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
    protected payloadConfig?: TX402Config = {};
    protected paymentRequirements: Array<PaymentRequirements> = [];
    protected paywallConfig?: PaywallConfig = {};
    protected request?: Bun.BunRequest;
    protected decoded?: PaymentPayload;
    protected token?: TToken;

    public constructor() {
        const configPath = App.Path.configPath("x402.ts");

        let config: any;

        if (fs.existsSync(configPath)) config = require(configPath).default;
        else config = X402Config;

        this.conf = config;
    }

    private get config(): Record<string, any> {
        if (isEmpty(this.conf)) throw new X402Exception("There is no config provided.");

        return this.conf;
    }

    private get facilitator(): TFacilitator {
        return useFacilitator(this.facilitatorConfig);
    }

    private initToken(): TToken {
        const atomicAmountForAsset = processPriceToAtomicAmount(this.config.price, this.config.network);
        if ("error" in atomicAmountForAsset) throw new X402Exception(atomicAmountForAsset.error);

        this.token = atomicAmountForAsset;

        return this.token;
    }

    private async requirements(): Promise<Array<PaymentRequirements>> {
        if (SupportedEVMNetworks.includes(this.config.network)) {
            this.paymentRequirements.push({
                scheme: "exact",
                network: this.config.network,
                maxAmountRequired: (this.token as TToken).maxAmountRequired,
                resource: defineValue(this.request?.url, ""),
                description: defineValue(this.payloadConfig?.description, ""),
                mimeType: defineValue(this.payloadConfig?.mimeType, ""),
                payTo: getAddress(this.config.address),
                maxTimeoutSeconds: defineValue(this.config.timeout, 60),
                asset: getAddress(defineValue(this.token?.asset?.address)),
                outputSchema: {
                    input: {
                        type: "http",
                        method: defineValue(this.request?.method, ""),
                        discoverable: defineValue(this.payloadConfig?.discoverable, true),
                        ...defineValue(this.payloadConfig?.inputSchema, {})
                    },
                    output: defineValue(this.payloadConfig?.outputSchema, {})
                },
                extra: (this.token?.asset as ERC20TokenAmount["asset"]).eip712
            });
        } else if (SupportedSVMNetworks.includes(this.config.network)) {
            const paymentKinds = await this.facilitator.supported();

            let feePayer: string | undefined;
            for (const kind of paymentKinds.kinds) {
                if (kind.network === this.config.network && kind.scheme === "exact") {
                    feePayer = defineValue(kind?.extra?.feePayer);
                    break;
                }
            }

            if (isEmpty(feePayer)) throw new X402Exception(`The facilitator did not provide a fee payer for network: ${this.config.network}.`);

            this.paymentRequirements.push({
                scheme: "exact",
                network: this.config.network,
                maxAmountRequired: (this.token as TToken).maxAmountRequired,
                resource: defineValue(this.request?.url, ""),
                description: defineValue(this.payloadConfig?.description, ""),
                mimeType: defineValue(this.payloadConfig?.mimeType, ""),
                payTo: this.config.address,
                maxTimeoutSeconds: defineValue(this.config.timeout, 60),
                asset: defineValue(this.token?.asset?.address),
                outputSchema: {
                    input: {
                        type: "http",
                        method: defineValue(this.request?.method, ""),
                        discoverable: defineValue(this.payloadConfig?.discoverable, true),
                        ...defineValue(this.payloadConfig?.inputSchema, {})
                    },
                    output: defineValue(this.payloadConfig?.outputSchema, {})
                },
                extra: {
                    feePayer: feePayer
                }
            });
        } else {
            throw new X402Exception(`Unsupported network: ${this.config.network}`);
        }

        return this.paymentRequirements;
    }

    private get payment(): string {
        const payment = defineValue(this.request?.headers?.get("X-PAYMENT"));
        const userAgent = defineValue(this.request?.headers?.get("User-Agent"), "");
        const acceptHeader = defineValue(this.request?.headers?.get("Accept"), "");
        const isWebBrowser = acceptHeader.includes("text/html") && userAgent.includes("Mozilla");

        if (isEmpty(payment)) {
            if (isWebBrowser && !this.config.forceJson) {
                let displayAmount: number;
                if (typeof this.config.price === "string" || typeof this.config.price === "number") {
                    const parsed = moneySchema.safeParse(this.config.price);
                    if (parsed.success) displayAmount = parsed.data;
                    else displayAmount = Number.NaN;
                } else {
                    displayAmount = Number(this.config.price.amount) / 10 ** this.config.price.asset.decimals;
                }

                const html = defineValue(this.payloadConfig?.customPaywallHtml, getPaywallHtml({
                    amount: displayAmount,
                    paymentRequirements: toJsonSafe(this.paymentRequirements) as Parameters<typeof getPaywallHtml>[0]["paymentRequirements"],
                    currentUrl: defineValue(this.request?.url, ""),
                    testnet: defineValue(this.config.testnet, true),
                    cdpClientKey: defineValue(this.paywallConfig?.cdpClientKey),
                    appName: defineValue(this.paywallConfig?.appName),
                    appLogo: defineValue(this.paywallConfig?.appLogo),
                    sessionTokenEndpoint: defineValue(this.paywallConfig?.sessionTokenEndpoint)
                }));

                throw new X402Exception("The X-PAYMENT header is required.", {
                    x402Version: this.config.version,
                    accepts: toJsonSafe(this.paymentRequirements),
                    html: html
                });
            }

            throw new X402Exception("The X-PAYMENT header is required.", {
                x402Version: this.config.version,
                accepts: toJsonSafe(this.paymentRequirements)
            });
        }

        return payment;
    }

    private decode(): PaymentPayload {
        const payment: string = this.payment;

        try {
            this.decoded = exact.evm.decodePayment(payment);
            this.decoded.x402Version = this.config.version;
        } catch (error: any) {
            throw new X402Exception(defineValue(error?.message, "Invalid or mailformed payment header."), {
                x402Version: this.config.version,
                accepts: toJsonSafe(this.paymentRequirements)
            });
        }

        return this.decoded;
    }

    private get selectedPayment(): any {
        const selectedPaymentRequirements = findMatchingPaymentRequirements(this.paymentRequirements, this.decoded as PaymentPayload);
        if (isEmpty(selectedPaymentRequirements)) {
            throw new X402Exception("Unable to find matching payment requirements.", {
                x402Version: this.config.version,
                accepts: toJsonSafe(this.paymentRequirements)
            });
        }

        return selectedPaymentRequirements;
    }

    private async verify(): Promise<void> {
        this.initToken();

        await this.requirements();

        this.decode();

        let response: any;
        try {
            response = await this.facilitator.verify(this.decoded, this.selectedPayment);
        } catch (error: any) {
            throw new X402Exception(defineValue(error?.message, "Failed to verify payment."), {
                x402Version: this.config.version,
                accepts: toJsonSafe(this.paymentRequirements)
            });
        }

        if (!response.isValid) {
            throw new X402Exception("Unable to find matching payment requirements.", {
                x402Version: this.config.version,
                accepts: toJsonSafe(this.paymentRequirements),
                payer: response.payer
            });
        }
    }

    private async settle(): Promise<void> {
        await this.verify();

        let settleResponse: any;
        try {
            settleResponse = await this.facilitator.settle(this.decoded, this.selectedPayment);
            const responseHeader = settleResponseHeader(settleResponse);
            this.request?.headers?.set("X-PAYMENT-RESPONSE", responseHeader);
        } catch (error: any) {
            throw new X402Exception(defineValue(error?.message, "Failed to settle payment."), {
                x402Version: this.config.version,
                accepts: toJsonSafe(this.paymentRequirements)
            });
        }

        if (!settleResponse.success) {
            throw new X402Exception(settleResponse.errorReason, {
                x402Version: this.config.version,
                accepts: toJsonSafe(this.paymentRequirements)
            });
        }
    }

    public setConfig(config?: TX402Config): X402Builder {
        this.payloadConfig = config;

        return this;
    }

    public setFacilitator(config?: FacilitatorConfig): X402Builder {
        this.facilitatorConfig = config;

        return this;
    }

    public setPaywall(config?: PaywallConfig): X402Builder {
        this.paywallConfig = config;

        return this;
    }

    public setRequest(request: Bun.BunRequest): X402Builder {
        this.request = request;

        return this;
    }

    public async middleware(handler: Function): Promise<any> {
        try {
            await this.settle();

            return handler();
        } catch (error: any) {
            if (isNotEmpty(error?.data?.html)) return new Response((error as X402Exception).data.html, {
                headers: {
                    "Content-Type": "text/html"
                }
            });

            throw error;
        }
    }
}