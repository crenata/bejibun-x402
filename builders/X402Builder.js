import App from "@bejibun/app";
import { defineValue, isEmpty, isNotEmpty } from "@bejibun/utils";
import fs from "fs";
import { getAddress } from "viem";
import { getPaywallHtml } from "x402/paywall";
import { exact } from "x402/schemes";
import { findMatchingPaymentRequirements, processPriceToAtomicAmount, toJsonSafe } from "x402/shared";
import { moneySchema, settleResponseHeader, SupportedEVMNetworks, SupportedSVMNetworks } from "x402/types";
import { useFacilitator } from "x402/verify";
import X402Config from "../config/x402";
import X402Exception from "../exceptions/X402Exception";
export default class X402Builder {
    conf;
    facilitatorConfig;
    payloadConfig = {};
    paymentRequirements = [];
    paywallConfig = {};
    request;
    decoded;
    token;
    constructor() {
        const configPath = App.Path.configPath("x402.ts");
        let config;
        if (fs.existsSync(configPath))
            config = require(configPath).default;
        else
            config = X402Config;
        this.conf = config;
    }
    get config() {
        if (isEmpty(this.conf))
            throw new X402Exception("There is no config provided.");
        return this.conf;
    }
    get facilitator() {
        return useFacilitator(this.facilitatorConfig);
    }
    initToken() {
        const atomicAmountForAsset = processPriceToAtomicAmount(this.config.price, this.config.network);
        if ("error" in atomicAmountForAsset)
            throw new X402Exception(atomicAmountForAsset.error);
        this.token = atomicAmountForAsset;
        return this.token;
    }
    async requirements() {
        if (SupportedEVMNetworks.includes(this.config.network)) {
            this.paymentRequirements.push({
                scheme: "exact",
                network: this.config.network,
                maxAmountRequired: this.token.maxAmountRequired,
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
                extra: (this.token?.asset).eip712
            });
        }
        else if (SupportedSVMNetworks.includes(this.config.network)) {
            const paymentKinds = await this.facilitator.supported();
            let feePayer;
            for (const kind of paymentKinds.kinds) {
                if (kind.network === this.config.network && kind.scheme === "exact") {
                    feePayer = defineValue(kind?.extra?.feePayer);
                    break;
                }
            }
            if (isEmpty(feePayer))
                throw new X402Exception(`The facilitator did not provide a fee payer for network: ${this.config.network}.`);
            this.paymentRequirements.push({
                scheme: "exact",
                network: this.config.network,
                maxAmountRequired: this.token.maxAmountRequired,
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
        }
        else {
            throw new X402Exception(`Unsupported network: ${this.config.network}`);
        }
        return this.paymentRequirements;
    }
    get payment() {
        const payment = defineValue(this.request?.headers?.get("X-PAYMENT"));
        const userAgent = defineValue(this.request?.headers?.get("User-Agent"), "");
        const acceptHeader = defineValue(this.request?.headers?.get("Accept"), "");
        const isWebBrowser = acceptHeader.includes("text/html") && userAgent.includes("Mozilla");
        if (isEmpty(payment)) {
            if (isWebBrowser && !this.config.forceJson) {
                let displayAmount;
                if (typeof this.config.price === "string" || typeof this.config.price === "number") {
                    const parsed = moneySchema.safeParse(this.config.price);
                    if (parsed.success)
                        displayAmount = parsed.data;
                    else
                        displayAmount = Number.NaN;
                }
                else {
                    displayAmount = Number(this.config.price.amount) / 10 ** this.config.price.asset.decimals;
                }
                const html = defineValue(this.payloadConfig?.customPaywallHtml, getPaywallHtml({
                    amount: displayAmount,
                    paymentRequirements: toJsonSafe(this.paymentRequirements),
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
    decode() {
        const payment = this.payment;
        try {
            this.decoded = exact.evm.decodePayment(payment);
            this.decoded.x402Version = this.config.version;
        }
        catch (error) {
            throw new X402Exception(defineValue(error?.message, "Invalid or mailformed payment header."), {
                x402Version: this.config.version,
                accepts: toJsonSafe(this.paymentRequirements)
            });
        }
        return this.decoded;
    }
    get selectedPayment() {
        const selectedPaymentRequirements = findMatchingPaymentRequirements(this.paymentRequirements, this.decoded);
        if (isEmpty(selectedPaymentRequirements)) {
            throw new X402Exception("Unable to find matching payment requirements.", {
                x402Version: this.config.version,
                accepts: toJsonSafe(this.paymentRequirements)
            });
        }
        return selectedPaymentRequirements;
    }
    async verify() {
        this.initToken();
        await this.requirements();
        this.decode();
        let response;
        try {
            response = await this.facilitator.verify(this.decoded, this.selectedPayment);
        }
        catch (error) {
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
    async settle() {
        await this.verify();
        let settleResponse;
        try {
            settleResponse = await this.facilitator.settle(this.decoded, this.selectedPayment);
            const responseHeader = settleResponseHeader(settleResponse);
            this.request?.headers?.set("X-PAYMENT-RESPONSE", responseHeader);
        }
        catch (error) {
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
    setConfig(config) {
        this.payloadConfig = config;
        return this;
    }
    setFacilitator(config) {
        this.facilitatorConfig = config;
        return this;
    }
    setPaywall(config) {
        this.paywallConfig = config;
        return this;
    }
    setRequest(request) {
        this.request = request;
        return this;
    }
    async middleware(handler) {
        try {
            await this.settle();
            return handler();
        }
        catch (error) {
            if (isNotEmpty(error?.data?.html))
                return new Response(error.data.html, {
                    headers: {
                        "Content-Type": "text/html"
                    }
                });
            throw error;
        }
    }
}
