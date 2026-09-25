"""Build a loadable extension ZIP from an explicit set of public resources."""

import json
import re
import shutil
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = (
    "account-batch.js",
    "activity.js",
    "adapter.js",
    "background.js",
    "chain-scan.js",
    "chain.js",
    "content.js",
    "contract-fallback.js",
    "curve-scan.js",
    "engine.js",
    "journal.js",
    "manifest.json",
    "market-batch.js",
    "pool-resolution.js",
    "popup.css",
    "popup.html",
    "popup.js",
    "provider-verification.js",
    "providers.js",
    "pump-curve.js",
    "request-queue.js",
    "signals.js",
    "ui.js",
)
DOCUMENTS = (
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "docs/ACCURACY-PERFORMANCE.md",
    "docs/ANALYSIS.md",
    "docs/ARCHITECTURE.md",
    "docs/MIXER-RESEARCH.md",
    "docs/PRIVACY.md",
    "docs/RAPTOR-COMPARISON.md",
    "docs/RESEARCH.md",
    "docs/STAGE-POLICY.md",
    "docs/VIDEO-CHECKS.md",
)


def checked_file(relative):
    path = ROOT / relative
    if any(part.is_symlink() for part in [path, *path.parents] if part != ROOT.parent):
        raise ValueError(f"Symlink release input is not allowed: {relative}")
    if not path.is_file() or not path.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError(f"Missing or invalid release input: {relative}")
    return path


def main():
    manifest = json.loads(checked_file("extension/manifest.json").read_text())
    version = manifest["version"]
    if not isinstance(version, str) or not re.fullmatch(r"\d+(?:\.\d+){1,3}", version):
        raise ValueError("Manifest version must contain only 2–4 numeric components")
    if manifest.get("manifest_version") != 3:
        raise ValueError("Manifest V3 is required")

    # An added runtime resource needs deliberate release review, not a wildcard copy.
    present = {path.name for path in (ROOT / "extension").iterdir()}
    if present != set(RUNTIME):
        raise ValueError(
            f"Runtime allowlist mismatch: added={sorted(present - set(RUNTIME))}, "
            f"missing={sorted(set(RUNTIME) - present)}"
        )
    referenced = [manifest["background"]["service_worker"], manifest["action"]["default_popup"]]
    for script in manifest.get("content_scripts", []):
        referenced.extend(script.get("js", []))
        referenced.extend(script.get("css", []))
    if not set(referenced).issubset(RUNTIME):
        raise ValueError("A manifest resource is absent from the release allowlist")

    inputs = [(checked_file(f"extension/{name}"), f"rug-lens/{name}") for name in RUNTIME]
    inputs.extend((checked_file(name), f"rug-lens/{name}") for name in DOCUMENTS)
    destination = ROOT / f"rug-lens-{version}.zip"
    with ZipFile(destination, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for path, member in sorted(inputs, key=lambda item: item[1]):
            info = ZipInfo(member, date_time=(2020, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = ZIP_DEFLATED
            archive.writestr(info, path.read_bytes(), compresslevel=9)

    with ZipFile(destination) as archive:
        bad_member = archive.testzip()
        if bad_member:
            raise ValueError(f"Archive integrity check failed: {bad_member}")
        if json.loads(archive.read("rug-lens/manifest.json"))["version"] != version:
            raise ValueError("Packaged manifest version mismatch")
    generic = ROOT / "rug-lens.zip"
    shutil.copyfile(destination, generic)
    print(destination)
    print(generic)


if __name__ == "__main__":
    main()
