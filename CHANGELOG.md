# Changelog

## 0.6.3

- Give Terminal rendering priority: start background analysis after document completion and a 1.5-second startup grace, then use browser idle callbacks without a forcing timeout.
- Coalesce pending work and split badge scoring/painting into small batches, yielding between batches.
- Pause background work around page scrolling/input and briefly after navigation; explicit evidence-panel clicks remain responsive.
- Reduce mutation-driven full scans to at most once per two seconds.
- Preserve provider batching, priorities and evidence freshness rules. Busy pages can intentionally delay analysis.

## 0.6.2

- Dispatch the next queued coin immediately when a request slot becomes free, without waiting for a DOM rescan.
- Schedule provider refreshes and retries independently of page parsing.
- Avoid duplicate initial and final loading-state scoring; keep partial results immediate.
- Retain eight background coin slots, stage priority, fairness, rate-limit backoff and hidden-tab suspension.
- Add a reproducible synthetic feed benchmark and scheduler regressions.

## 0.6.1

- Pin the test DOM dependency to an available release so clean installs work.

- Update only the affected coin when a provider response arrives, instead of rescoring every Trenches badge.
- Index detail labels once per scan and reuse column discovery within a Trenches scan.
- Batch visibility reads before badge insertion to avoid repeated synchronous layout.
- Limit mutation-driven full scans to once per second, ignore tracked-wallet sidebar updates and stop scans/request dispatch while the tab is hidden. Navigation and provider responses retain their own update paths.
- Share one parsed stylesheet across badges and skip rebuilding unchanged panel content.
- Display indeterminate directions for two-sided trades with rounded amounts.
- Correct synthetic holder identities in the pool-exclusion regression fixture.

## 0.6.0

- Publish the project under the MIT License with installation, contribution, security and analysis documentation.
- Add observed full-wallet token-flow windows for 30 seconds, two minutes and five minutes.
- Compare matched observed holders and read additional sold, realized-PnL and holding-duration fields when units are supported. Missing rows are not assumed to have sold.
- Keep the new observations as unscored context; no new calibrated prediction or API-key integration is claimed.
- Package explicitly allowed runtime resources, documentation and the license in generic and versioned archives; add clean-checkout CI.

## 0.5.2

- Introduce separate analysis policies for New Pairs, Final Stretch and Migrated.
- Bind stage and liquidity evidence to the current mint, venue and observation time.
- Use observed current exposure for New Pairs curve stress and exclude inapplicable pool checks from coverage.

## 0.5.1

- Fix panel scrolling and preserve interaction state during live updates.
- Prioritize selected coins, New Pairs, Final Stretch and Migrated while retaining progress for older queued cards.
- Add direct mint-control fallback, verified supported Pump curve reads, shared account batching and independent provider retries.

## 0.5.0

- Verify supported pool accounts before excluding them from holder concentration.
- Separate unscoped provider warnings from measured selected-pool evidence.
- Add a local evidence journal for prospective review.

Earlier development established the Terminal adapter, explainable risk panel and bounded on-chain evidence checks. The versions above do not imply a measured accuracy or profitability record.
