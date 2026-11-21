import { useState } from 'react';
import {
  AlertOctagon,
  Bot,
  MessageSquarePlus,
  PhoneOff,
  Play,
  Send,
  ShieldAlert,
  Square,
} from 'lucide-react';
import { DEMO_SCENARIOS } from '../data/seedData';
import { useScamSentry } from '../context/ScamSentryContext';
import { AudioWaveform } from '../components/AudioWaveform';
import { RiskLabel } from '../components/RiskBadge';

export function LiveMonitorView() {
  const {
    callSessions,
    activeCallId,
    setActiveCallId,
    startLiveCallSession,
    appendCallTranscript,
    endLiveCallSession,
    activateDecoyForCall,
    setActiveSection,
    settings,
  } = useScamSentry();

  const [manualSpeaker, setManualSpeaker] = useState<'caller' | 'user'>('caller');
  const [manualText, setManualText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [simStepIdx, setSimStepIdx] = useState(0);

  const activeCall = callSessions.find((c) => c.id === activeCallId) || callSessions[0] || null;
  const isMonitoring = activeCall?.status === 'monitoring' || activeCall?.status === 'decoy-active';

  const handleStartSimulatedCall = async (scenarioId: string) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId) || DEMO_SCENARIOS[0];
    const session = startLiveCallSession({
      title: `${scenario.code}: ${scenario.title}`,
      callerLabel: scenario.callerLabel,
      channel: 'Voice Call (Simulated)',
    });
    setSimStepIdx(1);
    setSubmitting(true);
    await appendCallTranscript(session.id, 'caller', scenario.callerScript[0]);
    setSubmitting(false);
  };

  const handleStartManualCall = () => {
    startLiveCallSession({
      title: 'Manual Transcript Inspection Session',
      callerLabel: 'Manual Entry (Simulated / Offline)',
      channel: 'Manual Transcript',
    });
    setSimStepIdx(0);
  };

  const handleSendManualLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCall || !manualText.trim() || submitting) return;
    setSubmitting(true);
    await appendCallTranscript(activeCall.id, manualSpeaker, manualText.trim());
    setManualText('');
    setSubmitting(false);
  };

  const handleSimulateNextLine = async () => {
    if (!activeCall || submitting) return;
    const scenario =
      DEMO_SCENARIOS.find((s) => activeCall.title.includes(s.code)) || DEMO_SCENARIOS[0];
    const line =
      scenario.callerScript[simStepIdx % scenario.callerScript.length] ||
      'Please share your OTP immediately to prevent account suspension.';
    setSubmitting(true);
    await appendCallTranscript(activeCall.id, 'caller', line);
    setSimStepIdx((i) => i + 1);
    setSubmitting(false);
  };

  const handleActivateDecoy = async () => {
    if (!activeCall) return;
    setSubmitting(true);
    await activateDecoyForCall(activeCall.id);
    setSubmitting(false);
    setActiveSection('ai-decoy');
  };

  const handleEndSession = () => {
    if (!activeCall) return;
    const report = endLiveCallSession(activeCall.id, true);
    if (report) {
      setActiveSection('evidence-reports');
    }
  };

  const analysis = activeCall?.latestAnalysis;

  return (
    <div className="space-y-6">
      {/* Emergency User Protection Warning Banner */}
      <div
        role="alert"
        className="rounded-xl bg-red-950/35 border border-red-500/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2.5 text-sm text-red-200 font-medium">
          <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
          <span>Never share your OTP, PIN, password, or banking credentials.</span>
        </div>
        <span className="text-xs text-red-300/80 font-mono">
          {settings.consentToMonitor ? 'Monitoring Consent Active' : 'Monitoring Paused in Settings'}
        </span>
      </div>

      {/* Session Controls Bar */}
      <div className="sentry-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={!settings.consentToMonitor || submitting}
            onClick={() => handleStartSimulatedCall('banking-otp')}
            className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            Start Simulated Call
          </button>
          <button
            type="button"
            disabled={!settings.consentToMonitor || submitting}
            onClick={handleStartManualCall}
            className="px-3.5 py-2 rounded-lg bg-[#131C31] hover:bg-slate-800 border border-slate-700 text-slate-100 font-medium text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
            New Manual Transcript
          </button>
          {activeCall && isMonitoring && (
            <button
              type="button"
              onClick={handleSimulateNextLine}
              disabled={submitting}
              className="px-3.5 py-2 rounded-lg bg-[#131C31] hover:bg-slate-800 border border-slate-700 text-amber-200 font-medium text-xs whitespace-nowrap"
            >
              + Simulate Caller Turn
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeCall && isMonitoring && (
            <>
              <button
                type="button"
                onClick={handleActivateDecoy}
                disabled={submitting}
                className="px-3.5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                Activate AI Decoy
              </button>
              <button
                type="button"
                onClick={handleEndSession}
                className="px-3.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-medium text-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                <PhoneOff className="w-3.5 h-3.5" aria-hidden="true" />
                End Session
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Split: Transcript + Live Risk Telemetry */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left 7 cols: Session selector, Waveform, Transcript, Manual Input */}
        <div className="xl:col-span-7 space-y-4 min-w-0">
          {/* Session Tabs */}
          {callSessions.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {callSessions.slice(0, 5).map((cs) => {
                const selected = cs.id === activeCall?.id;
                return (
                  <button
                    key={cs.id}
                    type="button"
                    onClick={() => setActiveCallId(cs.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-cyan-500/12 border-cyan-400/40 text-cyan-200'
                        : 'bg-[#0D1424] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cs.title.slice(0, 32)} · <span className="font-mono uppercase">{cs.status}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="sentry-panel rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-display font-semibold text-white">
                  {activeCall ? activeCall.title : 'No Call Session Selected'}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeCall
                    ? `${activeCall.callerLabel} · ${activeCall.channel}`
                    : 'Start a simulated call or manual transcript session above.'}
                </p>
              </div>
              {activeCall && (
                <span className="font-mono text-xs text-slate-300 tabular-nums">
                  Duration: {activeCall.durationSec}s
                </span>
              )}
            </div>

            <AudioWaveform
              active={Boolean(activeCall && isMonitoring)}
              speaker={activeCall?.status === 'decoy-active' ? 'ai-decoy' : 'caller'}
            />

            {/* Transcript Feed */}
            <div
              className="rounded-lg bg-[#080E1B] border border-slate-800 p-4 space-y-3 min-h-[260px] max-h-[380px] overflow-y-auto"
              aria-label="Conversation transcript"
            >
              {!activeCall || activeCall.transcript.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">
                  Transcript is empty. Click &ldquo;Start Simulated Call&rdquo; or enter a transcript line below to run live AI scam detection.
                </p>
              ) : (
                activeCall.transcript.map((msg) => {
                  const isCaller = msg.speaker === 'caller';
                  const isDecoy = msg.speaker === 'ai-decoy';
                  return (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg border text-sm ${
                        isCaller
                          ? 'bg-orange-950/20 border-orange-500/25 text-slate-100'
                          : isDecoy
                            ? 'bg-cyan-950/25 border-cyan-500/30 text-cyan-50'
                            : 'bg-slate-900/70 border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="font-semibold">
                          {isCaller ? 'Caller' : isDecoy ? 'AI Decoy' : 'User'}
                        </span>
                        <span className="font-mono tabular-nums text-slate-400">{msg.timestamp}</span>
                      </div>
                      <p className="leading-relaxed">{msg.text}</p>
                      {msg.flaggedPhrases && msg.flaggedPhrases.length > 0 && (
                        <p className="text-xs text-amber-300 mt-1.5">
                          Flagged cues: {msg.flaggedPhrases.join(' · ')}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Manual Transcript Input */}
            <form onSubmit={handleSendManualLine} className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="manual-transcript-input" className="text-xs font-medium text-slate-300">
                  Manual Transcript Entry (for offline / microphone-free testing)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setManualSpeaker('caller')}
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      manualSpeaker === 'caller'
                        ? 'bg-orange-500/25 text-orange-200 border border-orange-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    As Caller
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualSpeaker('user')}
                    className={`px-2.5 py-1 rounded text-xs font-medium ${
                      manualSpeaker === 'user'
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    As User
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  id="manual-transcript-input"
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  disabled={!activeCall || activeCall.status === 'ended' || submitting}
                  placeholder="e.g. Hello sir, I am calling from your bank. Share your OTP immediately."
                  className="flex-1 h-10 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
                />
                <button
                  type="submit"
                  disabled={!activeCall || activeCall.status === 'ended' || !manualText.trim() || submitting}
                  className="px-4 h-10 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  Analyze Line
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 5 cols: Real-Time AI Scam Risk & Confidence Assessment */}
        <div className="xl:col-span-5 space-y-4 min-w-0">
          <div className="sentry-panel rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-display font-semibold text-white">Live Risk Assessment</h2>
              {analysis && <RiskLabel level={analysis.risk_level} />}
            </div>

            {analysis ? (
              <>
                {/* Separate Risk Score vs Detection Confidence */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-3.5">
                    <p className="text-xs text-slate-400 mb-1">Scam Risk Score</p>
                    <p className="text-2xl font-display font-semibold font-mono tabular-nums text-white">
                      {analysis.risk_score}
                      <span className="text-sm text-slate-400">/100</span>
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-3.5">
                    <p className="text-xs text-slate-400 mb-1">Detection Confidence</p>
                    <p className="text-2xl font-display font-semibold font-mono tabular-nums text-cyan-300">
                      {Math.round(analysis.confidence * 100)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Suspected Scam Category</p>
                  <p className="text-sm font-semibold text-slate-100">{analysis.scam_category}</p>
                  <p className="text-xs text-slate-400">
                    Engine:{' '}
                    <span className="font-mono text-slate-300">
                      {analysis.engine === 'gemini-live' ? 'Gemini Live AI' : 'Deterministic Fallback Engine'}
                    </span>
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-300 mb-2">Detected Scam Indicators</p>
                  {analysis.detected_patterns.length === 0 ? (
                    <p className="text-xs text-slate-500">No high-risk manipulation patterns detected yet.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {analysis.detected_patterns.map((pat) => (
                        <li key={pat} className="flex items-start gap-2">
                          <ShieldAlert className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" aria-hidden="true" />
                          <span>{pat}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-300 mb-2">Suspicious Evidence Phrases</p>
                  {analysis.suspicious_phrases.length === 0 ? (
                    <p className="text-xs text-slate-500">None highlighted yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {analysis.suspicious_phrases.map((phrase) => (
                        <p
                          key={phrase}
                          className="text-xs font-mono text-amber-200 bg-amber-950/25 border border-amber-500/25 rounded px-2.5 py-1.5"
                        >
                          &ldquo;{phrase}&rdquo;
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-300 mb-1">Preliminary Explanation</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{analysis.explanation}</p>
                </div>

                {activeCall && activeCall.status === 'ended' && (
                  <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3 flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Square className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      Session Ended
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSection('evidence-reports')}
                      className="text-cyan-300 hover:text-cyan-200 font-medium"
                    >
                      View Generated Report
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">Start or select a call session to view live risk metrics.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
