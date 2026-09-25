# Architecture

Rug Lens is a Manifest V3 Chrome extension with plain JavaScript runtime code. There is no bundler or required server. Development uses Node.js for tests and Python for packaging/demo serving.

## Runtime

| Area | Files | Responsibility |
|---|---|---|
| Page adapter | `adapter.js` | Parse supported rendered Terminal fields, bind token identity and recognize lifecycle context. |
| Page coordinator | `content.js` | Maintain per-market observations, schedule scans, merge source data and update badges/panel. |
| Analysis | `engine.js`, `activity.js`, `signals.js` | Evaluate explainable rules, summarize bounded observations and present local session changes. |
| UI | `ui.js`, `popup.*` | Accessible compact panel, drag/scroll behavior, preferences and journal export. |
| Provider worker | `background.js`, `providers.js` | Fetch, normalize and cache report/market evidence while retaining identity and errors. |
| Scheduling | `request-queue.js`, `market-batch.js`, `account-batch.js` | Bound request rates and coalesce compatible work without mixing result scope. |
| Account verification | `provider-verification.js`, `pool-resolution.js`, `contract-fallback.js` | Identify supported pool layouts and direct mint controls; preserve unsupported states. |
| Launch curves | `pump-curve.js`, `curve-scan.js` | Derive and verify supported Pump accounts and preserve exact raw reserve/quote information. |
| Optional links | `chain-scan.js`, `chain.js` | Fetch bounded recent transactions and decode specific linkage evidence. |
| Local journal | `journal.js` | Store bounded evidence snapshots for later review. |

Paths above are relative to `extension/`. Content-script modules expose small browser globals; service-worker modules use ES modules. External text is rendered as text rather than injected HTML.

## Evidence pipeline

1. Identify the coin from its own mint control and the selected route/pool. Do not borrow another card's stage or a quote token's address.
2. Read supported visible fields. Dispatch independent contract and market lookups when enrichment is enabled.
3. Validate identities, data types, supported program layouts and source age. Missing or conflicting evidence remains explicit.
4. Apply the current lifecycle policy and compute one explainable analysis result for the UI.
5. Keep short-lived observations in memory and save bounded journal snapshots when findings or coverage change, or on the periodic baseline interval (one minute with live observations, otherwise five minutes).

No fetch success is a claim of chain freshness. A cached timestamp retains its original observation time. Source conflicts cannot silently produce a clean baseline.

## Scheduling and recovery

The queue prioritizes **selected coin → New Pairs → Final Stretch → Migrated**, with a bounded aged-card slot to avoid starvation. Rendered cards below the viewport can be scanned; unrendered virtualized content is unavailable.

Contract and market work complete independently. Compatible DEX token requests batch up to 30 mints; direct account reads batch without crossing encoding/slice boundaries. Concurrency, network timeouts, retry delays and rate-limit cooldowns bound work. Refresh joins in-flight work instead of duplicating it. Late verified results can warm later observations without changing the original result's provenance.

Source/layout failures should degrade coverage, not invent values or indefinitely hold unrelated evidence. Exact policies are covered by tests and [accuracy/performance notes](ACCURACY-PERFORMANCE.md).

## Development and releases

`tests/` contains unit and integration-style DOM tests; `tests/data/` contains curated public account fixtures. Tests run offline against controlled inputs. The simulated `demo/` exercises the real engine and panel without trading.

`npm run check` checks JavaScript syntax and required manifest resources. `scripts/package.py` uses explicit runtime/document allowlists, rejects symlink inputs and produces generic and versioned ZIPs containing a loadable `rug-lens/` directory. It does not copy the repository, local audit captures or dependencies wholesale.

GitHub Actions runs Node.js 22 tests/checks and Python packaging with read-only repository permissions. The workflow does not publish releases, deploy services or access trading credentials. Changes to permissions, providers, data retention or risk-score policy need corresponding documentation and review.
