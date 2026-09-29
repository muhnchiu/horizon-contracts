import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizeRadar } from '../normalize.mjs';
import { CANONICAL_EVENT_TYPES, EVENT_STATES, SOURCE_AUTHORITIES, validateRadarV21Semantics } from '../validator.mjs';
import { validateRadarV21Semantics as validateV211Semantics } from '../../2.1.1/validator.mjs';

const dir = new URL('../', import.meta.url);
const load = async (path) => JSON.parse(await readFile(new URL(path, dir), 'utf8'));
const valid = await load('fixtures/v2.1/valid-events.json');
const clone = (value) => structuredClone(value);
const single = () => { const report = clone(valid); report.highlights = [report.highlights[0]]; report.signalCount = 1; return report; };
const item = (report) => report.highlights[0];
const errors = (report) => validateRadarV21Semantics(report).errors.map((error) => error.code);

const invalidCases = [
  ['missing eventKey', (x) => { delete x.eventKey; }, 'REQUIRED_EVENT_FIELD_MISSING'],
  ['missing canonicalEventType', (x) => { delete x.canonicalEventType; }, 'REQUIRED_EVENT_FIELD_MISSING'],
  ['missing eventState', (x) => { delete x.eventState; }, 'REQUIRED_EVENT_FIELD_MISSING'],
  ['missing materialChange', (x) => { delete x.materialChange; }, 'REQUIRED_EVENT_FIELD_MISSING'],
  ['missing observedAt', (x) => { delete x.observedAt; }, 'REQUIRED_EVENT_FIELD_MISSING'],
  ['missing duplicate', (x) => { delete x.duplicate; }, 'REQUIRED_EVENT_FIELD_MISSING'],
  ['invalid event type', (x) => { x.canonicalEventType = 'tool-discovery'; }, 'CANONICAL_EVENT_TYPE_INVALID'],
  ['invalid event state', (x) => { x.eventState = 'SETTLED'; }, 'EVENT_STATE_INVALID'],
  ['invalid eventKey uppercase', (x) => { x.eventKey = 'Sample:model-release:v1'; }, 'EVENT_KEY_INVALID'],
  ['invalid eventKey empty segment', (x) => { x.eventKey = 'sample::v1'; }, 'EVENT_KEY_INVALID'],
  ['eventKey/type mismatch', (x) => { x.eventKey = 'sample:release:v1'; }, 'EVENT_KEY_TYPE_MISMATCH'],
  ['NEW duplicate true', (x) => { x.duplicate = true; }, 'EVENT_STATE_INVARIANT'],
  ['NEW material change true', (x) => { x.materialChange = true; }, 'EVENT_STATE_INVARIANT'],
  ['DUPLICATE duplicate false', (x) => { x.eventState = 'DUPLICATE'; x.duplicate = false; }, 'EVENT_STATE_INVARIANT'],
  ['DUPLICATE material change true', (x) => { x.eventState = 'DUPLICATE'; x.duplicate = true; x.materialChange = true; }, 'EVENT_STATE_INVARIANT'],
  ['UPDATE duplicate true', (x) => { x.eventState = 'UPDATE'; x.duplicate = true; x.materialChange = true; }, 'EVENT_STATE_INVARIANT'],
  ['UPDATE material change false', (x) => { x.eventState = 'UPDATE'; x.duplicate = false; x.materialChange = false; }, 'EVENT_STATE_INVARIANT'],
  ['invalid observedAt', (x) => { x.observedAt = '2026-09-29'; }, 'OBSERVED_AT_INVALID'],
  ['invalid eventOccurredAt', (x) => { x.eventOccurredAt = 'yesterday'; }, 'EVENT_OCCURRED_AT_INVALID'],
  ['invalid sourcePublishedAt', (x) => { x.sources[0].sourcePublishedAt = 'not a timestamp'; }, 'SOURCE_PUBLISHED_AT_INVALID'],
  ['invalid sourceAuthority', (x) => { x.sources[0].sourceAuthority = 'verified'; }, 'SOURCE_AUTHORITY_INVALID'],
];

