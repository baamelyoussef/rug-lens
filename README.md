# Rug Lens

An open-source, read-only Chrome extension that adds explainable Solana risk analysis to [Terminal](https://trade.padre.gg). One icon beside a coin opens a compact panel with the leading findings, evidence sources, recent observed activity and missing checks.

**Rug Lens is an unofficial overlay. It is not affiliated with or endorsed by Terminal, Padre, RugCheck or other data providers.** It interprets available data; it does not execute trades or predict returns. Scores are transparent heuristics, not calibrated rug probabilities.

## Install

1. Download `rug-lens-0.6.3.zip` from [GitHub Releases](https://github.com/baamelyoussef/rug-lens/releases/latest) and extract it to a permanent folder.
2. Open `chrome://extensions`, enable **Developer mode**, and select **Load unpacked**.
3. Choose the extracted `rug-lens` folder containing `manifest.json`, then refresh Terminal.

Chrome 120 or newer is required. Chrome cannot install this ZIP directly. To install from source, load the repository's `extension/` folder instead; no build is required.

For an update, replace the files in the installed folder, click **Reload** on the extension, and refresh Terminal. Keep one installed copy. The extension popup lets you disable scanning or external enrichment.

## Read the icon

| Icon | Meaning |
|---|---|
| Red flag — **Avoid** | A severe finding or corroborated material risks. |
| Yellow warning — **Caution** | A meaningful warning needs review. |
| Gray shield — **Wait for data** | Baseline evidence is missing, stale or conflicting. |
| Green shield — **No major flags** | No major warning in the fresh observed baseline; disclosed gaps still apply. |
| Red stop — **Reported rug** | RugCheck explicitly reports the token as rugged; the attribution remains visible. |

Green does not mean safe, and red does not claim proven fraud. Missing data is never silently counted as a passed check. Open the icon to see the reasoning and source freshness.

The panel scrolls independently. Drag its header to move it; double-click to reset. Keyboard users can focus the header and use arrow keys, Shift + arrows for larger steps, or Home to reset.

## Analysis

- **Ownership and coordination:** current reported bundle, insider and developer exposure; non-pool concentration; sampled funding links and holder patterns.
- **Token controls:** mint/freeze authorities and supported Token-2022 restrictions, fees and delegates.
- **Liquidity and lifecycle:** verified supported Pump curve reserves before migration; selected-pool evidence after migration. New Pairs, Final Stretch and Migrated have distinct, disclosed policies.
- **Observed activity:** sampled selling, tagged sales, repeated trading and changes in the displayed data. Version 0.6.0 adds full-wallet token-flow windows at 30 seconds, two minutes and five minutes, plus changes for matched observed holders. These descriptive observations add **no risk-score points** while unvalidated and are not entry signals.
- **Evidence first:** source ages, coverage gaps, conflicts and bounded on-chain verification remain visible. Manual review covers questions the available data cannot answer.

For deeper observations, open a coin's **Holders → All** at the top, then **Trades**. Only rendered rows can be read. Filters, incomplete addresses and virtualized tables limit the sample. A disappearing row is not treated as a sale. Additional displayed sold/PnL/holding-duration fields are used only where their units can be identified.

The optional **Scan on-chain links** action examines recent transactions for up to six report holders. It can find specific funding and jointly signed acquisition evidence; it is not a complete launch-history scan or mixer detector.

Read [analysis and limitations](docs/ANALYSIS.md), [stage policy](docs/STAGE-POLICY.md) and [source research](docs/RESEARCH.md). The tool has no measured predictive-accuracy or profitability claim.

## Data and privacy

Rug Lens reads Terminal's rendered English Solana interface. Optional enrichment requests public token, pool and holder information from **RugCheck, DEX Screener and Solana public RPC**. Providers can see the requested public addresses and ordinary request metadata, including your IP address.

No API key, wallet connection, wallet-signing request or trading permission is required. There is no analytics service, remote executable code, browser-history access or network interception. Preferences, panel position and a bounded evidence journal are stored locally. The journal retains at most 500 snapshots over seven days and can be exported from the popup.

Disable external enrichment for page-only operation. Already dispatched requests may finish. See [privacy and data flow](docs/PRIVACY.md) for the exact scope.

## Development

Use Node.js 22 and Python 3. Runtime code is vanilla JavaScript; `linkedom` is a test-only dependency.

```sh
npm ci
npm test
npm run check
npm run package
npm run demo
```

The demo is available at `http://127.0.0.1:8741/demo/`. It uses **simulated data** with the actual analysis engine and panel. It is useful for UI review but does not establish live-provider accuracy or installed-extension behavior.

Packaging produces `rug-lens.zip` and a versioned ZIP from an explicit resource allowlist. Local audit captures, development dependencies and credentials are not release inputs. See [architecture](docs/ARCHITECTURE.md), [contribution guidelines](CONTRIBUTING.md) and [security reporting](SECURITY.md).

## Scope

Supported: `trade.padre.gg`, Solana, English interface. Other hosts, Axiom, other chains, complete historical wallet graphs, automated X analysis, executable sell quotes and automated trading are not integrated.

Terminal and upstream providers can change their interfaces or return incomplete data. Report reproducible issues through [GitHub Issues](https://github.com/baamelyoussef/rug-lens/issues). Include the extension version and evidence source without sharing private account data.

Licensed under the [MIT License](LICENSE). Changes are listed in the [changelog](CHANGELOG.md).
