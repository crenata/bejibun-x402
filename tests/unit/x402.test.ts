import {
    afterEach,
    beforeEach,
    describe,
    expect,
    mock,
    test
} from "bun:test";
import BunAdapter from "../../src/builders/BunAdapter";
import X402Builder from "../../src/builders/X402Builder";
import X402Exception from "../../src/exceptions/X402Exception";
import X402 from "../../src/facades/X402";

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

function makeRequest(url = "https://example.com/api/foo?a=1&b=2", method = "post") {
    return {
        url,
        method,
        headers: new Headers({
            accept: "application/json",
            "user-agent": "bun-test",
            "x-custom": "custom-value"
        })
    } as unknown as Bun.BunRequest;
}

describe("X402Exception", () => {
    test("defaults to a 502 status code", () => {
        const err = new X402Exception("boom");

        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe("X402Exception");
        expect(err.message).toBe("boom");
        expect(err.code).toBe(502);
    });

    test("accepts a custom status code and data", () => {
        const err = new X402Exception("forbidden", {reason: "nope"}, 403);

        expect(err.code).toBe(403);
        expect(err.data).toEqual({reason: "nope"});
    });
});

describe("X402 facade", () => {
    test("setFacilitator returns an X402Builder", () => {
        expect(X402.setFacilitator()).toBeInstanceOf(X402Builder);
    });

    test("setRoutePayment returns an X402Builder", () => {
        expect(X402.setRoutePayment({network: "eip155:8453", payTo: "0xabc"})).toBeInstanceOf(
            X402Builder
        );
    });

    test("setRequest returns an X402Builder", () => {
        expect(X402.setRequest(makeRequest())).toBeInstanceOf(X402Builder);
    });
});

describe("X402Builder", () => {
    test("setFacilitator returns this for chaining", () => {
        const builder = new X402Builder();

        expect(builder.setFacilitator()).toBe(builder);
    });

    test("setRoutePayment returns this for chaining", () => {
        const builder = new X402Builder();

        expect(builder.setRoutePayment({network: "eip155:8453"})).toBe(builder);
    });

    test("setRequest returns this for chaining", () => {
        const builder = new X402Builder();

        expect(builder.setRequest(makeRequest())).toBe(builder);
    });

    test("middleware throws when setRequest was not called first", async () => {
        const builder = new X402Builder();

        const error: any = await builder.middleware(async () => new Response("ok")).catch((e) => e);

        expect(error).toBeInstanceOf(X402Exception);
        expect(error.message).toBe("setRequest() must be called before middleware().");
    });
});

describe("BunAdapter", () => {
    test("getMethod returns the upper-cased method", () => {
        const adapter = new BunAdapter(makeRequest());

        expect(adapter.getMethod()).toBe("POST");
    });

    test("getPath returns the URL pathname", () => {
        const adapter = new BunAdapter(makeRequest());

        expect(adapter.getPath()).toBe("/api/foo");
    });

    test("getUrl returns the full URL", () => {
        const adapter = new BunAdapter(makeRequest());

        expect(adapter.getUrl()).toBe("https://example.com/api/foo?a=1&b=2");
    });

    test("getHeader returns the value or undefined when missing", () => {
        const adapter = new BunAdapter(makeRequest());

        expect(adapter.getHeader("x-custom")).toBe("custom-value");
        expect(adapter.getHeader("nope")).toBeUndefined();
    });

    test("getAcceptHeader and getUserAgent fall back to empty string", () => {
        const adapter = new BunAdapter(makeRequest());

        expect(adapter.getAcceptHeader()).toBe("application/json");
        expect(adapter.getUserAgent()).toBe("bun-test");
    });

    test("getQueryParam and getQueryParams read the query string", () => {
        const adapter = new BunAdapter(makeRequest());

        expect(adapter.getQueryParam("a")).toBe("1");
        expect(adapter.getQueryParam("missing")).toBeUndefined();
        expect(adapter.getQueryParams()).toEqual({a: "1", b: "2"});
    });
});
