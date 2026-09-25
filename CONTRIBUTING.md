# Contributing

Bug reports, reproducible fixtures, documentation improvements and focused pull requests are welcome. Rug Lens is an unofficial Terminal overlay. Keep changes within its role as an evidence-based analysis tool.

## Work locally

Use Node.js 22 and Python 3, then run:

```sh
npm ci
npm test
npm run check
npm run package
```

Load `extension/` through Chrome's **Load unpacked** action. Reload the extension and refresh Terminal after changing it. `npm run demo` serves a simulated UI at `http://127.0.0.1:8741/demo/`.

## Changes to analysis

Explain the observable evidence, its source, freshness and coverage. Keep mint, pool and lifecycle scope intact. Treat missing data as unknown. Do not equate shared services, abbreviated addresses, rounded amounts or simultaneous trading with common ownership or fraud.

New unvalidated observations should remain unscored context until their behavior and false-positive risks are established. A numerical threshold needs an explicit rationale; automated tests alone do not validate predictive accuracy. Update [analysis documentation](docs/ANALYSIS.md) and relevant regression tests when behavior changes.

Prefer a small sanitized fixture over a live API dependency in tests. Public fixtures live in `tests/data/`; do not commit local `audit/` captures, browser storage, account credentials, wallet secrets or personal trading activity. Keep any public on-chain fixture's source, slot and collection context when relevant. Do not add copyrighted transcripts.

## Pull requests

Describe the problem, final behavior and relevant validation. Include a screenshot only when it helps explain a UI change; the demo must stay clearly marked as simulated data. Keep runtime dependencies and extension permissions minimal. If adding a runtime resource, update the explicit allowlist in `scripts/package.py`.

Before submitting, confirm the test, syntax/manifest and package commands above pass. A clean checkout must not depend on local audit files or unpublished credentials. No live trades or funded wallet are needed to contribute.

Use [Issues](https://github.com/baamelyoussef/rug-lens/issues) for ordinary bugs and proposals. Follow [SECURITY.md](SECURITY.md) for vulnerabilities.
