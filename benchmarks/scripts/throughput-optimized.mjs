console.log = () => {};
console.error = () => {};

const {default: X402} = await import("../../src/facades/X402.ts");
const {default: X402Builder} = await import("../../src/builders/X402Builder.ts");
const {default: BunAdapter} = await import("../../src/builders/BunAdapter.ts");

const ITERATIONS = 20_000;
const WARMUP = 500;

const req = {
    url: "https://example.com/api/foo?a=1&b=2",
    method: "post",
    headers: new Headers({accept: "application/json", "user-agent": "bun", "x-custom": "v"})
};

const routeCfg = {
    network: "eip155:8453",
    payTo: "0xdABe8750061410D35cE52EB2a418c8cB004788B3"
};

const buildMs = measureConstruction();
const adapterMs = measureAdapter();
const facadeMs = measureFacade();

process.stdout.write(`${buildMs}|${adapterMs}|${facadeMs}\n`);

function measureConstruction() {
    for (let i = 0; i < WARMUP; i++) void new X402Builder();
    const t0 = performance.now();
    for (let i = 0; i < ITERATIONS; i++) void new X402Builder();
    return performance.now() - t0;
}

function measureAdapter() {
    for (let i = 0; i < WARMUP; i++) {
        const a = new BunAdapter(req);
        a.getHeader("x-custom");
        a.getPath();
        a.getQueryParam("a");
    }
    const t0 = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        const a = new BunAdapter(req);
        a.getHeader("x-custom");
        a.getPath();
        a.getQueryParam("a");
    }
    return performance.now() - t0;
}

function measureFacade() {
    for (let i = 0; i < WARMUP; i++) X402.setRoutePayment(routeCfg);
    const t0 = performance.now();
    for (let i = 0; i < ITERATIONS; i++) X402.setRoutePayment(routeCfg);
    return performance.now() - t0;
}
