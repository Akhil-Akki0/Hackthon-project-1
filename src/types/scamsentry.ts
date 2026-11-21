export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type ScamCategory =
  | 'Banking Fraud'
  | 'OTP Theft'
  | 'Phishing'
  | 'Fake Customer Support'
  | 'Investment Fraud'
  | 'Job Scams'
  | 'Lottery Scams'
  | 'Identity Theft'
  | 'Impersonation'
  | 'Romance Scams'
  | 'Social Engineering'
  | 'Payment Fraud'
  | 'Benign / Unclear';

export type NavSection =
  | 'dashboard'
  | 'live-monitor'
  | 'ai-decoy'
  | 'scam-analyzer'
  | 'scam-intelligence'
  | 'evidence-reports'
  | 'family-protection'
  | 'settings';

export type AnalysisEngineSource = 'gemini-live' | 'deterministic-fallback';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  region: string;
  avatarUrl: string;
  createdAt: string;
}

export interface TranscriptMessage {
  id: string;
  speaker: 'caller' | 'user' | 'ai-decoy' | 'system';
  text: string;
  timestamp: string;
  flaggedPhrases?: string[];
  detectedTactic?: string;
}

export interface UrlInspectionResult {
  url: string;
  domain: string;
  isHttps: boolean;
  hasIpHost: boolean;
  isShortener: boolean;
  suspiciousTld: boolean;
  lookalikeBrand: string | null;
  characteristics: string[];
  riskScore: number;
  note: string;
}

export interface ScamAnalysisResult {
  risk_score: number;
  risk_level: RiskLevel;
  confidence: number;
  scam_category: ScamCategory;
  detected_patterns: string[];
  suspicious_phrases: string[];
  explanation: string;
  recommended_actions: string[];
  requires_user_attention: boolean;
  safer_next_steps: string[];
  extracted_indicators: {
    urls: string[];
    phoneNumbers: string[];
    paymentIdentifiers: string[];
  };
  url_inspections?: UrlInspectionResult[];
  engine: AnalysisEngineSource;
  fallbackReason?: string;
}

export interface CallSession {
  id: string;
  userId: string;
  title: string;
  callerLabel: string;
  channel: 'Voice Call (Simulated)' | 'Manual Transcript' | 'Agora Channel (Demo)';
  status: 'monitoring' | 'decoy-active' | 'ended';
  startedAt: string;
  endedAt?: string;
  durationSec: number;
  transcript: TranscriptMessage[];
  latestAnalysis: ScamAnalysisResult;
  isSimulated: boolean;
}

export interface ScamAnalysisRecord {
  id: string;
  userId: string;
  inputType: 'sms' | 'whatsapp' | 'email' | 'url' | 'file' | 'transcript';
  inputPreview: string;
  createdAt: string;
  result: ScamAnalysisResult;
  isSimulated: boolean;
}

export interface DecoySession {
  id: string;
  userId: string;
  callSessionId?: string;
  scenarioTitle: string;
  callerPersona: string;
  status: 'idle' | 'active' | 'paused' | 'completed';
  startedAt: string;
  endedAt?: string;
  durationSec: number;
  messages: TranscriptMessage[];
  detectedTactics: string[];
  extractedIndicators: {
    urls: string[];
    phoneNumbers: string[];
    paymentIdentifiers: string[];
  };
  summary: string;
  voiceAdapterMode: 'DEMO_MODE' | 'AGORA_MURF_LIVE';
  engine: AnalysisEngineSource;
  isSimulated: boolean;
}

export interface ThreatIndicator {
  id: string;
  patternTitle: string;
  scamCategory: ScamCategory;
  commonPhrase: string;
  indicators: string[];
  reportCount: number;
  firstSeen: string;
  lastSeen: string;
  riskLevel: RiskLevel;
  recommendedAction: string;
  communityWarning: string;
  isSimulated: boolean;
}

export interface IntelligenceReport {
  id: string;
  userId: string;
  sourceType: 'live-call' | 'decoy-session' | 'scam-analyzer' | 'interactive-demo';
  sourceId: string;
  createdAt: string;
  scamCategory: ScamCategory;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  conversationSummary: string;
  suspiciousPhrases: string[];
  scamTechniques: string[];
  extractedIndicators: {
    urls: string[];
    phoneNumbers: string[];
    paymentIdentifiers: string[];
  };
  recommendedActions: string[];
  relevantTimestamps: Array<{ time: string; excerpt: string }>;
  aiExplanation: string;
  preliminaryNotice: string;
  isSimulated: boolean;
}

export interface FamilyContact {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  contactChannel: string;
  notifyOnHighRisk: boolean;
  createdAt: string;
}

export interface FamilyAlertLog {
  id: string;
  userId: string;
  contactName: string;
  message: string;
  riskLevel: RiskLevel;
  scamCategory: ScamCategory;
  consentGranted: boolean;
  deliveryMode: 'In-App Simulation';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'high-risk' | 'intelligence' | 'decoy-complete' | 'report-ready' | 'family-alert';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  targetSection?: NavSection;
}

export interface UserSettings {
  userId: string;
  consentToMonitor: boolean;
  autoFlagCriticalCalls: boolean;
  notifyFamilyOnCritical: boolean;
  familyProtectionEnabled: boolean;
  voiceAdapterPreference: 'demo-simulated' | 'agora-murf-when-configured';
  speechToTextMode: 'browser-or-simulated' | 'whisper-endpoint-when-configured';
  aiDepth: 'standard' | 'detailed';
  dataRetentionDays: 7 | 30 | 90;
  redactSensitiveTokens: boolean;
  updatedAt: string;
}

export interface AdapterHealth {
  serverOnline: boolean;
  geminiConfigured: boolean;
  agoraConfigured: boolean;
  murfConfigured: boolean;
  firebaseConfigured: boolean;
  mode: 'DEMO_MODE' | 'HYBRID_LIVE_AI';
}

export interface DemoScenario {
  id: 'banking-otp' | 'fake-job' | 'investment-fraud';
  code: 'Scenario A' | 'Scenario B' | 'Scenario C';
  title: string;
  category: ScamCategory;
  callerLabel: string;
  summary: string;
  callerScript: string[];
  scammerFollowUps: string[];
}
