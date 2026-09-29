import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateRadarV21Semantics } from '../validator.mjs';

const root = new URL('../', import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));

test('distribution manifest pins canonical source and verifies every artifact byte', async () => {
  const manifest = await readJson('contract-manifest.json');
  assert.equal(manifest.contractVersion, '2.1.0');
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.canonicalCommit, '7f166e7b0765e7f727654a4397e06b8f92690ca7');
  const hash = createHash('sha256');
  for (const file of manifest.artifactFiles) {
    hash.update(file, 'utf8'); hash.update('\0');
    hash.update(await readFile(new URL(file, root)));
    hash.update('\0');
  }
  assert.equal(hash.digest('hex'), manifest.artifactSha256);
});

test('distribution contract accepts the legal time/state fixture and rejects all negative fixtures', async () => {
  const valid = await readJson('fixtures/v2.1/valid-events.json');
  assert.equal(validateRadarV21Semantics(valid).valid, true);
  const cases = await readJson('fixtures/v2.1/invalid-cases.json');
  assert.ok(cases.length >= 19);
  for (const fixture of cases) {
    const result = validateRadarV21Semantics(fixture.report);
    assert.ok(result.errors.some((error) => error.code === fixture.expectedError), fixture.name);
  }
});
