import type {
  CallSession,
  DecoySession,
  FamilyAlertLog,
  FamilyContact,
  IntelligenceReport,
  NotificationItem,
  ScamAnalysisRecord,
  ThreatIndicator,
  UserProfile,
  UserSettings,
} from '../types/scamsentry';

export interface VoiceAdapterInfo {
  provider: 'Agora Conversational AI + Murf AI';
  connected: boolean;
  modeLabel: 'DEMO MODE (Simulated Voice & Audio)' | 'LIVE ADAPTER';
  description: string;
}

export function getVoiceAdapterInfo(agoraConfigured: boolean, murfConfigured: boolean): VoiceAdapterInfo {
  if (agoraConfigured && murfConfigured) {
    return {
      provider: 'Agora Conversational AI + Murf AI',
      connected: true,
      modeLabel: 'LIVE ADAPTER',
      description: 'External Agora RTC and Murf AI speech synthesis credentials detected.',
    };
  }
  return {
    provider: 'Agora Conversational AI + Murf AI',
    connected: false,
    modeLabel: 'DEMO MODE (Simulated Voice & Audio)',
    description:
      'Agora SDK and Murf AI credentials are not configured. Running text-based decoy and browser/simulated audio adapter without live telephony.',
  };
}

export function speakDemoBrowserTts(text: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export interface PersistedWorkspaceState {
  user: UserProfile;
  callSessions: CallSession[];
  scamAnalyses: ScamAnalysisRecord[];
  decoySessions: DecoySession[];
  threatIndicators: ThreatIndicator[];
  reports: IntelligenceReport[];
  familyContacts: FamilyContact[];
  familyAlerts: FamilyAlertLog[];
  notifications: NotificationItem[];
  settings: UserSettings;
}

const STORAGE_KEY = 'scamsentry_demo_workspace_v1';

export function loadLocalWorkspace(): PersistedWorkspaceState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedWorkspaceState;
  } catch {
    return null;
  }
}

export function saveLocalWorkspace(state: PersistedWorkspaceState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota issues in demo mode
  }
}

export function clearLocalWorkspace(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
