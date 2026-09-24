const RADAR_IDS = new Set(['ai', 'dev', 'skill', 'app', 'security']);
const CONFIDENCE_LEVELS = new Set(['high', 'medium', 'low']);
const SOURCE_LEVELS = new Set(['official', 'research', 'ecosystem', 'media', 'community']);

const V1_ACTION_MAP = Object.freeze({
  action: 'adopt',
  test: 'test',
  read: 'read',
  watch: 'watch',
  ignore: 'ignore',
  explore: 'read',
});

const V1_SIGNAL_MAP = Object.freeze({
  critical: 'high',
  high: 'high',
  medium: 'medium',
  low: 'low',
});

const V2_ACTIONS = new Set(['adopt', 'test', 'read', 'watch', 'ignore']);
const V2_SIGNALS = new Set(['high', 'medium', 'low']);

function requireObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

function requireRadar(radar, label = 'radar') {
  if (!RADAR_IDS.has(radar)) throw new TypeError(`${label} is not a supported Radar id: ${radar}`);
}

function requireConfidence(confidence, label = 'confidence') {
  if (!CONFIDENCE_LEVELS.has(confidence)) throw new TypeError(`${label} is not supported: ${confidence}`);
}

function normalizeV1Source(highlight) {
  if (!SOURCE_LEVELS.has(highlight.sourceLevel)) {
    throw new TypeError(`sourceLevel is not supported: ${highlight.sourceLevel}`);
  }
  return {
    level: highlight.sourceLevel,
    ...(highlight.sourceName === undefined ? {} : { name: highlight.sourceName }),
    ...(highlight.sourceUrl === undefined ? {} : { url: highlight.sourceUrl }),
  };
}

function normalizeV2Source(source) {
  requireObject(source, 'source');
  if (!SOURCE_LEVELS.has(source.level)) throw new TypeError(`source.level is not supported: ${source.level}`);
  if (typeof source.name !== 'string' || source.name.length === 0) {
    throw new TypeError('source.name must be a non-empty string');
  }
  return {
    level: source.level,
    name: source.name,
    ...(source.url === undefined ? {} : { url: source.url }),
  };
}

function normalizeV1Highlight(highlight, reportRadar) {
  requireObject(highlight, 'V1 highlight');
  const signal = V1_SIGNAL_MAP[highlight.signal];
  if (!signal) throw new TypeError(`V1 signal is not supported: ${highlight.signal}`);
  const action = V1_ACTION_MAP[highlight.action];
  if (!action) throw new TypeError(`V1 action is not supported: ${highlight.action}`);
  return {
    title: highlight.title,
    type: highlight.type,
    signal,
    action,
    ...(highlight.topic === undefined ? {} : { topic: highlight.topic }),
    primaryRadar: reportRadar,
    relatedRadars: [],
    sources: [normalizeV1Source(highlight)],
  };
}

function normalizeV2Highlight(highlight) {
  requireObject(highlight, 'V2 highlight');
  if (!V2_SIGNALS.has(highlight.signal)) throw new TypeError(`V2 signal is not supported: ${highlight.signal}`);
  if (!V2_ACTIONS.has(highlight.action)) throw new TypeError(`V2 action is not supported: ${highlight.action}`);
  requireRadar(highlight.primaryRadar, 'primaryRadar');
  const relatedRadars = [...(highlight.relatedRadars ?? [])];
  relatedRadars.forEach((radar, index) => requireRadar(radar, `relatedRadars[${index}]`));
  return {
    title: highlight.title,
    type: highlight.type,
    signal: highlight.signal,
    score: highlight.score,
    action: highlight.action,
    topic: highlight.topic,
    primaryRadar: highlight.primaryRadar,
    relatedRadars,
    ...(highlight.whyItMatters === undefined ? {} : { whyItMatters: highlight.whyItMatters }),
    entity: highlight.entity,
    eventType: highlight.eventType,
    eventKey: highlight.eventKey,
    firstSeen: highlight.firstSeen,
    lastSeen: highlight.lastSeen,
    confidence: highlight.confidence,
    sources: [normalizeV2Source(highlight.source)],
    ...(highlight.overrideReason === undefined ? {} : { overrideReason: highlight.overrideReason }),
  };
}

export function normalizeRadarV1(report) {
  requireObject(report, 'V1 Radar report');
  if (report.schemaVersion !== undefined) {
    throw new TypeError('V1 Radar report must not declare schemaVersion');
  }
  requireRadar(report.radar);
  requireConfidence(report.confidence, 'report confidence');
  return {
    sourceSchemaVersion: 1,
    countSemantics: 'v1-legacy',
    title: report.title,
    ...(report.description === undefined ? {} : { description: report.description }),
    date: report.date,
    ...(report.updated === undefined ? {} : { updated: report.updated }),
    radar: report.radar,
    signalCount: report.signalCount,
    highSignalCount: report.highSignalCount,
    actionableCount: report.actionableCount,
    actionRequired: report.actionRequired,
    verdict: report.verdict,
    topics: [...report.topics],
    ...(report.tags === undefined ? {} : { tags: [...report.tags] }),
    ...(report.events === undefined ? {} : { events: [...report.events] }),
    reportConfidence: report.confidence,
    publish: report.publish,
    highlights: report.highlights.map((highlight) => normalizeV1Highlight(highlight, report.radar)),
  };
}

export function normalizeRadarV2(report) {
  requireObject(report, 'V2 Radar report');
  if (report.schemaVersion !== 2) throw new TypeError('V2 Radar report must have schemaVersion: 2');
  requireRadar(report.radar);
  requireConfidence(report.reportConfidence, 'reportConfidence');
  return {
    sourceSchemaVersion: 2,
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
    highlights: report.highlights.map((highlight) => normalizeV2Highlight(highlight)),
  };
}

export function normalizeRadar(report) {
  requireObject(report, 'Radar report');
  if (report.schemaVersion === 2) return normalizeRadarV2(report);
  if (report.schemaVersion === undefined) return normalizeRadarV1(report);
  throw new TypeError(`Unsupported Radar schemaVersion: ${report.schemaVersion}`);
}
