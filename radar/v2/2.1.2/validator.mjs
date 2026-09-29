export const CANONICAL_EVENT_TYPES = Object.freeze([
  'release', 'model-release', 'skill-release', 'research-release', 'version-update',
  'pricing-change', 'capability-change', 'security-cve', 'security-cisa-kev',
  'security-advisory', 'funding', 'incident', 'documentation',
]);
export const EVENT_STATES = Object.freeze(['NEW', 'DUPLICATE', 'UPDATE']);
export const SOURCE_AUTHORITIES = Object.freeze(['official', 'primary', 'secondary', 'community']);

const eventTypes = new Set(CANONICAL_EVENT_TYPES);
const authorities = new Set(SOURCE_AUTHORITIES);
const entitySegment = '[a-z0-9][a-z0-9._-]*';
const entityOrTypeSegment = '[a-z0-9]+(?:-[a-z0-9]+)*';
const eventIdentifierSegment = '[a-z0-9][a-z0-9._-]*';
const eventKeyPattern = new RegExp(`^${entitySegment}:${entityOrTypeSegment}:${eventIdentifierSegment}$`);
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function validTimestamp(value) {
  if (typeof value !== 'string' || !timestampPattern.test(value)) return false;
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?/);
  if (!parts) return false;
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day
    || hour > 23 || minute > 59 || second > 59) return false;
  if (!Number.isFinite(Date.parse(value))) return false;
  const offset = value.match(/([+-])(\d{2}):(\d{2})$/);
  return !offset || (Number(offset[2]) <= 23 && Number(offset[3]) <= 59);
}

export function validateRadarV21Semantics(report) {
  const errors = [];
  const add = (code, path, message) => errors.push({ code, path, message });
  if (!report || typeof report !== 'object' || !Array.isArray(report.highlights)) {
    add('REPORT_INVALID', '', 'Expected a Radar report with highlights.');
    return { valid: false, errors };
  }
  report.highlights.forEach((item, index) => {
    const path = `/highlights/${index}`;
    for (const field of ['eventKey', 'canonicalEventType', 'eventState', 'materialChange', 'observedAt', 'duplicate']) {
      if (!Object.hasOwn(item, field)) add('REQUIRED_EVENT_FIELD_MISSING', `${path}/${field}`, `${field} is required in Contract 2.1.`);
    }
    if (!eventTypes.has(item.canonicalEventType)) add('CANONICAL_EVENT_TYPE_INVALID', `${path}/canonicalEventType`, 'Unknown canonical event type.');
    if (!EVENT_STATES.includes(item.eventState)) add('EVENT_STATE_INVALID', `${path}/eventState`, 'Unknown event state.');
    if (typeof item.eventKey !== 'string' || !eventKeyPattern.test(item.eventKey)) {
      add('EVENT_KEY_INVALID', `${path}/eventKey`, 'eventKey must contain a lowercase entity starting with a letter or digit and using letters, digits, dot, underscore, or hyphen; a lowercase kebab-case canonical event type; and a lowercase event identifier, separated by exactly two colons.');
    } else if (item.eventKey.split(':')[1] !== item.canonicalEventType) {
      add('EVENT_KEY_TYPE_MISMATCH', `${path}/eventKey`, 'The event type segment must equal canonicalEventType.');
    }
    if (item.eventState === 'NEW' && (item.duplicate !== false || item.materialChange !== false)) add('EVENT_STATE_INVARIANT', path, 'NEW requires duplicate=false and materialChange=false.');
    if (item.eventState === 'DUPLICATE' && (item.duplicate !== true || item.materialChange !== false)) add('EVENT_STATE_INVARIANT', path, 'DUPLICATE requires duplicate=true and materialChange=false.');
    if (item.eventState === 'UPDATE' && (item.duplicate !== false || item.materialChange !== true)) add('EVENT_STATE_INVARIANT', path, 'UPDATE requires duplicate=false and materialChange=true.');
    if (!validTimestamp(item.observedAt)) add('OBSERVED_AT_INVALID', `${path}/observedAt`, 'observedAt must be a valid ISO 8601 datetime.');
    if (item.eventOccurredAt !== undefined && !validTimestamp(item.eventOccurredAt)) add('EVENT_OCCURRED_AT_INVALID', `${path}/eventOccurredAt`, 'eventOccurredAt must be a valid ISO 8601 datetime.');
    if (!Array.isArray(item.sources) || item.sources.length === 0) add('SOURCES_REQUIRED', `${path}/sources`, 'At least one source observation is required.');
    (item.sources ?? []).forEach((source, sourceIndex) => {
      const sourcePath = `${path}/sources/${sourceIndex}`;
      if (source.sourcePublishedAt !== undefined && !validTimestamp(source.sourcePublishedAt)) add('SOURCE_PUBLISHED_AT_INVALID', `${sourcePath}/sourcePublishedAt`, 'sourcePublishedAt must be a valid ISO 8601 datetime.');
      if (source.sourceAuthority !== undefined && !authorities.has(source.sourceAuthority)) add('SOURCE_AUTHORITY_INVALID', `${sourcePath}/sourceAuthority`, 'Unknown source authority.');
    });
  });
  return { valid: errors.length === 0, errors };
}
