# Horizon Radar Contract 2.1.0

This is a separately versioned additive evolution of schemaVersion 2. Contract 2.0.0 remains at `../` unchanged. Historical V1 and 2.0 documents must continue to be handled by their original contract artifacts; this directory defines the Event-aware 2.1 wire shape.

`date` is the Radar report/content date. `observedAt` is when Radar observed the source evidence. `eventOccurredAt` is the best-effort real-world event time. `sourcePublishedAt` belongs to an individual source observation in `sources[]`. None of these values are required to equal another.

Each highlight requires `eventKey`, `canonicalEventType`, `eventState`, `materialChange`, `duplicate`, and `observedAt`. Event keys have exactly three lowercase kebab-case segments separated by colons, and their middle segment must match `canonicalEventType`. This contract validates shape and internal consistency only; it does not decide identity or whether a change is materially important.

The normalized model preserves optional event and source timestamps as absent when they are absent. It never synthesizes identity or timestamps. Source authority is evidence provenance only and does not feed score, signal, action, or confidence.

Run the contract tests with:

```sh
node --test contracts/radar-v2/2.1.0/test/*.test.mjs
```
