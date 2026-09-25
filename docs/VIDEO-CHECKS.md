# Video checks and implementation map

Read from English auto-caption transcripts retrieved 2026-09-25. Visual-only details may not appear in captions. No full transcripts are redistributed. A check marked **review** is implemented as a manual assessment with unknown as its default, not as automatic detection.

| Source / time | Distinct check | Implementation |
|---|---|---|
| [Blueprint Day 2](https://www.youtube.com/watch?v=sd_X_hsJutM&t=569s), 09:29–10:53 | Non-pool concentration and repeated holding sizes | Automatic rendered sample; pool exclusion; >4% largest-holder threshold |
| Same, 10:54–12:25 | Similar balances, common funding and time | Automatic when full addresses and fields exist; services excluded |
| Same, 12:27–15:08 | App concentration and overlapping trade histories | App match: weak automatic signal. Last 3–4 tokens per wallet: review |
| Same, 15:27–20:08 | Clusters, aggregate exposure, fresh wallets | Fresh-wallet markers: automatic. Historical/hidden clusters: review |
| [How To Detect Bundles](https://www.youtube.com/watch?v=w6v58J2HuUA&t=60s), 01:00–05:40 | Launch spike, dev loops, smooth chart, tracked traders, empty/fresh wallets | Chart and tracked-wallet review; wallet checks automatic |
| Same, 06:28–08:42 | Similar early entry caps, transferred supply with no buys | Automatic on the visible holder sample |
| Same, 10:14–16:10 | Platform overlap, developer history, social claims, token locks | App concentration automatic; history/social/lock review |
| [Ultimate Guide](https://www.youtube.com/watch?v=OUcUwd4aO08&t=159s), 02:39–08:50 | Pool exclusion, concentration, insiders, bundles, overlapping wallets | Automatic supply metrics and exclusion; wallet-history review |
| Same, 08:54–12:48 | Multiple cluster tools, historical nodes, KOL/copy-trader context | Cluster and tracked-wallet reviews; correlations are not ownership proof |
| Same, 12:48–14:42 | Pro traders, synchronized/repeated entries and snipers | Sniper supply automatic; first-100-trades review. Pro-trader counts are context only |
| [Blueprint Day 1](https://www.youtube.com/watch?v=NX1OoHpFUxI&t=550s), 09:10–12:58 | Liquidity/expiry, developer history, distribution, fees, first trades, socials, authorities | Liquidity/distribution/authority checks automatic; expiry/history/trade/social/fee checks reviewed |
| Same, 14:00–18:49 | Wash-trade rhythm, clusters, synchronized sniping, turnover, mirrored trades | Turnover automatic; historical/transaction/chart reviews |

## Deliberate interpretation choices

- The videos give **4% and 5%** holder cutoffs. The default uses >4% as the first warning, >5% as stronger, >10% as strongest. This is a heuristic, not a proven classification boundary.
- “Same exchange,” “same platform,” “fresh wallet,” “no tracked wallets,” odd trade decimals, connected bubbles, or high turnover cannot individually establish fraud. The model caps correlated evidence and never labels an unflagged token “not a rug.”
- The Day 1 transcript’s fee guidance is internally inconsistent: around 1%, then $25–$60 per $1 million, then a 1/30 ratio. No universal fee test is encoded. The review requires pool-specific fees with consistent units and windows.
- Promotional claims, paid listings and locked token supply are not guarantees. Locked **token supply** is distinct from locked **liquidity**. A developer’s emptied main wallet does not clear side wallets.

## Non-risk content in the videos

Day 2, 02:57–04:46 gives discovery presets: new pairs $6k minimum market cap / six-minute maximum age; soon/final stretch $8.5k / 30 minutes / 20 pro traders; migrated $30k / 100 pro traders. These are personal discovery preferences, not rug criteria. The extension does not edit your filters.

Fee presets, slippage, MEV protection, entries, sizing, profit targets, Discord promotion and wallet-following instructions are outside the requested token-risk label. The extension does not apply trading instructions from the videos.

## Recent-trade coverage

Recent displayed trade synchronization, labeled selling and full-address repeat loops have bounded automatic checks. These sample checks do not replace first-100/launch-history review. Further primary-source research and implemented boundaries are in [RESEARCH.md](RESEARCH.md).
