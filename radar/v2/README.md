# Horizon Radar Contract V2 — Shared Types and Normalization

This directory is the canonical contract package for the two repositories:

- Canonical owner: `muhnchiu/script-manager`
- Canonical V2 schema: `contracts/radar-v2/radar-v2.schema.json`
- Contract package version: `2.0.0`
- Public Radar schema version: `2`
- Shared fixture set version: `2.0.0`

The Horizon repository must not maintain an independently edited schema or fixture copy. When Horizon consumes this package (Phase 2), pin this repository as a Git submodule to an exact commit SHA; CI must initialize submodules and assert `contract-manifest.json` versions. Contract updates are made here, versioned here, then consumed by an explicit pinned-commit update in Horizon. Never follow a floating branch or silently copy schema files.

Phase 1 contains dependency-light TypeScript declarations, pure JavaScript normalizers, the canonical V2 JSON Schema, manifest, fixtures, and native Node tests. It does not implement the Validator, Publisher integration, Event Registry, Generator, or Horizon changes.

Run tests from this repository root:

```sh
node --test contracts/radar-v2/test/normalize.test.mjs
```

## Normalized Count Semantics

The normalized model keeps count values verbatim and records their source meaning:

- `sourceSchemaVersion: 1`, `countSemantics: "v1-legacy"`: preserve the historical V1 `signalCount`, `highSignalCount`, `actionableCount`, and `actionRequired` values exactly; never infer `signalCount` from highlights.
- `sourceSchemaVersion: 2`, `countSemantics: "v2-highlights"`: V2 contract definition is `signalCount === highlights.length`, `highSignalCount === count(signal === "high")`, and `actionableCount === count(action in {"adopt", "test"})`.

Phase 1 normalization does not validate those V2 equations; that belongs to Phase 3.

## Fixture Index

- `fixtures/v1/v1-legacy-signals.json`: versionless V1, all legacy action values, all V1 signal values including `critical`, flat source fields, and deliberately body-wide legacy counts.
- `fixtures/v1/v1-explore-publish-false.json`: versionless V1 `explore`, flat source, and `publish: false`.
- `fixtures/v2/v2-nested-source-publish-false.json`: V2 nested source, `adopt`/`test`, related Radar, event identity, score/confidence, and `publish: false`.
