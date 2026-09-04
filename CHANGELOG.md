# Changelog
All notable changes to this project will be documented in this file.

---

## [v0.2.12](https://github.com/Bejibun-Framework/bejibun-x402/compare/v0.2.11...v0.2.12) - 2026-09-04

### 🩹 Fixes

### 📖 Changes
#### `X402Builder` performance
Reworked per-request work in `X402Builder` into process-level caches, since a new builder is constructed for every request:
- App config (`config/x402.ts` or the package default) is now resolved once per process and reused, instead of hitting the filesystem and `require`-ing the config file on every request
- The route's `accepts` array is now memoized -- keyed per `routePaymentConfig` object reference via a `WeakMap`, or cached once for the default (no per-route override) case -- so it's no longer rebuilt and `JSON.stringify`'d on every request, including on cache-hit requests where it previously ran before the server-cache lookup happened
- The `x402HTTPResourceServer` cache key now reuses the pre-computed `accepts` JSON key instead of recomputing `JSON.stringify(this.accepts)` per request

#### Documentation
- Added JSDoc comments across `X402Builder`, `BunAdapter`, `X402` facade, `X402Exception`, config, `configure.ts`, and the `x402` type definitions
- Re-exported the `X402Exception` classes from the package root (`@/exceptions/index`) for consistency with the cache, limiter, and storage entry points

#### Micro-optimizations
- Replaced the `@bejibun/utils` `defineValue`/`isEmpty`/`isNotEmpty` calls with native nullish coalescing (`??`) and truthiness checks across `X402Builder`, `BunAdapter`, and `X402Exception`, removing the type-checking overhead from the per-request hot paths (scheme/price/description/mimeType/facilitator getters, adapter header/query lookups, and exception construction)

### 🧪 Tests
- Added unit test suite (15 tests across 1 file in `tests/unit`) covering `X402Exception` (default/custom status code and data), the `X402` facade (delegation to `X402Builder`), `X402Builder` chaining and the `middleware` setRequest guard, and `BunAdapter` (method/path/url/header/query handling), with silenced logger output
- Added an integration test suite (4 tests across 1 file in `tests/integration`) that imports the real package entry and verifies the default/named `X402` export, the `X402Exception` re-export, builder construction, and config resolution without error
- Added `test` (unit) and `test:integration` scripts and added `tests` to tsconfig `exclude` so compiled output never lands in `tests/`

### ⚡ Benchmarks
- Added benchmark suite comparing baseline (`@bejibun/x402@0.2.11`) vs the optimized build, covering `construction`, `bunAdapter`, and `facade setRoutePayment` CPU-bound hot paths (no facilitator I/O); full results are written to `benchmarks/README.md` between the `BENCHMARK` markers
- Also added a cold-start suite spawning 30 fresh OS processes per variant and measuring full process time and import time
- Throughput results: `construction` **33.12x** (38.7 vs 1.2ms, ~17.1M ops/s), `facade setRoutePayment` **34.34x** (43.6 vs 1.3ms, ~15.8M ops/s), `bunAdapter` ~1.01x (18.0 vs 17.8ms); cold start ~1.0x

### 📦 Dependencies

