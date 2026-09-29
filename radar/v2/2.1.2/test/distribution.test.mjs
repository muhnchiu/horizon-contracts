import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateRadarV21Semantics } from '../validator.mjs';

const root = new URL('../', import.meta.url);
const load = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));

test('2.1.2 manifest locks version and all versioned package bytes', async () => {
  const manifest = await load('contract-manifest.json');
  const schema = await load('radar-v2.schema.json');
  assert.equal(manifest.contractVersion, '2.1.2');
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.canonicalOwner, 'muhnchiu/script-manager');
  assert.equal(schema.$id, 'https://github.com/muhnchiu/script-manager/contracts/radar-v2/2.1.2/radar-v2.schema.json');
  assert.equal(schema.properties.schemaVersion.const, 2);
  const hash = createHash('sha256');
  for (const file of manifest.artifactFiles) {
    hash.update(file, 'utf8'); hash.update('\0');
    hash.update(await readFile(new URL(file, root)));
    hash.update('\0');
  }
  assert.equal(hash.digest('hex'), manifest.artifactSha256);
});

test('2.1.2 validates dotted entity keys through Event Identity semantics', async () => {
  const report = await load('fixtures/v2.1/valid-events.json');
  report.highlights[0].eventKey = 'deepseek-v4.1:model-release:initial';
  report.highlights[0].entity = 'deepseek-v4.1';
  assert.equal(validateRadarV21Semantics(report).valid, true);
});
