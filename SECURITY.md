# Security

The latest published release is the supported version. Rug Lens does not request wallet keys, connect to a wallet or submit trades.

## Report a vulnerability

Use the repository's [private vulnerability reporting](https://github.com/baamelyoussef/rug-lens/security/advisories/new) when available. Include the affected version, a minimal reproduction and the potential impact. Do not include wallet secrets, authentication tokens or unrelated personal data.

If private reporting is unavailable, open an issue titled **Security contact requested** without exploit details so a maintainer can arrange private follow-up. Please avoid publishing a working exploit before maintainers have had a reasonable opportunity to investigate. No response-time or bug-bounty commitment is offered.

Risk-score disagreements, upstream outages and broken Terminal selectors are normally bug reports, unless they expose a security boundary failure.

## Design boundaries

Runtime code is packaged with the extension. Content access is scoped to `https://trade.padre.gg/*`; external host permissions cover only the documented report providers and Solana public RPC. External requests omit credentials and referrers. No remote scripts, analytics or network interception are used.

Provider responses and page text are untrusted inputs. Validate addresses and account layouts, preserve unknown states, and render external strings as text. Do not add wallet access, automated trading, undocumented endpoints or new host permissions without an explicit design review.

See [privacy and data flow](docs/PRIVACY.md) for outbound requests and local retention.
