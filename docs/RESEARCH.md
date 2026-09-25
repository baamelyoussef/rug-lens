# Detection research and implementation — 2026-09-25

The analysis design draws on the four video summaries in [VIDEO-CHECKS.md](VIDEO-CHECKS.md) with primary technical documentation and published research. These references support the mechanisms and limitations. They do **not** validate this extension's numerical thresholds, certify its accuracy, or establish that every suspicious token is fraudulent. No trained classifier or accuracy percentage is claimed.

## Mechanisms and evidence

| Topic | Primary reference | Implementation and boundary |
|---|---|---|
| Bundle timing versus wallet connections | [Bubblemaps: bundle vs cluster](https://blog.bubblemaps.io/whats-the-difference-between-bundle-cluster-2/) | Separate reported bundle supply, common funding, and same-second trade patterns. A connection does not establish common ownership. Known service funders are excluded. |
| Actual atomic bundles | [Jito transaction and bundle documentation](https://docs.jito.wtf/lowlatencytxnsend/) | Displayed same-second buys are only a synchronization heuristic. No claim of Jito bundle membership without authoritative membership data. Jito status methods require bundle IDs; they are not an arbitrary-token launch-history endpoint. |
| Global token delegate | [Solana permanent delegate](https://solana.com/docs/tokens/extensions/permanent-delegate) | An active delegate is a critical control risk because it can authorize transfers/burns across accounts. It is not proof that abuse has happened. |
| Transfer rules and restrictions | [Solana token extensions](https://solana.com/docs/tokens/extensions) and [transfer hooks](https://solana.com/fr/developers/guides/token-extensions/transfer-hook) | Read explicit non-transferable, default frozen, hook and pause fields. Absent or unsupported fields remain unknown. Legitimate regulated assets can use these controls; this tool targets memecoins. |
| Fees and authority | [Solana transfer fees](https://solana.com/docs/tokens/extensions/transfer-fees) | Current fee percentage and fee authority are separate checks. Fee caps mean percentage alone is not the final trade charge. No sell simulation or honeypot test is claimed. |
| Market activity windows | [DEX Screener API](https://docs.dexscreener.com/api/reference) | Fetch selected-pool liquidity, 5m buys/sells, 5m volume and price change, plus 24h turnover. Counts are not unique makers or USD buy/sell flow. Reject a different pool rather than substituting it in a detail view. |
| Contract, holders, provider findings | [RugCheck API](https://api.rugcheck.xyz/swagger/index.html) | Match mint, exclude identified pools/lockers, aggregate accounts by owner, parse explicit fields and preserve provider warnings. `rugged: true` produces **Reported rug**, naming the source. `rugged: false` is not a safety finding. |
| Holder account versus wallet | [Solana getTokenLargestAccounts](https://solana.com/docs/rpc/http/gettokenlargestaccounts) | Token accounts are not automatically independent owners. Provider accounts are grouped by owner. A partial list cannot clear the global largest-holder check merely because its observed wallets are small. |
| Freeze abuse, liquidity removal and dumping | [From Hype to Collapse (2026)](https://arxiv.org/html/2603.24625v2) | Separate controls, holder distribution, liquidity trends and trade flow. Rapid decline plus heavy selling escalates risk; it does not establish intent. The paper's dataset and results do not calibrate this extension. |
| Pool-specific LP structures | [Raydium fees](https://docs.raydium.io/raydium/protocol/protocol-fees), [Raydium locking audit](https://github.com/raydium-io/raydium-docs/blob/master/audit/Halborn%20Q4%202024/raydium_liquidity_locking.pdf) | No universal fee/volume ratio or blanket LP lock inference. Bonding curves, constant-product LP tokens and concentrated positions require different treatment. Burn percentage is displayed as source context; expiry/control remains a review. |
| Historical transfers and graphs | [Helius data APIs](https://www.helius.dev/docs/getting-data), [parsed events](https://www.helius.dev/blog/parsed-events-and-streams), [Bubblemaps integration](https://docs.bubblemaps.io/introduction) | Full launch history, multi-hop funding, cross-token recurrence and independently verified clusters require indexed data and often credentials. These integrations are **not implemented** in this no-key release. They remain visible gaps, not simulated checks. |

## Numerical policy

Research references support mechanisms and limitations; they do not establish Rug Lens's numeric cutoffs. The current decision/coverage rules are documented in [ANALYSIS.md](ANALYSIS.md), with lifecycle adjustments in [STAGE-POLICY.md](STAGE-POLICY.md). Executable rule definitions are in [`engine.js`](https://github.com/baamelyoussef/rug-lens/blob/main/extension/engine.js).

Related warnings are capped rather than treated as independent evidence. Severe controls or concentration can set a risk floor. Otherwise, Avoid requires material corroboration, not a pile of weak patterns. The Reported rug verdict is reserved for an explicit provider report, with attribution. No observed score is a calibrated probability, guaranteed outcome or buying recommendation.

New 0.6.0 wallet-flow and matched-holder observations remain unscored. They expand the visible evidence without claiming that a statistical predictor has been validated.

## Rendered-data scope

- The reader was inspected against Terminal's English Solana UI on 2026-09-25. Name-row identification uses the card's own mint control, not quote-token/social trading links.
- Trades: validated `data-trade-shell` layout; signature, relative age, buy/sell, supported token quantity, USD value, maker label and developer/insider/bundler labels. USD fields require a dollar marker. Anonymous currency icons do not establish quote units. Sidebar wallet-feed trades are excluded.
- At most 500 unique signatures and five minutes are retained in memory per viewed market. Same-second/size grouping uses rounded UI observations, not block or slot data. Re-reading a row does not reset its original observation time.
- Truncated maker labels cannot establish wallet identity. Wallet concentration and repeat-loop checks require full addresses on at least 80% of the sampled trades. They will often remain unavailable on the current Terminal layout.
- Holders remain a bounded visible sample, retained for up to two minutes when switching to Trades. Source age is displayed. Sampling 10 wallets is not a full ownership graph.
- Same-pool liquidity and holder changes compare observations at least 30 seconds apart within five minutes. No comparison across market addresses; navigation does not invent prior history. Liquidity measured in USD can fall because price fell or liquidity migrated.
- Viewers / holders uses the header eye counter and the holder tab count. It is **context only**, with no score contribution or universal cutoff. Social followers, transaction count, viewer count and watchlist saves are different metrics and are not substituted for one another.

## Still requiring review / unavailable automatically

LP lock ownership and expiry; creator's prior rugs; multi-hop funding; historical hidden clusters; common wallet history across tokens; the first 100 launch trades; proof of a coordinated launch bundle; independent social verification; pool-specific fee reconciliation; complete unfiltered transaction history; executable sellability/slippage; whether a provider's rug report is correct. These remain explicitly unknown or manual. The tool never requests wallet access or signs a transaction to investigate them.


Two bounded on-chain methods complement the rendered sample. See [MIXER-RESEARCH.md](MIXER-RESEARCH.md) for source inspection, thresholds, false-positive controls and exact RPC sampling limits.