- Bumped [`@bejibun/app`](https://github.com/Bejibun-Framework/bejibun-app) from `^0.1.25` to `^0.1.26`
- Bumped [`@bejibun/logger`](https://github.com/Bejibun-Framework/bejibun-logger) from `^0.1.23` to `^0.2.1`
- Bumped [`@bejibun/utils`](https://github.com/Bejibun-Framework/bejibun-utils) from `^0.1.29` to `^0.1.30`
- Bumped `@x402/core` from `^2.23.0` to `^2.25.0`
- Bumped `@x402/evm` from `^2.23.0` to `^2.25.0`
- Bumped `@x402/svm` from `^2.23.0` to `^2.25.0`
- Bumped `eslint` (devDependency) from `^10.9.0` to `^10.9.1`
- Bumped `globals` (devDependency) from `^17.11.0` to `^17.12.0`
- Bumped `tsc-alias` (devDependency) from `^1.9.2` to `^1.9.4`
- Bumped `typescript-eslint` (devDependency) from `^8.67.0` to `^8.69.0`

### ❤️Contributors
- Havea Crenata ([@crenata](https://github.com/crenata))

**Full Changelog**: https://github.com/Bejibun-Framework/bejibun-x402/blob/master/CHANGELOG.md

---

## [v0.2.11](https://github.com/Bejibun-Framework/bejibun-x402/compare/v0.2.0...v0.2.11) - 2026-08-20

### 🩹 Fixes

### 📖 Changes
#### Tooling
- Added `prettier` + `.prettierrc.json` / `.prettierignore` and an `eslint.config.js` (flat config, `typescript-eslint`) for consistent formatting/linting across `src`
- Added `bun run format`, `bun run eslint`, and `bun run lint` scripts; `bun run build` now runs `lint` before compiling
- `alias` script now runs `tsc-alias` directly instead of via `bunx`

### 📦 Dependencies

- Bumped [`@bejibun/app`](https://github.com/Bejibun-Framework/bejibun-app) from `^0.1.24` to `^0.1.25`
- Bumped [`@bejibun/logger`](https://github.com/Bejibun-Framework/bejibun-logger) from `^0.1.22` to `^0.1.23`
- Bumped [`@bejibun/utils`](https://github.com/Bejibun-Framework/bejibun-utils) from `^0.1.28` to `^0.1.29`
- Bumped `@x402/core` from `^2.20.0` to `^2.23.0`
- Bumped `@x402/evm` from `^2.20.0` to `^2.23.0`
- Bumped `@x402/svm` from `^2.20.0` to `^2.23.0`
- Bumped `tsc-alias` (devDependency) from `^1.9.1` to `^1.9.2`
- Added `@eslint/js` (devDependency) `^10.0.1`
- Added `eslint` (devDependency) `^10.8.1`
- Added `eslint-config-prettier` (devDependency) `^10.1.8`
- Added `globals` (devDependency) `^17.11.0`
- Added `prettier` (devDependency) `^3.9.6`
- Added `typescript` (devDependency) `^6.0.3`
- Added `typescript-eslint` (devDependency) `^8.67.0`

### ❤️Contributors
- Havea Crenata ([@crenata](https://github.com/crenata))

**Full Changelog**: https://github.com/Bejibun-Framework/bejibun-x402/blob/master/CHANGELOG.md

---

## [v0.2.0](https://github.com/Bejibun-Framework/bejibun-x402/compare/v0.1.0...v0.2.0) - 2026-07-03

### 🩹 Fixes
- Initial release with EVM-only support and single-network routing.

### 📖 Changes
What's New:
- **Multi-network (EVM + SVM) support**: Routes now accept payment from both EVM (Base, etc.) and Solana networks simultaneously, matching `@x402/express` behaviour.
- `TNetworkPayment` type -- per-network entry with optional `scheme`, `price`, `network`, `payTo`, `description`, and `mimeType` overrides.
- `TRoutePayment` type -- replaces the old `TX402Config`; supports an `accepts` array for full multi-network control.
- `TScheme` type -- `"exact"` | `"upto"` | `"batch-settlement"`.
- `accepts` array field on `TRoutePayment` -- pass an explicit list of network entries for full control.
- `config.networks` array -- replaces the single `network` + `address` pair; supports both EVM and SVM entries project-wide.
- **`BunAdapter`** -- new class implementing `@x402/core HTTPAdapter` directly against `Bun.BunRequest`, handling headers, method, path, URL, query params, user-agent, and accept header.
- Scheme registration is now driven by the resolved `accepts` list; every unique network is registered exactly once (EVM registers `exact`, `upto`, and `batch-settlement`; SVM registers `exact`).
- `X402Builder` now maintains a **static server cache** (`_serverCache` + `_initPromises`) so each route's `x402HTTPResourceServer` is initialized only once across all requests, preventing duplicate SVM feePayer lookups.
- Payment flow delegates entirely to `@x402/core`'s `x402HTTPResourceServer.processHTTPRequest` and `processSettlement`, replacing the hand-rolled verify/settle/decode chain.
- CORS headers (`Access-Control-Allow-Origin: *`, `Access-Control-Expose-Headers: *`) are now attached to all 402 and settlement responses.
- Handler cancellation: if the route handler throws or returns a 4xx/5xx, `cancellationDispatcher.cancel()` is called before returning.
- Facilitator errors during settlement are caught and returned as `502` JSON responses instead of being re-thrown.
- `X402Exception` now defaults to error code `502` instead of `402`.

Changes:
- `config/x402.ts` no longer has a `version` field at all (the old `x402Version`/`version: 1` key is gone project-wide); it now ships with a flat `networks` array containing Base mainnet (`eip155:8453`) and Solana mainnet (`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`) entries instead of a single `network` + `address` + `testnet` block.
- Default scheme is `"exact"`.
- `X402Builder` resolves networks via a **4-level priority cascade**: explicit `accepts` array -> route single-network shorthand (`network` + `payTo`) -> config `networks` block -> built-in defaults (Base + Polygon + Arbitrum + World Chain for EVM; Solana mainnet for SVM).
- `setPaywall()` removed; replaced by `setRoutePayment(config?: TRoutePayment)`.
- `setConfig()` removed; per-route metadata (`description`, `mimeType`, `scheme`, `price`) are now fields on `TRoutePayment`.
- `setFacilitator()` now accepts `TFacilitator` (a plain `{ url?: string, createAuthHeaders?: () => Promise<...> }` object) instead of the old `FacilitatorConfig`; defaults to `@coinbase/x402` facilitator.
- `middleware()` return type tightened to `Promise<Response>`.
- Dependency `x402` replaced by `@coinbase/x402 ^2.1.0`, `@x402/core ^2.17.0`, `@x402/evm ^2.17.0`, and `@x402/svm ^2.17.0`.
- `src/types/` directory added; types are now exported from their own module instead of being inlined in builder files.
- Build script now includes a `types` step (`cp -rf src/types dist`) so type definitions are copied alongside compiled output.

### ❤️Contributors
- Havea Crenata ([@crenata](https://github.com/crenata))

**Full Changelog**: https://github.com/Bejibun-Framework/bejibun-x402/blob/master/CHANGELOG.md

---

## [v0.1.0](https://github.com/Bejibun-Framework/bejibun-x402/compare/v0.1.0...v0.1.0) - 2025-11-14

### 🩹 Fixes

### 📖 Changes
What's New:
- Adding x402 builder
- Adding x402 config
- Adding x402 exception
- Adding x402 facade

### ❤️Contributors
- Havea Crenata ([@crenata](https://github.com/crenata))

**Full Changelog**: https://github.com/Bejibun-Framework/bejibun-x402/blob/master/CHANGELOG.md