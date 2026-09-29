import { validateRadarV21Semantics } from './validator.mjs';
import { normalizeRadar as normalizeLegacyRadar } from '../normalize.mjs';

const RADARS = new Set(['ai', 'dev', 'skill', 'app', 'security']);
const CONFIDENCE = new Set(['high', 'medium', 'low']);
const LEVELS = new Set(['official', 'research', 'ecosystem', 'media', 'community']);
const SIGNALS = new Set(['high', 'medium', 'low']);
const ACTIONS = new Set(['adopt', 'test', 'read', 'watch', 'ignore']);

function object(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
}

function source(value) {
  object(value, 'source');
  if (!LEVELS.has(value.level)) throw new TypeError(`source.level is not supported: ${value.level}`);
  if (typeof value.name !== 'string' || !value.name.trim()) throw new TypeError('source.name must be non-empty');
  return {
    level: value.level,
    name: value.name,
    ...(value.url === undefined ? {} : { url: value.url }),
    ...(value.sourcePublishedAt === undefined ? {} : { sourcePublishedAt: value.sourcePublishedAt }),
    ...(value.sourceAuthority === undefined ? {} : { sourceAuthority: value.sourceAuthority }),
  };
}

function highlight(value) {
  object(value, 'highlight');
  if (!SIGNALS.has(value.signal)) throw new TypeError(`highlight.signal is not supported: ${value.signal}`);
  if (!ACTIONS.has(value.action)) throw new TypeError(`highlight.action is not supported: ${value.action}`);
  const result = {
    title: value.title, type: value.type, signal: value.signal, score: value.score,
    action: value.action, topic: value.topic, entity: value.entity,
    eventKey: value.eventKey, canonicalEventType: value.canonicalEventType,
    eventState: value.eventState, materialChange: value.materialChange,
    observedAt: value.observedAt,
    ...(value.eventOccurredAt === undefined ? {} : { eventOccurredAt: value.eventOccurredAt }),
    duplicate: value.duplicate, confidence: value.confidence,
    sources: value.sources.map(source),
    ...(value.whyItMatters === undefined ? {} : { whyItMatters: value.whyItMatters }),
    ...(value.overrideReason === undefined ? {} : { overrideReason: value.overrideReason }),
  };
  return result;
}

/** Normalize only Contract 2.1. V1 and 2.0 are normalized by their own immutable artifacts. */
export function normalizeRadarV21(report) {
  object(report, 'Radar V2.1 report');
  if (report.schemaVersion !== 2) throw new TypeError('Radar V2.1 report must have schemaVersion: 2');
  if (!RADARS.has(report.radar)) throw new TypeError(`Unsupported Radar id: ${report.radar}`);
  if (!CONFIDENCE.has(report.reportConfidence)) throw new TypeError(`Unsupported reportConfidence: ${report.reportConfidence}`);
  const normalized = {
    sourceSchemaVersion: 2,
    contractVersion: '2.1.2',
    countSemantics: 'v2-highlights',
    title: report.title,
    date: report.date,
    radar: report.radar,
    signalCount: report.signalCount,
    highSignalCount: report.highSignalCount,
    actionableCount: report.actionableCount,
    ...(report.actionRequired === undefined ? {} : { actionRequired: report.actionRequired }),
    verdict: report.verdict,
    topics: [...report.topics],
    reportConfidence: report.reportConfidence,
    publish: report.publish,
    scoreVersion: report.scoreVersion,
    highlights: report.highlights.map(highlight),
  };
  const result = validateRadarV21Semantics(report);
  if (result.errors.length) throw new TypeError(`Invalid Radar V2.1 semantics: ${result.errors.map((item) => `${item.code} ${item.path}`).join('; ')}`);
  return normalized;
}

export function normalizeRadarV1(report) {
  object(report, 'Radar V1 report');
  if (report.schemaVersion !== undefined) throw new TypeError('V1 Radar report must not declare schemaVersion');
  return { ...report, sourceSchemaVersion: 1, countSemantics: 'v1-legacy' };
}

export function normalizeRadar(report) {
  object(report, 'Radar report');
  if (report.schemaVersion === undefined) return normalizeLegacyRadar(report);
  if (report.schemaVersion === 2) {
    const hasV21Fields = report.highlights?.some((item) => ['canonicalEventType', 'eventState', 'materialChange', 'observedAt']
      .some((field) => Object.hasOwn(item, field)));
    return hasV21Fields ? normalizeRadarV21(report) : normalizeLegacyRadar(report);
  }
  throw new TypeError(`Unsupported Radar schemaVersion: ${report.schemaVersion}`);
}
