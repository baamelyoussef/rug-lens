# Accuracy and scan performance

Correct parsing and responsive scanning are necessary for useful analysis. They do not establish profitable entries, calibrated rug probabilities or predictive superiority.

## Evidence integrity

- **Pool classification:** report holders with large supply are checked against supported on-chain pool layouts. Program owner, discriminator and matching base mint must agree before exclusion. Unsupported program accounts remain unresolved.
- **Selected-pool scope:** provider LP, liquidity or concentration warnings without adequate scope remain unscored notes. A small secondary pool must not silently replace the selected pool's evidence.
- **Identity and age:** cached evidence must match the current mint, market and relevant lifecycle. Stale observations and material conflicts cannot produce a clean baseline.
- **Direct fallback:** supported mint controls can be read from program-validated accounts when reports fail. Unrecognized Token-2022 fields remain unknown.
- **Curve semantics:** supported Pump curves retain quote-mint identity and exact raw reserves. A custom quote asset is not treated as SOL. A complete curve alone does not establish an active destination AMM.

Decision and coverage rules are in [ANALYSIS.md](ANALYSIS.md). The current stage-specific curve policy is in [STAGE-POLICY.md](STAGE-POLICY.md); gross reserve stress is not a live sell quote.

## Request efficiency

Contract and market results arrive independently. DEX lookups coalesce compatible token requests, group responses by exact Solana mint and use an exact selected-pair fallback when necessary. The documented endpoint permits up to 30 token addresses per request. [DEX Screener reference](https://docs.dexscreener.com/api/reference)

Compatible direct-account work shares a short batching window, preserving requested order, encoding and slices within Solana's 100-account limit. Holder verification and curve reads have bounded response budgets; late valid replies can warm a later scan. [Solana getMultipleAccounts](https://solana.com/docs/rpc/http/getmultipleaccounts)

Selected coins come first, followed by New Pairs, Final Stretch and Migrated. An aged-card slot retains lower-priority progress. Failed provider parts retry independently with backoff, rate limits retain cooldowns and request deadlines release hung slots. Quiet pages wake for pending work. A failure never becomes a passed check.

Healthy provider refresh is scheduled before the 30-second stale threshold, using original observation times. Public providers may still lag or rate limit, and a freshly fetched indexed report is not necessarily a fresh chain observation. No universal scan-latency guarantee is claimed.

## Prospective evaluation

The local journal keeps a bounded set of observations, reasons, versions, sources, coverage gaps and verification evidence. It is not a complete market archive. No independently verified rug outcomes, fills or future returns are recorded automatically.

A useful evaluation must specify its token cohort, sampling schedule and outcome definitions in advance. Include unverified tokens and launches that never migrate. Measure coverage, latency, false severe warnings, missed independently evidenced adverse events and exit conditions separately for each lifecycle. Avoid treating the same report provider as both the predictor and independent ground truth.

Code tests establish behavior on specified inputs. A hand-picked set of migrated winners cannot establish prediction accuracy. The 0.6.0 flow and matched-holder observations remain unscored until suitable evidence supports their use in the decision policy.


## 0.6.1 browser workload

Provider completions update only the affected record. Full mutation-driven DOM scans are coalesced to at most once per second; periodic five-second freshness checks, navigation, explicit refresh and provider completion are separate paths. Hidden tabs stop DOM scans and new request dispatch; already dispatched requests may finish. Visibility restoration refreshes the page. Scanning priority remains selected coin, New Pairs, Final Stretch and Migrated, including rendered cards below the viewport.

Detail parsing builds one label index per scan. Trenches column discovery is cached within the scan, and all heading visibility reads precede badge insertion. All badges share one parsed stylesheet when constructable stylesheets are supported. The panel keeps its DOM when the displayed evidence is unchanged. No timing optimization treats missing or stale evidence as a passed check.

Page and holder timestamps measure when the displayed DOM was observed. They do not prove Terminal refreshed its feed: an unchanged or disconnected page can be reread. API fetch timestamps likewise do not establish indexing freshness.

A local synthetic 30-card benchmark against commit `5cb7837` used mocked providers and ten warmed runs. Initial engine evaluations fell from 300 to 38. Completing one contract response fell from 30 evaluations to one; median local response-processing time was 3.49 ms before and 0.34 ms after on the development machine. These figures measure this code path, not browser-wide CPU, frame rate, RPC latency or end-to-end live scanning speed. Regression tests assert the work reduction without hardware-dependent timing limits.


## 0.6.2 request scheduling

Provider queue dispatch is independent of DOM scans. A completed coin immediately frees a slot for the next already-discovered card. Refresh/retry timers operate on attached records without rereading the page or renewing DOM observation timestamps. The existing eight-coin concurrency budget, stage order, aged-card fairness, request deadlines and provider cooldowns remain. Removed cards and navigation cannot launch background work from an obsolete queue; hidden or disabled tabs suspend dispatch.

The initial feed paint scores each card once. The final provider part and the settled loading state share a single score update, while an earlier partial result remains visible immediately.

Run `node scripts/benchmark-feed.mjs` from a full Git checkout to compare against 0.6.1 (`7f78aa0`). The deterministic scenario has 30 cards, two mocked 200 ms provider responses per coin, eight coin slots, and no page mutations. Completion time on its simulated clock fell from 3,200 ms to 800 ms; full DOM scans from four to one; total engine evaluations from 240 to 112; initial evaluations from 38 to 30. Both versions issue exactly 60 requests. These numbers isolate scheduler delay and work counts; they are not measured live network latency, browser frame rate or a fourfold real-world speed guarantee.


## 0.6.3 Terminal rendering priority

Network fetching already runs in the extension service worker. DOM observation and badge rendering necessarily share the page's main thread, so this release uses cooperative browser idle scheduling rather than claiming complete isolation.

Automatic DOM scans, provider queue dispatch, scoring and badge paints wait until `document.readyState` is complete and the 1.5-second startup grace has elapsed. Background work uses `requestIdleCallback` with no forcing timeout; a busy frame with less than 5 ms idle budget is skipped. Each slice starts at most two jobs and stops starting jobs after 4 ms, then yields at least 16 ms. A single DOM parse or score cannot be preempted mid-function and may exceed that budget; this is not a hard execution-time cap. Pending work for the same record coalesces.

Page input and scrolling defer background work until 350 ms of quiet; navigation clears obsolete queued work and gives the next page a 700 ms grace. Mutation-driven scans are limited to once per two seconds. Once a scan is queued, subsequent mutation notifications skip per-target DOM walks until it runs. Hidden/disabled tabs cancel queued page work. Opening or closing the evidence panel remains an explicit interactive action. Already-running provider requests may finish, but automatic follow-up dispatch and rendering wait for idle time. Lifecycle order, provider cooldowns and missing/stale-evidence rules are unchanged.

During sustained page activity analysis may be delayed. That is intentional: chart and Terminal interactions have priority. This does not prove zero chart-loading impact, and page completion alone does not establish that an asynchronously loaded chart is ready. Browser idle budgets and interaction deferral provide the continuing protection. Scheduler tests cover busy frames, startup/loading, input, cancellation, work coalescing and sliced painting. The request benchmark bypasses idle scheduling to isolate queue behavior; its 0.6.2 numbers must not be read as 0.6.3 end-to-end latency.
