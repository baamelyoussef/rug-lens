# Analysis and evidence boundaries

Rug Lens interprets available Terminal data and public reports. It is an overlay, not a replacement for Terminal's market data. A finding describes observed evidence; it does not establish future returns, beneficial wallet ownership or fraudulent intent.

## Decisions and scoring

The rule catalogue contains 51 check types: up to 42 data-driven rules and nine manual reviews. Coverage excludes checks that do not apply to the observed lifecycle. A rule without adequate inputs stays unknown. The score is a capped sum of warning points, not a probability.

| Decision | Basis |
|---|---|
| Avoid | A severe finding, or at least 40 warning points with material corroboration across two risk families. |
| Caution | Meaningful warnings below the Avoid standard. |
| No major flags | Low warning points and a fresh baseline covering critical token controls, liquidity and meaningful distribution evidence. |
| Wait for data | Baseline evidence is missing, stale or conflicting. |
| Reported rug | A current provider report explicitly marks the token as rugged. |

Related ownership findings count as one family. Related market/flow findings count as another. Several weak fresh-wallet, rounded-size or platform patterns cannot manufacture independent corroboration. A provider's generic danger rating alone cannot establish a rug. Missing evidence cannot cancel a known severe finding.

A partial distribution baseline can use at least eight usable non-pool holders plus a reported top-ten share at or below 25%, without clearing unobserved owners. A top-ten share at or below 4% can bound an individual holding without pretending the wallet list was sampled. Unresolved large program accounts remain explicit gaps. Bundle/insider coverage is disclosed separately, so green is never a statement that every coordination check passed.

The executable thresholds are in [`extension/engine.js`](https://github.com/baamelyoussef/rug-lens/blob/main/extension/engine.js), and the panel exposes their sources and details. Stage adjustments are documented in [STAGE-POLICY.md](STAGE-POLICY.md). These are policy choices, not statistically calibrated entry thresholds.

## Observed flow and holder changes in 0.6.0

The additional activity views carry **zero new scoring weight**. They help explain current observations while their predictive value remains unvalidated.

- **Token-flow windows:** 30 seconds, two minutes and five minutes of observed trades. Full wallet identities and valid token quantities are needed for wallet-level token flow. Newly observed buyers are not necessarily new holders or first-time buyers.
- **Matched holder changes:** compare the same full addresses across compatible observations. A row disappearing from a filtered or virtualized table is not a sale. Even a verified balance decrease does not distinguish a sale from a transfer without transaction evidence.
- **Additional trader fields:** displayed bought/sold token quantities and transaction counts, unit-qualified sold amounts and realized PnL, and holding duration are accepted only when their units and meaning are supported. Displayed PnL does not establish skill, future performance or independent ownership.

The existing sampled USD sell pressure, labeled developer/insider/bundler sales, trader concentration, repeated round trips and synchronized-entry checks remain separate. Do not confuse counts with volume, displayed labels with verified identity, or sample flow with complete market activity.

## Sources and scope

| Source | Used for | Important boundary |
|---|---|---|
| Terminal rendered UI | Current supply labels, holder rows, trade rows, lifecycle and context | English layout only; filters, virtualization and abbreviated addresses restrict coverage. |
| RugCheck | Contract fields, reported holders, warnings and explicit rug flag | Indexed third-party evidence; provider labels and report conclusions are attributed, not independently guaranteed. |
| DEX Screener | Indexed Solana market/pool metrics | Exact selected-pool matching on detail views; transaction counts are not unique wallets or buy/sell USD flow. |
| Solana public RPC | Supported mint controls, pool/curve identity and bounded optional transaction evidence | Layouts must be recognized and verified. Public RPC can rate limit or omit history. |

Holder observations are retained in memory for up to two minutes, with stale evidence identified after 30 seconds. Trade observations retain at most 500 unique signatures from the last five minutes. Local trend history is bounded to ten minutes; comparisons require compatible mint, pool and stage scope and fresh endpoints. Sampling begins from observations available in the session, not the token's launch.

Pool exclusion requires supported evidence. A reported large program-owned account is not automatically a whale or a pool. Current curve analysis preserves raw reserves and quote-asset identity; synthetic reserves are not spendable liquidity. Gross curve stress is not an executable quote, a modeled personal position or a guarantee of sale proceeds.

## Bounded on-chain scan

**Scan on-chain links** reads up to four recent signatures each for six sampled non-pool report holders. It looks for specifically decoded wrapped-SOL closure funding and jointly signed acquisitions. It has a 45-second work budget plus in-flight timeout and can end early on provider errors.

A positive decoded link has transaction evidence and stated limits. No match does not clear historical bundle or ownership risk. Shared services, funding sources, slots or Jito tips alone do not prove common ownership. See [MIXER-RESEARCH.md](MIXER-RESEARCH.md).

## Still unavailable or manual

Complete launch history; transfer lineage through intermediate wallets; independently established private ownership; exact Jito bundle membership; verified social attention; executable sell quotes; pool-specific liquidity-control history; and independent confirmation of a provider's rug label are not automated here. The nine manual reviews retain explicit unknown defaults and cannot generate the Reported rug verdict.

Journal schema 2 retains the unscored summaries and supported explicit-unit holder fields alongside the evidence record. While live observations are available, unchanged baselines may be recorded once per minute; other unchanged baselines use five minutes. The journal is a bounded evidence record, not a backtest. It does not establish outcomes, fills or returns. A valid future evaluation needs a predetermined cohort and outcome definition, includes failed/unresolved and non-migrating tokens, and separates New Pairs, Final Stretch and Migrated. Price appreciation alone does not disprove a risk finding, just as a price fall alone does not establish fraud.
