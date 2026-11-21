import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEMO_SCENARIOS,
  SEED_ANALYSES,
  SEED_CALL_SESSIONS,
  SEED_DECOY_SESSIONS,
  SEED_FAMILY_ALERTS,
  SEED_FAMILY_CONTACTS,
  SEED_NOTIFICATIONS,
  SEED_REPORTS,
  SEED_SETTINGS,
  SEED_THREAT_INDICATORS,
  SEED_USER,
} from '../data/seedData';
import {
  clearLocalWorkspace,
  loadLocalWorkspace,
  saveLocalWorkspace,
  type PersistedWorkspaceState,
} from '../services/adapters';
import { analyzeWithServer, fetchAdapterHealth, generateDecoyReplyWithServer } from '../services/apiClient';
import type {
  AdapterHealth,
  CallSession,
  DecoySession,
  DemoScenario,
  FamilyAlertLog,
  FamilyContact,
  IntelligenceReport,
  NavSection,
  NotificationItem,
  ScamAnalysisRecord,
  ScamAnalysisResult,
  ScamCategory,
  ThreatIndicator,
  TranscriptMessage,
  UserProfile,
  UserSettings,
} from '../types/scamsentry';
import {
  computeDashboardMetrics,
  extractIndicators,
  redactSensitiveCredentials,
  type DashboardAggregates,
} from '../utils/scamEngine';

function createInitialState(): PersistedWorkspaceState {
  const loaded = loadLocalWorkspace();
  if (loaded) {
    return loaded;
  }
  return {
    user: SEED_USER,
    callSessions: SEED_CALL_SESSIONS,
    scamAnalyses: SEED_ANALYSES,
    decoySessions: SEED_DECOY_SESSIONS,
    threatIndicators: SEED_THREAT_INDICATORS,
    reports: SEED_REPORTS,
    familyContacts: SEED_FAMILY_CONTACTS,
    familyAlerts: SEED_FAMILY_ALERTS,
    notifications: SEED_NOTIFICATIONS,
    settings: SEED_SETTINGS,
  };
}

