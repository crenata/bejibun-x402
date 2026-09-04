# Benchmarks

Speed comparison: baseline (previously published npm release `@bejibun/x402@0.2.11`) vs the optimized `@bejibun/x402` in this repo.

## Running

```bash
# Run all benchmarks (installs baseline from npm first)
bun run bench

# Or run individually (after install-deps)
bun run install-deps
bun run coldstart
bun run throughput
```

## Cold Start

Measures package import time by spawning fresh OS processes. Two metrics:

- **Full process time** — spawn → exit (includes Bun boot time)
- **Import** — measured inside the process, isolates the package's own import cost

<!-- BENCHMARK:COLDSTART:START -->

|                             | baseline | optimized | speedup   |
| --------------------------- | -------- | --------- | --------- |
| Full process (spawn → exit) | 134.8ms  | 132.3ms   | **1.02x** |
| Import                      | 122.4ms  | 119.6ms   | **1.02x** |

<!-- BENCHMARK:COLDSTART:END -->

## Throughput

The CPU-bound hot paths touched on every request, measured without hitting a facilitator. `construction` covers `new X402Builder()` plus config resolution. `bunAdapter` covers the per-request header/path/query lookups. `facade setRoutePayment` covers the facade entry point. 20,000 calls each, median of 9 runs.

<!-- BENCHMARK:THROUGHPUT:START -->

| Method                   | baseline (0.2.11) | optimized | speedup    | baseline ops/s | optimized ops/s |
| ------------------------ | ----------------- | --------- | ---------- | -------------- | --------------- |
| `construction`           | 33.1ms            | 1.0ms     | **32.65x** | 603,572/s      | 19,706,142/s    |
| `bunAdapter`             | 15.7ms            | 14.6ms    | **1.08x**  | 1,273,652/s    | 1,372,460/s     |
| `facade setRoutePayment` | 38.0ms            | 1.0ms     | **36.88x** | 526,862/s      | 19,432,531/s    |

<!-- BENCHMARK:THROUGHPUT:END -->
