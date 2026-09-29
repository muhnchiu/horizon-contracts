export type RadarId = 'ai' | 'dev' | 'skill' | 'app' | 'security';
export type Confidence = 'high' | 'medium' | 'low';
export type Signal = 'high' | 'medium' | 'low';
export type Action = 'adopt' | 'test' | 'read' | 'watch' | 'ignore';
export type SourceLevel = 'official' | 'research' | 'ecosystem' | 'media' | 'community';
export type CanonicalEventType = 'release' | 'model-release' | 'skill-release' | 'research-release'
  | 'version-update' | 'pricing-change' | 'capability-change' | 'security-cve'
  | 'security-cisa-kev' | 'security-advisory' | 'funding' | 'incident' | 'documentation';
export type EventState = 'NEW' | 'DUPLICATE' | 'UPDATE';
export type SourceAuthority = 'official' | 'primary' | 'secondary' | 'community';

export interface RadarV21Source {
  level: SourceLevel;
  name: string;
  url?: string;
  /** Original publication time of this source evidence, not event or observation time. */
  sourcePublishedAt?: string;
  sourceAuthority?: SourceAuthority;
}

export interface RadarV21Highlight {
  title: string;
  type: string;
  signal: Signal;
  score: number;
  action: Action;
  topic: string;
  entity: string;
  eventKey: string;
  canonicalEventType: CanonicalEventType;
  eventState: EventState;
  materialChange: boolean;
  /** Time this observation was made by the Radar. */
  observedAt: string;
  /** Best-effort time the real-world event occurred. */
  eventOccurredAt?: string;
  duplicate: boolean;
  confidence: Confidence;
  sources: RadarV21Source[];
  whyItMatters?: string;
  overrideReason?: string;
}

export interface RadarV21 {
  schemaVersion: 2;
  scoreVersion: string;
  title: string;
  /** Radar report/content date. It is not an observation timestamp. */
  date: string;
  radar: RadarId;
  signalCount: number;
  highSignalCount: number;
  actionableCount: number;
  actionRequired?: number;
  verdict: string;
  topics: string[];
  highlights: RadarV21Highlight[];
  reportConfidence: Confidence;
  publish: boolean;
}

export interface NormalizedV21Source extends RadarV21Source {}
export interface NormalizedV21Highlight extends RadarV21Highlight { sources: NormalizedV21Source[] }
export interface NormalizedV21Radar extends Omit<RadarV21, 'highlights'> {
  sourceSchemaVersion: 2;
  contractVersion: '2.1.1';
  countSemantics: 'v2-highlights';
  highlights: NormalizedV21Highlight[];
}