function nowTimeStr(): string {
  return new Date().toTimeString().slice(0, 8);
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

interface ScamSentryContextValue {
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  health: AdapterHealth;
  user: UserProfile;
  callSessions: CallSession[];
  activeCallId: string | null;
  setActiveCallId: (id: string | null) => void;
  scamAnalyses: ScamAnalysisRecord[];
  decoySessions: DecoySession[];
  activeDecoyId: string | null;
  setActiveDecoyId: (id: string | null) => void;
  threatIndicators: ThreatIndicator[];
  reports: IntelligenceReport[];
  selectedReportId: string | null;
  setSelectedReportId: (id: string | null) => void;
  familyContacts: FamilyContact[];
  familyAlerts: FamilyAlertLog[];
  notifications: NotificationItem[];
  settings: UserSettings;
  metrics: DashboardAggregates;
  demoModalOpen: boolean;
  setDemoModalOpen: (open: boolean) => void;

  // Actions
  analyzeStandaloneInput: (
    text: string,
    inputType: ScamAnalysisRecord['inputType']
  ) => Promise<ScamAnalysisRecord>;
  startLiveCallSession: (opts?: { title?: string; callerLabel?: string; channel?: CallSession['channel'] }) => CallSession;
  appendCallTranscript: (callId: string, speaker: TranscriptMessage['speaker'], text: string, skipAnalysis?: boolean) => Promise<CallSession | null>;
  endLiveCallSession: (callId: string, generateReport?: boolean) => IntelligenceReport | null;
  activateDecoyForCall: (callId: string) => Promise<DecoySession | null>;
  startStandaloneDecoy: (scenario: DemoScenario) => Promise<DecoySession>;
  sendCallerToDecoy: (decoyId: string, callerText: string) => Promise<void>;
  toggleDecoyStatus: (decoyId: string) => void;
  completeDecoySession: (decoyId: string) => IntelligenceReport | null;
  createReportFromAnalysis: (record: ScamAnalysisRecord) => IntelligenceReport;
  addThreatContribution: (params: {
    patternTitle: string;
    category: ScamCategory;
    commonPhrase: string;
    indicators: string[];
    riskLevel: ThreatIndicator['riskLevel'];
    recommendedAction: string;
  }) => void;
  addFamilyContact: (contact: { name: string; relationship: string; contactChannel: string }) => void;
  removeFamilyContact: (id: string) => void;
  toggleFamilyContactNotify: (id: string) => void;
  triggerFamilyAlert: (params: {
    scamCategory: ScamCategory;
    riskLevel: ThreatIndicator['riskLevel'];
    message: string;
  }) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
  updateUserProfile: (patch: Partial<UserProfile>) => void;
  resetDemoWorkspace: () => void;
  clearAllData: () => void;
}

const ScamSentryContext = createContext<ScamSentryContextValue | null>(null);

export function ScamSentryProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<PersistedWorkspaceState>(createInitialState);
  const workspaceRef = useRef<PersistedWorkspaceState>(workspace);

  const commitWorkspace = useCallback(
    (updater: (prev: PersistedWorkspaceState) => PersistedWorkspaceState) => {
      const next = updater(workspaceRef.current);
      workspaceRef.current = next;
      setWorkspace(next);
      return next;
    },
    []
  );

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeCallId, setActiveCallId] = useState<string | null>(workspace.callSessions[0]?.id ?? null);
  const [activeDecoyId, setActiveDecoyId] = useState<string | null>(workspace.decoySessions[0]?.id ?? null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(workspace.reports[0]?.id ?? null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  const [health, setHealth] = useState<AdapterHealth>({
    serverOnline: true,
    geminiConfigured: false,
    agoraConfigured: false,
    murfConfigured: false,
    firebaseConfigured: false,
    mode: 'DEMO_MODE',
  });

  useEffect(() => {
    fetchAdapterHealth().then(setHealth);
  }, []);

  useEffect(() => {
    workspaceRef.current = workspace;
    saveLocalWorkspace(workspace);
  }, [workspace]);

  const metrics = useMemo(
    () =>
      computeDashboardMetrics(
        workspace.callSessions,
        workspace.scamAnalyses,
        workspace.decoySessions,
        workspace.threatIndicators,
        workspace.reports
      ),
    [
      workspace.callSessions,
      workspace.scamAnalyses,
      workspace.decoySessions,
      workspace.threatIndicators,
      workspace.reports,
    ]
  );

  const upsertIndicatorsFromResult = useCallback(
    (
      prevIndicators: ThreatIndicator[],
      result: ScamAnalysisResult,
      sourcePhrase?: string
    ): ThreatIndicator[] => {
      if (result.risk_score < 50) return prevIndicators;

      const allExtracted = [
        ...result.extracted_indicators.urls,
        ...result.extracted_indicators.phoneNumbers,
        ...result.extracted_indicators.paymentIdentifiers,
      ];
      const phrase = sourcePhrase || result.suspicious_phrases[0] || result.detected_patterns[0] || '';
      const nowIso = new Date().toISOString();

      // Deduplicate by matching scamCategory and overlapping phrase/indicator
      const existingIdx = prevIndicators.findIndex(
        (ti) =>
          ti.scamCategory === result.scam_category &&
          (allExtracted.some((ind) => ti.indicators.includes(ind)) ||
            (phrase && ti.commonPhrase.toLowerCase().includes(phrase.toLowerCase().slice(0, 18))))
      );

      if (existingIdx >= 0) {
        const next = [...prevIndicators];
        const current = next[existingIdx];
        const mergedIndicators = Array.from(new Set([...current.indicators, ...allExtracted])).slice(0, 10);
        next[existingIdx] = {
          ...current,
          reportCount: current.reportCount + 1,
          lastSeen: nowIso,
          indicators: mergedIndicators,
          communityWarning: `${current.reportCount + 1} simulated community reports match this ${result.scam_category.toLowerCase()} pattern.`,
        };
        return next;
      }

      const newIndicator: ThreatIndicator = {
        id: makeId('ti'),
        patternTitle: `Suspected ${result.scam_category} Pattern`,
        scamCategory: result.scam_category,
        commonPhrase: phrase || `Recurring ${result.scam_category} solicitation`,
        indicators: allExtracted,
        reportCount: 1,
        firstSeen: nowIso,
        lastSeen: nowIso,
        riskLevel: result.risk_level,
        recommendedAction: result.recommended_actions[0] || 'Verify through official channels before acting.',
        communityWarning: `Newly captured simulated indicator cluster for ${result.scam_category}.`,
        isSimulated: true,
      };
      return [newIndicator, ...prevIndicators];
    },
    []
  );

  const analyzeStandaloneInput = useCallback(
    async (text: string, inputType: ScamAnalysisRecord['inputType']): Promise<ScamAnalysisRecord> => {
      const snap = workspaceRef.current;
      const sanitized = snap.settings.redactSensitiveTokens
        ? redactSensitiveCredentials(text)
        : text;
      const result = await analyzeWithServer(sanitized, inputType);
      const record: ScamAnalysisRecord = {
        id: makeId('anl'),
        userId: snap.user.id,
        inputType,
        inputPreview: sanitized.slice(0, 110) + (sanitized.length > 110 ? '...' : ''),
        createdAt: new Date().toISOString(),
        result,
        isSimulated: true,
      };

      commitWorkspace((prev) => {
        const nextIndicators = upsertIndicatorsFromResult(prev.threatIndicators, result);
        const notifications = [...prev.notifications];
        if (result.risk_score >= 60) {
          notifications.unshift({
            id: makeId('nt'),
            userId: prev.user.id,
            type: 'high-risk',
            title: `${result.risk_level} Risk ${result.scam_category} Flagged`,
            message: `Scam Analyzer scored input at ${result.risk_score}/100 (${Math.round(result.confidence * 100)}% confidence).`,
            createdAt: new Date().toISOString(),
            read: false,
            targetSection: 'scam-analyzer',
          });
        }
        return {
          ...prev,
          scamAnalyses: [record, ...prev.scamAnalyses],
          threatIndicators: nextIndicators,
          notifications,
        };
      });

      return record;
    },
    [commitWorkspace, upsertIndicatorsFromResult]
  );

  const startLiveCallSession = useCallback(
    (opts?: { title?: string; callerLabel?: string; channel?: CallSession['channel'] }): CallSession => {
      const snap = workspaceRef.current;
      const session: CallSession = {
        id: makeId('call'),
        userId: snap.user.id,
        title: opts?.title || 'Monitored Incoming Call (Simulated)',
        callerLabel: opts?.callerLabel || '+91-98XXX-00412 (Simulated)',
        channel: opts?.channel || 'Voice Call (Simulated)',
        status: 'monitoring',
        startedAt: new Date().toISOString(),
        durationSec: 0,
        isSimulated: true,
        transcript: [],
        latestAnalysis: {
          risk_score: 5,
          risk_level: 'Low',
          confidence: 0.45,
          scam_category: 'Benign / Unclear',
          detected_patterns: [],
          suspicious_phrases: [],
          explanation: 'Monitoring started. Waiting for conversation transcript turns to evaluate.',
          recommended_actions: ['Do not share OTPs, PINs, or passwords during unverified calls.'],
          requires_user_attention: false,
          safer_next_steps: ['Keep call verification grounded in official numbers.'],
          extracted_indicators: { urls: [], phoneNumbers: [], paymentIdentifiers: [] },
          engine: 'deterministic-fallback',
        },
      };

      commitWorkspace((prev) => ({
        ...prev,
        callSessions: [session, ...prev.callSessions],
      }));
      setActiveCallId(session.id);
      return session;
    },
    [commitWorkspace]
  );

  const appendCallTranscript = useCallback(
    async (
      callId: string,
      speaker: TranscriptMessage['speaker'],
      rawText: string,
      skipAnalysis = false
    ): Promise<CallSession | null> => {
      const snap = workspaceRef.current;
      const sanitized = snap.settings.redactSensitiveTokens
        ? redactSensitiveCredentials(rawText)
        : rawText;

      const currentSession = snap.callSessions.find((c) => c.id === callId);
      if (!currentSession) return null;

      const newMessage: TranscriptMessage = {
        id: makeId('msg'),
        speaker,
        text: sanitized,
        timestamp: nowTimeStr(),
      };

      const nextTranscript = [...currentSession.transcript, newMessage];
      const callerLines = nextTranscript
        .filter((m) => m.speaker === 'caller')
        .map((m) => m.text)
        .join(' ');
      const analysis = skipAnalysis
        ? currentSession.latestAnalysis
        : await analyzeWithServer(callerLines || sanitized, 'call-transcript');

      if (!skipAnalysis && analysis.suspicious_phrases.length > 0) {
        newMessage.flaggedPhrases = analysis.suspicious_phrases.filter((p) =>
          sanitized.toLowerCase().includes(p.toLowerCase())
        );
        newMessage.detectedTactic = analysis.detected_patterns[0];
      }

      const updatedSession: CallSession = {
        ...currentSession,
        transcript: nextTranscript,
        durationSec: currentSession.durationSec + 18,
        latestAnalysis: analysis,
      };

      commitWorkspace((prev) => {
        const notifications = [...prev.notifications];
        if (!skipAnalysis && analysis.risk_score >= 75 && currentSession.latestAnalysis.risk_score < 75) {
          notifications.unshift({
            id: makeId('nt'),
            userId: prev.user.id,
            type: 'high-risk',
            title: `Live Call Alert: ${analysis.scam_category}`,
            message: `Risk score rose to ${analysis.risk_score}/100. Consider activating AI Decoy.`,
            createdAt: new Date().toISOString(),
            read: false,
            targetSection: 'live-monitor',
          });
        }
        return {
          ...prev,
          callSessions: prev.callSessions.map((c) => (c.id === callId ? updatedSession : c)),
          notifications,
        };
      });

      return updatedSession;
    },
    [commitWorkspace]
  );

  const buildReport = useCallback(
    (params: {
      sourceType: IntelligenceReport['sourceType'];
      sourceId: string;
      scamCategory: ScamCategory;
      riskScore: number;
      riskLevel: IntelligenceReport['riskLevel'];
      confidence: number;
      summary: string;
      suspiciousPhrases: string[];
      scamTechniques: string[];
      extractedIndicators: IntelligenceReport['extractedIndicators'];
      recommendedActions: string[];
      relevantTimestamps: IntelligenceReport['relevantTimestamps'];
      aiExplanation: string;
    }): IntelligenceReport => ({
      id: `REP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
        .toString(36)
        .slice(2, 5)
        .toUpperCase()}`,
      userId: workspace.user.id,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      createdAt: new Date().toISOString(),
      scamCategory: params.scamCategory,
      riskScore: params.riskScore,
      riskLevel: params.riskLevel,
      confidence: params.confidence,
      conversationSummary: params.summary,
      suspiciousPhrases: params.suspiciousPhrases,
      scamTechniques: params.scamTechniques,
      extractedIndicators: params.extractedIndicators,
      recommendedActions: params.recommendedActions,
      relevantTimestamps: params.relevantTimestamps,
      aiExplanation: params.aiExplanation,
      preliminaryNotice:
        'Preliminary AI-assisted analysis (Simulated Demo Data). Findings represent risk indicators and require independent verification before legal or forensic action.',
      isSimulated: true,
    }),
    [workspace.user.id]
  );

  const endLiveCallSession = useCallback(
    (callId: string, generateReport = true): IntelligenceReport | null => {
      const target = workspaceRef.current.callSessions.find((c) => c.id === callId);
      if (!target) return null;

      let createdReport: IntelligenceReport | null = null;
      if (generateReport && target.transcript.length > 0) {
        createdReport = buildReport({
          sourceType: 'live-call',
          sourceId: target.id,
          scamCategory: target.latestAnalysis.scam_category,
          riskScore: target.latestAnalysis.risk_score,
          riskLevel: target.latestAnalysis.risk_level,
          confidence: target.latestAnalysis.confidence,
          summary: `Monitored session "${target.title}" with ${target.callerLabel}. ${target.latestAnalysis.explanation}`,
          suspiciousPhrases: target.latestAnalysis.suspicious_phrases,
          scamTechniques: target.latestAnalysis.detected_patterns,
          extractedIndicators: target.latestAnalysis.extracted_indicators,
          recommendedActions: target.latestAnalysis.recommended_actions,
          relevantTimestamps: target.transcript.slice(0, 6).map((m) => ({
            time: m.timestamp,
            excerpt: `${m.speaker}: ${m.text.slice(0, 90)}`,
          })),
          aiExplanation: target.latestAnalysis.explanation,
        });
      }

      commitWorkspace((prev) => {
        const nextIndicators = upsertIndicatorsFromResult(
          prev.threatIndicators,
          target.latestAnalysis,
          target.latestAnalysis.suspicious_phrases[0]
        );
        const notifications = [...prev.notifications];
        if (createdReport) {
          notifications.unshift({
            id: makeId('nt'),
            userId: prev.user.id,
            type: 'report-ready',
            title: `Evidence Report ${createdReport.id} Ready`,
            message: `Generated from ${target.title} (${createdReport.riskScore}/100).`,
            createdAt: new Date().toISOString(),
            read: false,
            targetSection: 'evidence-reports',
          });
        }
        return {
          ...prev,
          callSessions: prev.callSessions.map((c) =>
            c.id === callId ? { ...c, status: 'ended', endedAt: new Date().toISOString() } : c
          ),
          threatIndicators: nextIndicators,
          reports: createdReport ? [createdReport, ...prev.reports] : prev.reports,
          notifications,
        };
      });

      if (createdReport) {
        setSelectedReportId(createdReport.id);
      }
      return createdReport;
    },
    [buildReport, commitWorkspace, upsertIndicatorsFromResult]
  );

  const activateDecoyForCall = useCallback(
    async (callId: string): Promise<DecoySession | null> => {
      const snap = workspaceRef.current;
      const call = snap.callSessions.find((c) => c.id === callId);
      if (!call) return null;

      const lastCaller = [...call.transcript].reverse().find((m) => m.speaker === 'caller');
      const callerPrompt =
        lastCaller?.text || 'Your bank account will be blocked today. Share your OTP immediately.';

      const decoyReply = await generateDecoyReplyWithServer({
        callerMessage: callerPrompt,
        turnIndex: 0,
        categoryHint: call.latestAnalysis.scam_category,
        history: call.transcript.map((m) => ({ speaker: m.speaker, text: m.text })),
      });

      const decoyMessages: TranscriptMessage[] = [
        ...call.transcript,
        {
          id: makeId('dm'),
          speaker: 'ai-decoy',
          text: decoyReply.reply,
          timestamp: nowTimeStr(),
          detectedTactic: decoyReply.detectedTactic,
        },
      ];

      const decoySession: DecoySession = {
        id: makeId('decoy'),
        userId: snap.user.id,
        callSessionId: call.id,
        scenarioTitle: `${call.title} — AI Decoy Handoff`,
        callerPersona: `Suspected ${call.latestAnalysis.scam_category} Caller`,
        status: 'active',
        startedAt: new Date().toISOString(),
        durationSec: 12,
        messages: decoyMessages,
        detectedTactics: Array.from(
          new Set([...call.latestAnalysis.detected_patterns, decoyReply.detectedTactic])
        ),
        extractedIndicators: call.latestAnalysis.extracted_indicators,
        summary: 'AI Decoy active and safely conversing with the suspected caller.',
        voiceAdapterMode: health.agoraConfigured && health.murfConfigured ? 'AGORA_MURF_LIVE' : 'DEMO_MODE',
        engine: decoyReply.engine,
        isSimulated: true,
      };

      commitWorkspace((prev) => ({
        ...prev,
        callSessions: prev.callSessions.map((c) =>
          c.id === callId ? { ...c, status: 'decoy-active' } : c
        ),
        decoySessions: [decoySession, ...prev.decoySessions],
      }));
      setActiveDecoyId(decoySession.id);
      return decoySession;
    },
    [commitWorkspace, health.agoraConfigured, health.murfConfigured]
  );

  const startStandaloneDecoy = useCallback(
    async (scenario: DemoScenario): Promise<DecoySession> => {
      const snap = workspaceRef.current;
      const openingCaller = scenario.callerScript[scenario.callerScript.length - 1] || scenario.callerScript[0];
      const decoyReply = await generateDecoyReplyWithServer({
        callerMessage: openingCaller,
        turnIndex: 0,
        categoryHint: scenario.category,
        history: [{ speaker: 'caller', text: openingCaller }],
      });

      const extracted = extractIndicators(scenario.callerScript.join(' '));
      const decoySession: DecoySession = {
        id: makeId('decoy'),
        userId: snap.user.id,
        scenarioTitle: `${scenario.code}: ${scenario.title}`,
        callerPersona: scenario.callerLabel,
        status: 'active',
        startedAt: new Date().toISOString(),
        durationSec: 15,
        messages: [
          {
            id: makeId('dm'),
            speaker: 'caller',
            text: openingCaller,
            timestamp: nowTimeStr(),
            detectedTactic: decoyReply.detectedTactic,
          },
          {
            id: makeId('dm'),
            speaker: 'ai-decoy',
            text: decoyReply.reply,
            timestamp: nowTimeStr(),
          },
        ],
        detectedTactics: [decoyReply.detectedTactic],
        extractedIndicators: extracted,
        summary: 'AI Decoy engaged in controlled demo simulation.',
        voiceAdapterMode: health.agoraConfigured && health.murfConfigured ? 'AGORA_MURF_LIVE' : 'DEMO_MODE',
        engine: decoyReply.engine,
        isSimulated: true,
      };

      commitWorkspace((prev) => ({
        ...prev,
        decoySessions: [decoySession, ...prev.decoySessions],
      }));
      setActiveDecoyId(decoySession.id);
      return decoySession;
    },
    [commitWorkspace, health.agoraConfigured, health.murfConfigured]
  );

  const sendCallerToDecoy = useCallback(
    async (decoyId: string, callerText: string): Promise<void> => {
      const target = workspaceRef.current.decoySessions.find((d) => d.id === decoyId);
      if (!target || target.status !== 'active') return;

      const sanitized = redactSensitiveCredentials(callerText);
      const callerMsg: TranscriptMessage = {
        id: makeId('dm'),
        speaker: 'caller',
        text: sanitized,
        timestamp: nowTimeStr(),
      };

      const turnIndex = target.messages.filter((m) => m.speaker === 'ai-decoy').length;
      const decoyReply = await generateDecoyReplyWithServer({
        callerMessage: sanitized,
        turnIndex,
        categoryHint: 'Banking Fraud',
        history: [...target.messages, callerMsg].map((m) => ({ speaker: m.speaker, text: m.text })),
      });

      callerMsg.detectedTactic = decoyReply.detectedTactic;
      const aiMsg: TranscriptMessage = {
        id: makeId('dm'),
        speaker: 'ai-decoy',
        text: decoyReply.reply,
        timestamp: nowTimeStr(),
      };

      const combinedText = [...target.messages, callerMsg].map((m) => m.text).join(' ');
      const extracted = extractIndicators(combinedText);

      commitWorkspace((prev) => ({
        ...prev,
        decoySessions: prev.decoySessions.map((d) =>
          d.id === decoyId
            ? {
                ...d,
                messages: [...d.messages, callerMsg, aiMsg],
                durationSec: d.durationSec + 22,
                detectedTactics: Array.from(new Set([...d.detectedTactics, decoyReply.detectedTactic])),
                extractedIndicators: {
                  urls: Array.from(new Set([...d.extractedIndicators.urls, ...extracted.urls])),
                  phoneNumbers: Array.from(
                    new Set([...d.extractedIndicators.phoneNumbers, ...extracted.phoneNumbers])
                  ),
                  paymentIdentifiers: Array.from(
                    new Set([...d.extractedIndicators.paymentIdentifiers, ...extracted.paymentIdentifiers])
                  ),
                },
                engine: decoyReply.engine,
              }
            : d
        ),
      }));
    },
    [commitWorkspace]
  );

  const toggleDecoyStatus = useCallback((decoyId: string) => {
    commitWorkspace((prev) => ({
      ...prev,
      decoySessions: prev.decoySessions.map((d) => {
        if (d.id !== decoyId || d.status === 'completed') return d;
        return { ...d, status: d.status === 'active' ? 'paused' : 'active' };
      }),
    }));
  }, [commitWorkspace]);

  const completeDecoySession = useCallback(
    (decoyId: string): IntelligenceReport | null => {
      const target = workspaceRef.current.decoySessions.find((d) => d.id === decoyId);
      if (!target) return null;

      const callerText = target.messages
        .filter((m) => m.speaker === 'caller')
        .map((m) => m.text)
        .join(' ');
      const extracted = extractIndicators(callerText);
      const mergedIndicators = {
        urls: Array.from(new Set([...target.extractedIndicators.urls, ...extracted.urls])),
        phoneNumbers: Array.from(
          new Set([...target.extractedIndicators.phoneNumbers, ...extracted.phoneNumbers])
        ),
        paymentIdentifiers: Array.from(
          new Set([...target.extractedIndicators.paymentIdentifiers, ...extracted.paymentIdentifiers])
        ),
      };

      const summary = `AI Decoy engaged "${target.callerPersona}" for ${target.durationSec}s across ${target.messages.length} turns without disclosing credentials. Extracted ${
        mergedIndicators.urls.length +
        mergedIndicators.phoneNumbers.length +
        mergedIndicators.paymentIdentifiers.length
      } indicator(s).`;

      const suspiciousPhrases = target.messages
        .filter((m) => m.speaker === 'caller')
        .map((m) => m.text.slice(0, 95))
        .slice(0, 5);

      const inferredCategory: ScamCategory = target.scenarioTitle.toLowerCase().includes('job')
        ? 'Job Scams'
        : target.scenarioTitle.toLowerCase().includes('invest') ||
            target.scenarioTitle.toLowerCase().includes('crypto')
          ? 'Investment Fraud'
          : 'Banking Fraud';

      const report = buildReport({
        sourceType: 'decoy-session',
        sourceId: target.id,
        scamCategory: inferredCategory,
        riskScore: 91,
        riskLevel: 'Critical',
        confidence: 0.94,
        summary,
        suspiciousPhrases,
        scamTechniques: target.detectedTactics,
        extractedIndicators: mergedIndicators,
        recommendedActions: [
          'Never share OTPs, PINs, passwords, or banking credentials.',
          'Block the caller identifier and avoid opening extracted unverified URLs.',
          'Check in with trusted family contacts if the caller targeted a family member.',
        ],
        relevantTimestamps: target.messages.slice(0, 6).map((m) => ({
          time: m.timestamp,
          excerpt: `${m.speaker === 'ai-decoy' ? 'AI Decoy' : 'Caller'}: ${m.text.slice(0, 90)}`,
        })),
        aiExplanation:
          'Preliminary decoy interaction analysis indicates repeated social engineering pressure and credential/payment solicitation.',
      });

      commitWorkspace((prev) => {
        const nextIndicators = upsertIndicatorsFromResult(
          prev.threatIndicators,
          {
            risk_score: 91,
            risk_level: 'Critical',
            confidence: 0.94,
            scam_category: inferredCategory,
            detected_patterns: target.detectedTactics,
            suspicious_phrases: suspiciousPhrases,
            explanation: summary,
            recommended_actions: report.recommendedActions,
            requires_user_attention: true,
            safer_next_steps: [],
            extracted_indicators: mergedIndicators,
            engine: target.engine,
          },
          suspiciousPhrases[0]
        );

        const nextNotifications: NotificationItem[] = [
          {
            id: makeId('nt'),
            userId: prev.user.id,
            type: 'decoy-complete',
            title: 'AI Decoy Session Completed',
            message: `${target.scenarioTitle} concluded safely and generated report ${report.id}.`,
            createdAt: new Date().toISOString(),
            read: false,
            targetSection: 'evidence-reports',
          },
          ...prev.notifications,
        ];

        const nextFamilyAlerts = [...prev.familyAlerts];
        if (prev.settings.familyProtectionEnabled && prev.settings.notifyFamilyOnCritical) {
          const primaryContact = prev.familyContacts.find((fc) => fc.notifyOnHighRisk);
          if (primaryContact) {
            const alertLog: FamilyAlertLog = {
              id: makeId('fa'),
              userId: prev.user.id,
              contactName: primaryContact.name,
              message: `ScamSentry AI detected a potential ${inferredCategory.toLowerCase()} during a monitored conversation. Please check with your family member.`,
              riskLevel: 'Critical',
              scamCategory: inferredCategory,
              consentGranted: prev.settings.consentToMonitor,
              deliveryMode: 'In-App Simulation',
              createdAt: new Date().toISOString(),
            };
            nextFamilyAlerts.unshift(alertLog);
            nextNotifications.unshift({
              id: makeId('nt'),
              userId: prev.user.id,
              type: 'family-alert',
              title: `Family Alert Sent to ${primaryContact.name} (Simulated)`,
              message: alertLog.message,
              createdAt: new Date().toISOString(),
              read: false,
              targetSection: 'family-protection',
            });
          }
        }

        return {
          ...prev,
          decoySessions: prev.decoySessions.map((d) =>
            d.id === decoyId
              ? {
                  ...d,
                  status: 'completed',
                  endedAt: new Date().toISOString(),
                  summary,
                  extractedIndicators: mergedIndicators,
                }
              : d
          ),
          callSessions: target.callSessionId
            ? prev.callSessions.map((c) =>
                c.id === target.callSessionId
                  ? { ...c, status: 'ended', endedAt: new Date().toISOString() }
                  : c
              )
            : prev.callSessions,
          reports: [report, ...prev.reports],
          threatIndicators: nextIndicators,
          familyAlerts: nextFamilyAlerts,
          notifications: nextNotifications,
        };
      });

      setSelectedReportId(report.id);
      return report;
    },
    [buildReport, commitWorkspace, upsertIndicatorsFromResult]
  );

  const createReportFromAnalysis = useCallback(
    (record: ScamAnalysisRecord): IntelligenceReport => {
      const report = buildReport({
        sourceType: 'scam-analyzer',
        sourceId: record.id,
        scamCategory: record.result.scam_category,
        riskScore: record.result.risk_score,
        riskLevel: record.result.risk_level,
        confidence: record.result.confidence,
        summary: `Standalone ${record.inputType.toUpperCase()} analysis: "${record.inputPreview}"`,
        suspiciousPhrases: record.result.suspicious_phrases,
        scamTechniques: record.result.detected_patterns,
        extractedIndicators: record.result.extracted_indicators,
        recommendedActions: record.result.recommended_actions,
        relevantTimestamps: [
          {
            time: new Date(record.createdAt).toTimeString().slice(0, 8),
            excerpt: record.inputPreview,
          },
        ],
        aiExplanation: record.result.explanation,
      });

      setWorkspace((prev) => ({
        ...prev,
        reports: [report, ...prev.reports],
        notifications: [
          {
            id: makeId('nt'),
            userId: prev.user.id,
            type: 'report-ready',
            title: `Evidence Report ${report.id} Created`,
            message: `Generated from ${record.inputType.toUpperCase()} scan (${report.scamCategory}).`,
            createdAt: new Date().toISOString(),
            read: false,
            targetSection: 'evidence-reports',
          },
          ...prev.notifications,
        ],
      }));
      setSelectedReportId(report.id);
      return report;
    },
    [buildReport]
  );

  const addThreatContribution = useCallback(
    (params: {
      patternTitle: string;
      category: ScamCategory;
      commonPhrase: string;
      indicators: string[];
      riskLevel: ThreatIndicator['riskLevel'];
      recommendedAction: string;
    }) => {
      const nowIso = new Date().toISOString();
      const item: ThreatIndicator = {
        id: makeId('ti'),
        patternTitle: params.patternTitle,
        scamCategory: params.category,
        commonPhrase: redactSensitiveCredentials(params.commonPhrase),
        indicators: params.indicators,
        reportCount: 1,
        firstSeen: nowIso,
        lastSeen: nowIso,
        riskLevel: params.riskLevel,
        recommendedAction: params.recommendedAction,
        communityWarning: 'User-submitted simulated pattern added to Collective Scam Intelligence Network.',
        isSimulated: true,
      };
      setWorkspace((prev) => ({
        ...prev,
        threatIndicators: [item, ...prev.threatIndicators],
        notifications: [
          {
            id: makeId('nt'),
            userId: prev.user.id,
            type: 'intelligence',
            title: 'Threat Pattern Added to Intelligence Network',
            message: `${item.patternTitle} (${item.scamCategory}) is now tracked.`,
            createdAt: nowIso,
            read: false,
            targetSection: 'scam-intelligence',
          },
          ...prev.notifications,
        ],
      }));
    },
    []
  );

  const addFamilyContact = useCallback(
    (contact: { name: string; relationship: string; contactChannel: string }) => {
      const newContact: FamilyContact = {
        id: makeId('fc'),
        userId: workspace.user.id,
        name: contact.name.trim(),
        relationship: contact.relationship.trim(),
        contactChannel: contact.contactChannel.trim() || 'In-App Family Alert Channel (Simulated)',
        notifyOnHighRisk: true,
        createdAt: new Date().toISOString(),
      };
      setWorkspace((prev) => ({
        ...prev,
        familyContacts: [newContact, ...prev.familyContacts],
      }));
    },
    [workspace.user.id]
  );

  const removeFamilyContact = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      familyContacts: prev.familyContacts.filter((fc) => fc.id !== id),
    }));
  }, []);

  const toggleFamilyContactNotify = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      familyContacts: prev.familyContacts.map((fc) =>
        fc.id === id ? { ...fc, notifyOnHighRisk: !fc.notifyOnHighRisk } : fc
      ),
    }));
  }, []);

  const triggerFamilyAlert = useCallback(
    (params: { scamCategory: ScamCategory; riskLevel: ThreatIndicator['riskLevel']; message: string }) => {
      setWorkspace((prev) => {
        if (!prev.settings.familyProtectionEnabled) return prev;
        const targets = prev.familyContacts.filter((fc) => fc.notifyOnHighRisk);
        const contactName = targets.map((t) => t.name).join(', ') || 'Trusted Family Circle';
        const log: FamilyAlertLog = {
          id: makeId('fa'),
          userId: prev.user.id,
          contactName,
          message: params.message,
          riskLevel: params.riskLevel,
          scamCategory: params.scamCategory,
          consentGranted: prev.settings.consentToMonitor,
          deliveryMode: 'In-App Simulation',
          createdAt: new Date().toISOString(),
        };
        return {
          ...prev,
          familyAlerts: [log, ...prev.familyAlerts],
          notifications: [
            {
              id: makeId('nt'),
              userId: prev.user.id,
              type: 'family-alert',
              title: `Family Alert Dispatched (Simulated)`,
              message: `Notified ${contactName}: ${params.message}`,
              createdAt: new Date().toISOString(),
              read: false,
              targetSection: 'family-protection',
            },
            ...prev.notifications,
          ],
        };
      });
    },
    []
  );

  const markNotificationRead = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setWorkspace((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const clearNotifications = useCallback(() => {
    setWorkspace((prev) => ({ ...prev, notifications: [] }));
  }, []);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setWorkspace((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const updateUserProfile = useCallback((patch: Partial<UserProfile>) => {
    setWorkspace((prev) => ({
      ...prev,
      user: { ...prev.user, ...patch },
    }));
  }, []);

  const resetDemoWorkspace = useCallback(() => {
    clearLocalWorkspace();
    setWorkspace({
      user: SEED_USER,
      callSessions: SEED_CALL_SESSIONS,
      scamAnalyses: SEED_ANALYSES,
      decoySessions: SEED_DECOY_SESSIONS,
      threatIndicators: SEED_THREAT_INDICATORS,
      reports: SEED_REPORTS,
      familyContacts: SEED_FAMILY_CONTACTS,
      familyAlerts: SEED_FAMILY_ALERTS,
      notifications: SEED_NOTIFICATIONS,
      settings: SEED_SETTINGS,
    });
    setActiveCallId(SEED_CALL_SESSIONS[0]?.id ?? null);
    setActiveDecoyId(SEED_DECOY_SESSIONS[0]?.id ?? null);
    setSelectedReportId(SEED_REPORTS[0]?.id ?? null);
  }, []);

  const clearAllData = useCallback(() => {
    clearLocalWorkspace();
    setWorkspace((prev) => ({
      ...prev,
      callSessions: [],
      scamAnalyses: [],
      decoySessions: [],
      reports: [],
      familyAlerts: [],
      notifications: [],
    }));
    setActiveCallId(null);
    setActiveDecoyId(null);
    setSelectedReportId(null);
  }, []);

  return (
    <ScamSentryContext.Provider
      value={{
        activeSection,
        setActiveSection,
        globalSearch,
        setGlobalSearch,
        health,
        user: workspace.user,
        callSessions: workspace.callSessions,
        activeCallId,
        setActiveCallId,
        scamAnalyses: workspace.scamAnalyses,
        decoySessions: workspace.decoySessions,
        activeDecoyId,
        setActiveDecoyId,
        threatIndicators: workspace.threatIndicators,
        reports: workspace.reports,
        selectedReportId,
        setSelectedReportId,
        familyContacts: workspace.familyContacts,
        familyAlerts: workspace.familyAlerts,
        notifications: workspace.notifications,
        settings: workspace.settings,
        metrics,
        demoModalOpen,
        setDemoModalOpen,
        analyzeStandaloneInput,
        startLiveCallSession,
        appendCallTranscript,
        endLiveCallSession,
        activateDecoyForCall,
        startStandaloneDecoy,
        sendCallerToDecoy,
        toggleDecoyStatus,
        completeDecoySession,
        createReportFromAnalysis,
        addThreatContribution,
        addFamilyContact,
        removeFamilyContact,
        toggleFamilyContactNotify,
        triggerFamilyAlert,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotifications,
        updateSettings,
        updateUserProfile,
        resetDemoWorkspace,
        clearAllData,
      }}
    >
      {children}
    </ScamSentryContext.Provider>
  );
}

export function useScamSentry(): ScamSentryContextValue {
  const ctx = useContext(ScamSentryContext);
  if (!ctx) throw new Error('useScamSentry must be used inside ScamSentryProvider');
  return ctx;
}
