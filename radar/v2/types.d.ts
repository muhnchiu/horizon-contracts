export type RadarId = 'ai' | 'dev' | 'skill' | 'app' | 'security';
export type Confidence = 'high' | 'medium' | 'low';
export type V1Signal = 'critical' | 'high' | 'medium' | 'low';
export type V2Signal = 'high' | 'medium' | 'low';
export type V1Action = 'action' | 'test' | 'read' | 'watch' | 'ignore' | 'explore';
export type V2Action = 'adopt' | 'test' | 'read' | 'watch' | 'ignore';
export type SourceLevel = 'official' | 'research' | 'ecosystem' | 'media' | 'community';
export type EventType = 'release' | 'product-update' | 'security-advisory' | 'vulnerability'
  | 'research-publication' | 'adoption-signal' | 'policy-change' | 'other';

export interface RadarV1SourceFields {
  sourceLevel: SourceLevel;
  sourceName?: string;
  sourceUrl?: string;
}

export interface RadarV1Highlight extends RadarV1SourceFields {
  title: string;
  type: string;
  signal: V1Signal;
  action: V1Action;
  topic?: string;
}

/** Versionless V1. Existing historical files intentionally have no schemaVersion. */
export interface RadarV1 {
  schemaVersion?: undefined;
  title: string;
  description?: string;
  date: string;
  updated?: string;
  radar: RadarId;
  signalCount: number;
  highSignalCount: number;
  actionableCount: number;
  actionRequired: number;
  verdict: string;
  highlights: RadarV1Highlight[];
  topics: string[];
  tags?: string[];
  events?: string[];
  confidence: Confidence;
  publish: boolean;
}

export interface RadarV2Source {
  level: SourceLevel;
  name: string;
  url?: string;
}

export interface RadarV2Highlight {
  title: string;
  type: string;
  signal: V2Signal;
  score: number;
  action: V2Action;
  topic: string;
  primaryRadar: RadarId;
  relatedRadars?: RadarId[];
  whyItMatters?: string;
  entity: string;
  eventType: EventType;
  eventKey: string;
  firstSeen: string;
  lastSeen: string;
  confidence: Confidence;
  source: RadarV2Source;
  overrideReason?: string;
}

export interface RadarV2 {
  schemaVersion: 2;
  scoreVersion: string;
  title: string;
  date: string;
  radar: RadarId;
  signalCount: number;
  highSignalCount: number;
  actionableCount: number;
  /** Temporary UI compatibility alias; canonical V2 may omit it. */
  actionRequired?: number;
  verdict: string;
  topics: string[];
  highlights: RadarV2Highlight[];
  reportConfidence: Confidence;
  publish: boolean;
}

export interface NormalizedSource {
  level: SourceLevel;
  name?: string;
  url?: string;
}

export interface NormalizedHighlight {
  title: string;
  type: string;
  signal: V2Signal;
  action: V2Action;
  topic?: string;
  score?: number;
  primaryRadar: RadarId;
  relatedRadars: RadarId[];
  whyItMatters?: string;
  entity?: string;
  eventType?: EventType;
  eventKey?: string;
  firstSeen?: string;
  lastSeen?: string;
  confidence?: Confidence;
  sources: NormalizedSource[];
  overrideReason?: string;
}

export interface NormalizedRadar {
  sourceSchemaVersion: 1 | 2;
  countSemantics: 'v1-legacy' | 'v2-highlights';
  title: string;
  description?: string;
  date: string;
  updated?: string;
  radar: RadarId;
  signalCount: number;
  highSignalCount: number;
  actionableCount: number;
  actionRequired?: number;
  verdict: string;
  topics: string[];
  tags?: string[];
  events?: string[];
  reportConfidence: Confidence;
  publish: boolean;
  scoreVersion?: string;
  highlights: NormalizedHighlight[];
}
