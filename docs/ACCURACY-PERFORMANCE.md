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