test('Contract 2.1 valid fixtures cover states, multiple sources, optional timestamps and authorities', () => {
  assert.equal(validateRadarV21Semantics(valid).valid, true);
  assert.deepEqual(CANONICAL_EVENT_TYPES, ['release', 'model-release', 'skill-release', 'research-release', 'version-update', 'pricing-change', 'capability-change', 'security-cve', 'security-cisa-kev', 'security-advisory', 'funding', 'incident', 'documentation']);
  assert.deepEqual(EVENT_STATES, ['NEW', 'DUPLICATE', 'UPDATE']);
  assert.deepEqual(SOURCE_AUTHORITIES, ['official', 'primary', 'secondary', 'community']);
  assert.equal(valid.highlights[0].sources.length, 3);
  assert.equal(valid.highlights[1].eventOccurredAt, undefined);
  assert.equal(valid.highlights[1].sources[0].sourcePublishedAt, undefined);
  assert.deepEqual(new Set(valid.highlights.flatMap((highlight) => highlight.sources.map((source) => source.sourceAuthority).filter(Boolean))), new Set(SOURCE_AUTHORITIES));
});

test('report date and event/source/observation timestamps have independent meanings', () => {
  const highlight = valid.highlights[0];
  const source = highlight.sources[0];
  assert.equal(valid.date, '2026-09-29');
  assert.equal(highlight.eventOccurredAt, '2026-09-28T18:00:00+08:00');
  assert.equal(source.sourcePublishedAt, '2026-09-28T19:00:00+08:00');
  assert.equal(highlight.observedAt, '2026-09-29T08:45:00+08:00');
  assert.notEqual(valid.date, highlight.observedAt);
  assert.notEqual(highlight.observedAt, source.sourcePublishedAt);
  assert.notEqual(source.sourcePublishedAt, highlight.eventOccurredAt);
  assert.equal(validateRadarV21Semantics(valid).valid, true);
});

test('semantic validator rejects each required invalid fixture class', () => {
  for (const [name, mutate, expected] of invalidCases) {
    const report = single();
    mutate(item(report));
    assert.ok(errors(report).includes(expected), `${name}: ${errors(report).join(', ')}`);
  }
});

test('Contract 2.1.1 event identifier grammar accepts version/security identifiers and rejects unsafe delimiters', async () => {
  const cases = await load('fixtures/v2.1/event-key-grammar.json');
  const schema = await load('radar-v2.schema.json');
  const pattern = new RegExp(schema.$defs.eventKey.pattern);

  for (const fixture of cases.valid) {
    assert.match(fixture.eventKey, pattern, fixture.eventKey);
    const segments = fixture.eventKey.split(':');
    assert.equal(segments.length, 3, fixture.eventKey);
    assert.equal(segments[1], fixture.canonicalEventType, fixture.eventKey);

    const report = single();
    item(report).eventKey = fixture.eventKey;
    item(report).canonicalEventType = fixture.canonicalEventType;
    assert.equal(validateRadarV21Semantics(report).valid, true, fixture.eventKey);
  }
  for (const eventKey of cases.invalid) assert.doesNotMatch(eventKey, pattern, eventKey);

  const [dotted, hyphenated] = cases.collisionPair;
  assert.match(dotted, pattern);
  assert.match(hyphenated, pattern);
  assert.notEqual(dotted, hyphenated);
  assert.notEqual(dotted.replaceAll('.', '-'), dotted);
});

test('normalizer preserves Contract 2.1 event and observation fields without synthesis', async () => {
  const normalized = normalizeRadar(valid);
  assert.equal(normalized.contractVersion, '2.1.2');
  assert.equal(normalized.date, valid.date);
  assert.equal(normalized.highlights[0].observedAt, valid.highlights[0].observedAt);
  assert.equal(normalized.highlights[0].sources.length, 3);
  assert.equal(normalized.highlights[1].eventOccurredAt, undefined);
  assert.equal(normalized.highlights[1].sources[0].sourcePublishedAt, undefined);
});

