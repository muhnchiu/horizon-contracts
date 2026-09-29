# Horizon Radar Contract 2.1.2

Contract 2.1.2 is a patch release of the Event-aware Radar contract. It keeps `schemaVersion: 2` and all 2.1.1 semantics, widening only the event key entity segment grammar to accept existing lowercase identity slugs containing dots or underscores. Contract 2.1.1 and 2.1.0 remain available unchanged in sibling directories. Contract 2.0.0 remains at `../` unchanged.

Event keys retain exactly three segments: `<entity>:<canonicalEventType>:<eventIdentifier>`. The entity segment matches `^[a-z0-9][a-z0-9._-]*$`; the canonical event type retains the 2.1.1 lowercase kebab-case grammar; the identifier retains `^[a-z0-9][a-z0-9._-]*$`. Colons remain reserved as segment separators. No normalizer rewriting is performed.

This package changes no Event or Observation identity semantics, state invariants, scoring semantics, or material-change rules.

Run the package tests with:

```sh
node --test contracts/radar-v2/2.1.2/test/*.test.mjs
```
