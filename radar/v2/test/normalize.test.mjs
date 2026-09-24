import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { normalizeRadar, normalizeRadarV1, normalizeRadarV2 } from '../normalize.mjs';

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(currentDir, '..');

async function fixture(path) {
  return JSON.parse(await readFile(resolve(packageDir, path), 'utf8'));
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

test('V1 normalizes all legacy signals/actions, flat source fields, and preserves legacy counts', async () => {
  const input = await fixture('fixtures/v1/v1-legacy-signals.json');
  const before = structuredClone(input);
  deepFreeze(input);

  const normalized = normalizeRadarV1(input);

  assert.equal(normalized.sourceSchemaVersion, 1);
  assert.equal(normalized.countSemantics, 'v1-legacy');
  assert.equal(normalized.signalCount, 13);
  assert.notEqual(normalized.signalCount, normalized.highlights.length);
  assert.equal(normalized.highSignalCount, 2);
  assert.equal(normalized.actionableCount, 2);
  assert.equal(normalized.actionRequired, 1);
  assert.deepEqual(normalized.highlights.map(({ signal }) => signal), ['high', 'high', 'medium', 'low', 'high']);
  assert.deepEqual(normalized.highlights.map(({ action }) => action), ['adopt', 'test', 'read', 'watch', 'ignore']);
  assert.deepEqual(normalized.highlights[0].sources, [{
    level: 'official', name: 'Vendor', url: 'https://example.com/action',
  }]);
  assert.equal(normalized.highlights[0].primaryRadar, 'dev');
  assert.deepEqual(input, before);
});

test('V1 explore defaults to read and publish:false is preserved', async () => {
  const input = await fixture('fixtures/v1/v1-explore-publish-false.json');
  const normalized = normalizeRadar(input);

  assert.equal(normalized.sourceSchemaVersion, 1);
  assert.equal(normalized.highlights[0].action, 'read');
  assert.equal(normalized.publish, false);
  assert.deepEqual(normalized.highlights[0].sources, [{
    level: 'community', name: 'Community', url: 'https://example.com/explore',
  }]);
});

test('V2 normalizes nested source and preserves V2 contract fields and publish:false', async () => {
  const input = await fixture('fixtures/v2/v2-nested-source-publish-false.json');
  const before = structuredClone(input);
  deepFreeze(input);

  const normalized = normalizeRadarV2(input);

  assert.equal(normalized.sourceSchemaVersion, 2);
  assert.equal(normalized.countSemantics, 'v2-highlights');
  assert.equal(normalized.scoreVersion, '2.1');
  assert.equal(normalized.signalCount, 3);
  assert.equal(normalized.highSignalCount, 1);
  assert.equal(normalized.actionableCount, 2);
  assert.equal(normalized.publish, false);
  assert.deepEqual(normalized.highlights.map(({ action }) => action), ['adopt', 'test', 'ignore']);
  assert.deepEqual(normalized.highlights.map(({ signal }) => signal), ['high', 'medium', 'low']);
  assert.deepEqual(normalized.highlights[0].relatedRadars, ['ai']);
  assert.equal(normalized.highlights[0].eventKey, 'zai-zcode-release-2026-09');
  assert.equal(normalized.highlights[0].score, 82);
  assert.equal(normalized.highlights[0].confidence, 'medium');
  assert.deepEqual(normalized.highlights[0].sources, [{
    level: 'ecosystem', name: 'ZCode repository', url: 'https://example.com/zcode',
  }]);
  assert.deepEqual(normalized.highlights[2].sources, [{ level: 'community', name: 'Community report' }]);
  assert.deepEqual(input, before);
});

test('normalizeRadar dispatches by source schema version and rejects unsupported versions', async () => {
  const v1 = await fixture('fixtures/v1/v1-legacy-signals.json');
  const v2 = await fixture('fixtures/v2/v2-nested-source-publish-false.json');

  assert.equal(normalizeRadar(v1).sourceSchemaVersion, 1);
  assert.equal(normalizeRadar(v2).sourceSchemaVersion, 2);
  assert.throws(() => normalizeRadar({ ...v1, schemaVersion: 3 }), /Unsupported Radar schemaVersion: 3/);
  assert.throws(() => normalizeRadarV1({ ...v1, schemaVersion: 1 }), /must not declare schemaVersion/);
});

test('normalization is deterministic and exposes its count semantics', async () => {
  const v1 = await fixture('fixtures/v1/v1-legacy-signals.json');
  const v2 = await fixture('fixtures/v2/v2-nested-source-publish-false.json');

  assert.deepEqual(normalizeRadar(v1), normalizeRadar(v1));
  assert.deepEqual(normalizeRadar(v2), normalizeRadar(v2));
  assert.equal(normalizeRadar(v1).countSemantics, 'v1-legacy');
  assert.equal(normalizeRadar(v2).countSemantics, 'v2-highlights');
});

test('canonical schema and manifest declare the same contract version and owner', async () => {
  const manifest = JSON.parse(await readFile(resolve(packageDir, 'contract-manifest.json'), 'utf8'));
  const schema = JSON.parse(await readFile(resolve(packageDir, 'radar-v2.schema.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.contractVersion, '2.0.0');
  assert.equal(manifest.canonicalOwner, 'muhnchiu/script-manager');
  assert.equal(manifest.canonicalSchema, 'contracts/radar-v2/radar-v2.schema.json');
  assert.equal(schema.properties.schemaVersion.const, manifest.schemaVersion);
  assert.equal(schema['x-radar-count-semantics'].signalCount, 'highlights.length');
});
