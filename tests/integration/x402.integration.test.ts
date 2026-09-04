import {
    afterEach,
    beforeEach,
    describe,
    expect,
    mock,
    test
} from "bun:test";
import X402Builder from "../../src/builders/X402Builder";
import X402, {X402 as NamedX402, X402Exception} from "../../src/index";

const log = mock(console.log);
const error = mock(console.error);

beforeEach(() => {
    log.mockReset();
    error.mockReset();
    console.log = log;
    console.error = error;
});

afterEach(() => {
    console.log = console.log;
    console.error = console.error;
});

describe("x402 package entry", () => {
    test("default export is the X402 facade", () => {
        expect(X402).toBe(NamedX402);
    });

    test("X402Exception is re-exported and callable", () => {
        const err = new X402Exception("boom");

        expect(err).toBeInstanceOf(Error);
        expect(err.code).toBe(502);
    });

    test("X402 facade returns a builder bound to a request", () => {
        const request = {
            url: "https://example.com/paid",
            method: "get",
            headers: new Headers()
        } as unknown as Bun.BunRequest;

        const builder = X402.setRequest(request);

        expect(builder).toBeInstanceOf(X402Builder);
    });

    test("builder resolves config without throwing", () => {
        const builder = new X402Builder();

        // Constructing the builder resolves config/x402.ts (or the built-in
        // default); reaching the request check proves config load succeeded.
        expect(() => builder.setRoutePayment({network: "eip155:8453"})).not.toThrow();
    });
});
