import { RotateCcw, Shield, Trash2 } from 'lucide-react';
import { useScamSentry } from '../context/ScamSentryContext';

export function SettingsView() {
  const {
    user,
    updateUserProfile,
    settings,
    updateSettings,
    health,
    resetDemoWorkspace,
    clearAllData,
  } = useScamSentry();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* System & Demo Mode Status */}
      <div className="sentry-panel rounded-xl p-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-display font-semibold text-white">Settings &amp; Privacy Controls</h1>
          <span className="font-mono text-xs text-amber-300">
            {health.mode === 'DEMO_MODE' ? 'DEMO MODE ACTIVE' : 'HYBRID LIVE GEMINI + VOICE DEMO'}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          API Status — Gemini AI:{' '}
          <span className="font-mono text-slate-100">
            {health.geminiConfigured ? 'Configured (Server-Side)' : 'Fallback Engine (Demo)'}
          </span>{' '}
          · Agora/Murf Voice:{' '}
          <span className="font-mono text-slate-100">
            {health.agoraConfigured && health.murfConfigured ? 'Configured' : 'Simulated Demo Adapter'}
          </span>{' '}
          · Database:{' '}
          <span className="font-mono text-slate-100">
            {health.firebaseConfigured ? 'Firebase Configured' : 'Local Demo Store'}
          </span>
        </p>
      </div>

      {/* User Profile */}
      <div className="sentry-panel rounded-xl p-5 space-y-4">
        <h2 className="text-base font-display font-semibold text-white">User Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-name" className="block text-xs text-slate-300 mb-1">
              Display Name
            </label>
            <input
              id="prof-name"
              type="text"
              value={user.name}
              onChange={(e) => updateUserProfile({ name: e.target.value })}
              className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="prof-role" className="block text-xs text-slate-300 mb-1">
              Workspace Role
            </label>
            <input
              id="prof-role"
              type="text"
              value={user.role}
              onChange={(e) => updateUserProfile({ role: e.target.value })}
              className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-sm text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Privacy, Consent & Monitoring Controls */}
      <div className="sentry-panel rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-300" aria-hidden="true" />
          <h2 className="text-base font-display font-semibold text-white">
            Privacy, Consent &amp; Data Protection
          </h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-start justify-between gap-4 p-3 rounded-lg bg-[#080E1B] border border-slate-800 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-slate-100">Conversation Monitoring Consent</p>
              <p className="text-xs text-slate-400">
                Required before starting live call analysis or processing transcripts. Toggle off to immediately stop monitoring.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.consentToMonitor}
              onChange={(e) => updateSettings({ consentToMonitor: e.target.checked })}
              className="mt-1 w-4 h-4 accent-cyan-400"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-3 rounded-lg bg-[#080E1B] border border-slate-800 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-slate-100">Automatic Credential &amp; OTP Redaction</p>
              <p className="text-xs text-slate-400">
                ScamSentry AI never stores passwords, OTPs, PINs, CVVs, or payment card numbers in transcripts or reports.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.redactSensitiveTokens}
              onChange={(e) => updateSettings({ redactSensitiveTokens: e.target.checked })}
              className="mt-1 w-4 h-4 accent-cyan-400"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-3 rounded-lg bg-[#080E1B] border border-slate-800 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-slate-100">Auto-Flag Critical Calls &amp; Alert Family Circle</p>
              <p className="text-xs text-slate-400">
                Dispatch in-app alerts to trusted family contacts when Critical scam risk is detected.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyFamilyOnCritical}
              onChange={(e) => updateSettings({ notifyFamilyOnCritical: e.target.checked })}
              className="mt-1 w-4 h-4 accent-cyan-400"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label htmlFor="pref-retention" className="block text-xs text-slate-300 mb-1">
              Data Retention Window
            </label>
            <select
              id="pref-retention"
              value={settings.dataRetentionDays}
              onChange={(e) =>
                updateSettings({ dataRetentionDays: Number(e.target.value) as 7 | 30 | 90 })
              }
              className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-xs text-slate-100"
            >
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>

          <div>
            <label htmlFor="pref-voice" className="block text-xs text-slate-300 mb-1">
              Voice Adapter Mode
            </label>
            <select
              id="pref-voice"
              value={settings.voiceAdapterPreference}
              onChange={(e) =>
                updateSettings({
                  voiceAdapterPreference: e.target.value as 'demo-simulated' | 'agora-murf-when-configured',
                })
              }
              className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-xs text-slate-100"
            >
              <option value="demo-simulated">Simulated Demo Audio</option>
              <option value="agora-murf-when-configured">Agora + Murf (When Configured)</option>
            </select>
          </div>

          <div>
            <label htmlFor="pref-depth" className="block text-xs text-slate-300 mb-1">
              AI Explanation Detail
            </label>
            <select
              id="pref-depth"
              value={settings.aiDepth}
              onChange={(e) => updateSettings({ aiDepth: e.target.value as 'standard' | 'detailed' })}
              className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-xs text-slate-100"
            >
              <option value="detailed">Detailed Indicators</option>
              <option value="standard">Standard Summary</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-4 text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-100">What Data Is Collected &amp; Why</p>
          <p className="leading-relaxed">
            ScamSentry AI evaluates conversation text, lexical URL patterns, and extracted non-personal threat indicators (such as phishing domains and scam phrases) strictly to score scam risk, protect the user via AI Decoy, and generate user-owned evidence reports. Sensitive credentials are automatically redacted prior to storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={resetDemoWorkspace}
            className="px-3.5 py-2 rounded-lg bg-[#131C31] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-100 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
            Reset Demo Seed Data
          </button>
          <button
            type="button"
            onClick={clearAllData}
            className="px-3.5 py-2 rounded-lg bg-red-950/35 hover:bg-red-950/55 border border-red-500/40 text-xs font-medium text-red-200 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Clear Local Session Data
          </button>
        </div>
      </div>
    </div>
  );
}