test('historical V1 and Contract 2.0 use their original normalizer and receive no fabricated V2.1 fields', async () => {
  const v1 = await load('fixtures/compatibility/v1-legacy.json');
  const v2 = await load('fixtures/compatibility/v2-legacy-event-model.json');
  const normalizedV1 = normalizeRadar(v1);
  const normalizedV2 = normalizeRadar(v2);
  assert.equal(normalizedV1.signalCount, 9);
  assert.equal(normalizedV1.countSemantics, 'v1-legacy');
  assert.equal(normalizedV2.signalCount, 1);
  assert.equal(normalizedV2.countSemantics, 'v2-highlights');
  for (const normalized of [normalizedV1, normalizedV2]) {
    assert.equal(normalized.highlights[0]?.canonicalEventType, undefined);
    assert.equal(normalized.highlights[0]?.eventState, undefined);
    assert.equal(normalized.highlights[0]?.materialChange, undefined);
    assert.equal(normalized.highlights[0]?.observedAt, undefined);
    assert.equal(normalized.highlights[0]?.eventOccurredAt, undefined);
  }
  assert.equal(normalizedV2.date, '2026-09-29');
});

test('Contract 2.1 schema locks version, required event fields and source-scoped optional timestamps', async () => {
  const schema = await load('radar-v2.schema.json');
  const manifest = await load('contract-manifest.json');
  assert.equal(manifest.contractVersion, '2.1.2');
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(schema.properties.schemaVersion.const, 2);
  const required = schema.$defs.highlight.required;
  for (const field of ['eventKey', 'canonicalEventType', 'eventState', 'materialChange', 'observedAt', 'duplicate']) assert.ok(required.includes(field));
  assert.ok(!required.includes('eventOccurredAt'));
  assert.ok(!required.includes('sourcePublishedAt'));
  assert.ok(!required.includes('sourceAuthority'));
  assert.ok(!required.includes('firstSeen'));
  assert.ok(!required.includes('observationId'));
  assert.ok(schema.$defs.source.properties.sourcePublishedAt);
  assert.ok(schema.$defs.source.properties.sourceAuthority);
});


test('Contract 2.1.2 accepts the expanded entity grammar and preserves the canonical event type grammar', async () => {
  const grammar = await load('fixtures/v2.1.2/event-key-grammar.json');
  const schema = await load('radar-v2.schema.json');
  const oldSchema = JSON.parse(await readFile(new URL('../../2.1.1/radar-v2.schema.json', import.meta.url), 'utf8'));
  const pattern = new RegExp(schema.$defs.eventKey.pattern);
  const oldPattern = new RegExp(oldSchema.$defs.eventKey.pattern);
  assert.deepEqual(schema.$defs.eventType.enum, oldSchema.$defs.eventType.enum);
  assert.equal(
    schema.$defs.eventKey.pattern.replace('^[a-z0-9][a-z0-9._-]*:', '^[a-z0-9]+(?:-[a-z0-9]+)*:'),
    oldSchema.$defs.eventKey.pattern,
    'canonical event type and event identifier grammar remain byte-for-byte unchanged',
  );

  for (const eventKey of grammar.valid) {
    assert.match(eventKey, pattern, eventKey);
    assert.equal(eventKey.split(':').length, 3, eventKey);
    assert.doesNotMatch(eventKey, oldPattern, `2.1.1 remains unchanged: ${eventKey}`);
  }
  for (const eventKey of grammar.invalid) assert.doesNotMatch(eventKey, pattern, eventKey);
  assert.equal(grammar.valid.some((eventKey) => eventKey.split(':').length !== 3), false);

  const report = single();
  item(report).eventKey = 'deepseek-v4.1:model-release:initial';
  item(report).canonicalEventType = 'model-release';
  assert.equal(validateRadarV21Semantics(report).valid, true);
  assert.ok(validateV211Semantics(report).errors.some(({ code }) => code === 'EVENT_KEY_INVALID'));

  const normalized = normalizeRadar(report);
  assert.equal(normalized.contractVersion, '2.1.2');
  assert.equal(normalized.highlights[0].eventKey, 'deepseek-v4.1:model-release:initial');
});
