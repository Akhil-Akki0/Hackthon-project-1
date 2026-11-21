import type { AdapterHealth, ScamAnalysisResult, ScamCategory } from '../types/scamsentry';
import { analyzeTextDeterministic, generateDeterministicDecoyReply } from '../utils/scamEngine';

export async function fetchAdapterHealth(): Promise<AdapterHealth> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as AdapterHealth;
  } catch {
    return {
      serverOnline: false,
      geminiConfigured: false,
      agoraConfigured: false,
      murfConfigured: false,
      firebaseConfigured: false,
      mode: 'DEMO_MODE',
    };
  }
}

export async function analyzeWithServer(
  text: string,
  inputType: string
): Promise<ScamAnalysisResult> {
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, inputType }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Server error (${res.status})`);
    }
    return (await res.json()) as ScamAnalysisResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return analyzeTextDeterministic(
      text,
      `Backend API unreachable (${msg}); using client-side deterministic engine.`
    );
  }
}

export async function generateDecoyReplyWithServer(params: {
  callerMessage: string;
  turnIndex: number;
  categoryHint: ScamCategory;
  history: Array<{ speaker: string; text: string }>;
}): Promise<{
  reply: string;
  detectedTactic: string;
  shouldHandoffToHuman: boolean;
  engine: 'gemini-live' | 'deterministic-fallback';
  fallbackReason?: string;
}> {
  try {
    const res = await fetch('/api/decoy/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error';
    const det = generateDeterministicDecoyReply(
      params.callerMessage,
      params.turnIndex,
      params.categoryHint
    );
    return {
      ...det,
      engine: 'deterministic-fallback',
      fallbackReason: `Backend decoy endpoint unavailable (${msg}); using local deterministic adapter.`,
    };
  }
}
