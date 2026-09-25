# Related overlay features

The [Raptor Pro product page](https://raptorpro.app/#radar) was reviewed during development for possible interface and analysis ideas. Its public description includes risk/momentum analysis, large-trade activity, X attention and trading automation. Those descriptions do not establish independently validated detection accuracy or provide enough implementation detail to reproduce its scanner.

Rug Lens uses the following limited, explicitly sourced equivalents:

| Area | Rug Lens behavior |
|---|---|
| Risk findings | Explainable rules, source ages and unavailable checks. |
| Current flow | Interpretation of sufficient sampled USD trade flow; additional unscored observed wallet-flow windows in 0.6.0. |
| Large trades | Local notices for displayed trades above the greater of $1,000 or 1% of reported liquidity. Trade size does not establish wallet wealth or intent. |
| Changed findings | Quiet in-panel notices for newly observed rule flags; stage-policy changes are identified separately. |
| X attention | Not integrated; no reliable authenticated social source is configured. |
| Trading automation | Outside this extension's scope. No wallet access or execution. |

Session notices are local to the tab, capped at eight and expire after five minutes. They do not create desktop notifications, play sounds or monitor closed tabs. Filters and rendered-row limits apply. The notices themselves add no risk-score points.

The compact panel puts findings before expandable evidence, avoids duplicating Terminal's market-statistic cards, and uses icons plus restrained color. These are interface choices, not claims of feature or performance parity. Rug Lens is independent of both Terminal and Raptor Pro.
