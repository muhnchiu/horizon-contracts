# Horizon Radar Contract 2.1.1

This is the Event Identity Model 1.0, distributed as a patch release over Contract 2.1.0. Both use schemaVersion 2. Contract 2.1.1 accepts the documented event identifier grammar, including dotted and underscored identifiers such as `2.1.281`; Contract 2.1.0 remains available unchanged in its own directory. Contract 2.0.0 remains at `../` unchanged.

The event key has exactly three colon-separated segments. Entity and canonical event type retain their existing lowercase kebab-case grammar; the identifier segment uses lowercase ASCII letters, digits, dots, underscores, and hyphens, beginning with a letter or digit. The middle segment must match `canonicalEventType`. This contract validates shape and consistency; it does not decide identity or materiality.

Run tests with:

```sh
node --test radar/v2/2.1.1/test/*.test.mjs
```
