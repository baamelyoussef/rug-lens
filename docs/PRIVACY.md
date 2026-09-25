# Privacy and data flow

Rug Lens has no project-operated backend, analytics service or remote code loader. It works in the supported Terminal page and, when enabled, requests public data directly from the providers below.

## Browser permissions

- **Content script:** `https://trade.padre.gg/*`. Reads supported rendered DOM fields and adds the badge/panel. It does not inspect hidden React state or intercept page network traffic.
- **Storage:** saves preferences, panel position and the local evidence journal.
- **External hosts:** `https://api.rugcheck.xyz/*`, `https://api.dexscreener.com/*` and `https://api.mainnet-beta.solana.com/*`.

There is no wallet connection, private-key request, wallet-signing request, order submission or browser-history permission. Clicking a source link opens that external provider's page under its own privacy practices.

## Outbound requests

| Provider | Public data sent | Purpose |
|---|---|---|
| RugCheck | Token mint | Token report, controls, holders and provider findings. |
| DEX Screener | Token mints or selected pool addresses | Indexed Solana market and liquidity observations. |
| Solana public RPC | Supported mint, pool, curve and large-holder addresses | Direct account verification and supported fallback data. |
| Solana public RPC, optional on-chain scan | Sampled report-holder addresses and public transaction signatures | Recent transaction evidence for bounded linkage checks. |

These services can observe requested addresses and ordinary HTTP metadata, including the requester's IP address. Extension requests omit cookies and referrers. No personal account name, wallet credential or full page capture is sent by this extension. Public addresses can still reveal which assets are being inspected.

Turning off **External enrichment** stops new enrichment work; already dispatched requests may finish. Page-only checks continue if scanning remains enabled. Turning scanning off removes the analysis overlay. None of these controls changes trading settings.

## Local data

Preferences and panel position persist in Chrome's extension-local storage. The evidence journal retains at most **500 snapshots for seven days**, pruned when written. It records public mint/pool identity, observed metrics, reasons, rule coverage, source times, verification evidence and unscored flow/holder summaries. Schema 2 also retains supported explicit-unit holder fields. Exports are created locally through the popup.

The journal does not record executed orders, private wallet information, fills or independently verified future outcomes. Short-term rendered trade/holder history and manual reviews remain in memory rather than being a full browsing archive. Removing the extension removes its extension storage; deleting an exported file is separate.

Review an exported journal before sharing it: even public addresses, timestamps and observations can reveal a trading watchlist. Local development `audit/` captures are excluded from the public repository and release package. Curated public test fixtures are separate from those captures.

## Limits

Upstream providers have their own retention, availability and privacy policies. This project does not control them. No authenticated X integration, paid API-key service or private account connector is integrated. Any future change to providers or retained data should update this document and the extension permissions.
