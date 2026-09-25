# Mixer and bundler research — 25 September 2026

## What was actually examined

Read-only static source inspection, public product descriptions, and official Solana transaction documentation. No third-party bundler was installed or executed. No vendor's detection-evasion claim was independently verified. Public availability does not establish that a particular tool was used in an actual rug.

- [Public stealth-bundler source, pinned revision](https://github.com/keidev-sol/Solana-Pumpfun-Stealth-Bundler/tree/bdb47c486eff603331e3334edb4fd36a8f807a9b), repository last pushed 11 February 2026. Inspected `src/main.ts`, `index.ts`, and `executor/jito.ts`. The distribution function uses native-token account closures to deliver SOL to new recipients. A recurring payer and signing authorities remain visible. The acquisition code combines multiple signing buyers into transactions and uses a lookup table. The repository is incomplete: an imported SDK file is absent and one executor is a stub. This is evidence of a published design, not proof of a functioning deployment or its advertised undetectability.
- [Ballistic](https://ballistic.app/) advertises proxy-wallet token redistribution, variable amounts, funding options and staged trading. These are vendor claims. Detection implication: equal-size and direct-funder checks alone are insufficient.
- [Vex Launcher](https://vexlauncher.cloud/) advertises intermediate funding wallets and varied execution timing. Its ownership separation and detection claims were not verified. Timing alone is weak evidence.
- [Solana CloseAccount documentation](https://solana.com/docs/tokens/basics/close-account) explains that closure sends lamports to a destination and native-token accounts can close with a balance. A detector needs token instructions and inner instructions, not only System Program transfers.
- [getTransaction](https://solana.com/docs/rpc/http/gettransaction) and [getSignaturesForAddress](https://solana.com/docs/rpc/http/getsignaturesforaddress) specify the parsed transaction and history interfaces used by this implementation.

## Implemented checks

Two evidence-driven methods, available through **Scan on-chain links** in the coin panel:

1. **Linked wrapped-SOL funding pattern.** Resolve native-token accounts from token balances or initialization instructions, including inner instructions. Require successful transactions, a signing close authority, a signing payer, a non-self recipient, and a recipient net SOL gain above 0.005 SOL. Group sampled holder recipients by payer. Three or more recipients with at least 10% combined current reported supply receive a caution contribution. If the payer matches the reported creator and the cohort holds at least 25%, set a red risk floor. The SOL gain is corroboration, not an assertion that every lamport came from one closure. Services can produce similar links.
2. **Jointly signed token acquisitions.** Match full holder addresses to transaction signers and positive net token balance changes for the selected mint. Three or more signing holders with at least 10% current sampled supply receive a risk contribution; at least 25% sets a red floor. Use integer token amounts, not floating-point approximations. A jointly signed acquisition establishes joint authorization, not beneficial ownership, an exact Jito bundle, or fraud.

Neither relies on identical amounts, fresh-wallet labels or abbreviated addresses. Neither sets the stop icon. No match remains unknown because history is partial. Related scores retain the coordination category cap.

## Efficiency and scope

The scan reads four recent signatures per holder for up to six non-pool report holders. It fetches each transaction once, caches up to 200 successful responses, serializes requests with 1.1-second spacing, stops on provider errors, and uses a 45-second work budget plus an in-flight request timeout. One global scan runs at a time. Results are cached and expire after two minutes. The panel exposes holder/transaction coverage, null responses, errors, linked wallets and verification links.

This prioritizes recent evidence at low request cost. It often misses funding that occurred before the sampled transactions. No complete funding-history or mixer-identification claim is made. The live RPC history and parsed transaction methods were exercised during development; labeled real-world precision/recall has not been measured.

## Further methods requiring more data

- Historical flow graph: include native-account closures, token transfers, fee sponsorship, intermediate accounts and subsequent consolidation. Decoded multi-hop links should retain transaction evidence, time and amount uncertainty.
- Token lineage: carry launch-cohort exposure through transfers to later wallets. Current low bundle holdings can reflect selling or redistribution; do not decide which from a percentage change alone.
- Repeated cohorts across launches: compare verified addresses and transaction authorization over multiple tokens. Similar behavior alone is not identity.
- Lookup-table provenance and common rent payers: useful corroboration, but shared routers, relayers and services create legitimate overlap.
- Exit coordination: compare verified wallet-level sales and proceeds destinations. A market-wide selloff is not sufficient.

These are research directions, not implemented automatic checks. Accurate historical indexing and service attribution are needed before enabling them. Privacy-tool use, exchange funding, Jito tips, shared slots, or generic account cleanup alone must not be treated as proof of a rug.
