import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateRadarV21Semantics } from '../validator.mjs';

const root = new URL('../', import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));

test('distribution manifest pins canonical source and verifies every artifact byte', async () => {
  const manifest = await readJson('contract-manifest.json');
  assert.equal(manifest.contractVersion, '2.1.1');
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.canonicalCommit, 'afbf42fc554588117c23c17607005c11d29793d3');
  const hash = createHash('sha256');
  for (const file of manifest.artifactFiles) {
    hash.update(file, 'utf8'); hash.update('\0');
    hash.update(await readFile(new URL(file, root)));
    hash.update('\0');
  }
  assert.equal(hash.digest('hex'), manifest.artifactSha256);
});

test('distribution validates Event Identity fixtures and event identifier grammar', async () => {
  const valid = await readJson('fixtures/v2.1/valid-events.json');
  assert.equal(validateRadarV21Semantics(valid).valid, true);
  const grammar = await readJson('fixtures/v2.1/event-key-grammar.json');
  const schema = await readJson('radar-v2.schema.json');
  const pattern = new RegExp(schema.$defs.eventKey.pattern);
  for (const fixture of grammar.valid) {
    assert.match(fixture.eventKey, pattern, fixture.eventKey);
    assert.equal(fixture.eventKey.split(':').length, 3);
    assert.equal(fixture.eventKey.split(':')[1], fixture.canonicalEventType);
  }
  for (const eventKey of grammar.invalid) assert.doesNotMatch(eventKey, pattern, eventKey);
  assert.equal(validateRadarV21Semantics(valid).valid, true);
  const cases = await readJson('fixtures/v2.1/invalid-cases.json');
  assert.ok(cases.length >= 19);
  for (const fixture of cases) {
    const result = validateRadarV21Semantics(fixture.report);
    assert.ok(result.errors.some((error) => error.code === fixture.expectedError), fixture.name);
  }
});
