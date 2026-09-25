# Lifecycle policy

New Pairs, Final Stretch and Migrated affect both queue priority and analysis. Bundle presence is not a fraud verdict: Jito documents atomic execution for legitimate strategies, including arbitrage. Timing similarity and launch participation cannot establish exact bundle membership or current coordinated ownership. No source reviewed establishes that almost every new pair is bundled. [Jito documentation](https://docs.jito.wtf/lowlatencytxnsend/)

## Scoring by stage

| Evidence | New Pairs | Final Stretch | Migrated |
|---|---|---|---|
| Reported current bundle holdings 0–10% | 0 points | 0 points | 0 points |
| Current bundle holdings >10–20% | 4 points; retain 8 if linked-funding/joint-acquisition/labeled-selling evidence is observed | 8 points | 8 points |
| Current bundle holdings >20% | Ordinary tier remains | Ordinary tier remains | Ordinary tier remains |
| Current bundles ≥30% | Severe-risk floor retained | Same | Same |
| Modest fresh-wallet/sniper supply (≤20%) | 35% of ordinary points, rounded, at least 1 if flagged | 70% of ordinary points | Ordinary points |
| Fresh-wallet count, synchronized buys, repeated holding sizes, similar early entry pattern | 35% of ordinary points | 70% of ordinary points | Ordinary points |
| Dangerous authorities, restrictions, actual selling, private funding links, large current concentration | Existing rules retained | Existing rules retained | Existing rules retained |
| Liquidity | Verified current launch curve; stress largest observed owner/current cohort, never sum overlapping labels | Verified curve; hypothetical 1/5/10% total-supply stress and migration readiness | Fresh selected-pool liquidity, isolated from page/curve figures |

These are explicit heuristic policy weights, not measured prevalence, calibrated rug probabilities or validated entry thresholds. The rule details retain the original finding and show its before/after weighting. Lower launch weight does not erase the observed percentage. Initial bundle share and a number of bundles are never accepted as current bundle holdings. Direct sale observations retain their ordinary weight.

New-pair exit stress uses the largest usable sampled holder or reported current bundle/insider/developer share. A cohort is a stress scenario, not proof its members will sell together. If no size is known, the missing exit-size evidence remains explicit. Real reserve zero remains a warning. Total supply minus the curve's sale inventory is not used as circulating supply because those are different quantities. Other launch stages retain the clearly labeled hypothetical total-supply scenarios. Neither path models an executable fee-adjusted trade or a user's position.

## Lifecycle and venue safeguards

Stage evidence carries mint identity, source and observation time. Same-mint navigation may retain it for less than 120 seconds. Fresh verified active curves and completed curves are stronger venue evidence than a cached column label. A complete curve still needs a destination pool; it is not itself a tradeable AMM. Only known AMM provider identifiers with matching mint and fresh *market-response* liquidity can establish that indexed destination. Merged page values cannot substitute for that field. An explicitly selected AMM is assessed separately from an active launch curve for the same token. [Official Pump lifecycle documentation](https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_PROGRAM_README.md)

Unsupported/custom quote assets retain their quote-value and transfer-control gap. Wrong-mint, stale or conflicting stage context receives no New discount. Conventional LP lock, USD pool-depth, pool-liquidity-loss and turnover rules are not applicable to active curves or migration transition; they are excluded from automatic coverage. A local liquidity trend requires the same pool, mint and observed phase and a last observation less than 30 seconds old. The panel marks a stage-policy change separately from newly observed risk evidence, and the local journal retains the effective stage and adjustments for later stage-stratified evaluation.

## Validation and future data

These stage policies have automated regression coverage, but no prospective accuracy or profitability benchmark. Terminal supplies the underlying interface and rendered data; Rug Lens adds interpretation on top.

Deeper ownership analysis would require verified historical/indexed data. [Bubblemaps Time Travel](https://wiki.bubblemaps.io/bubblemaps-v2/time-travel) illustrates historical holder distributions, while its [indexed metrics API](https://docs.bubblemaps.io/data/api/tokens/metrics) describes cluster-based exposure. That API requires credentials and is not integrated. Its field named `bundles` represents the top ten clusters, not Terminal's current launch-related bundle holdings; it must not be copied into `bundlePct`.

Future evaluations should retain a predetermined cohort including unresolved and non-migrating tokens, and measure results separately for each stage. [Analysis limits](ANALYSIS.md) and [evaluation notes](ACCURACY-PERFORMANCE.md) describe the distinction between observed evidence and validated prediction.
