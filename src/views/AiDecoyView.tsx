import { useEffect, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Pause,
  Play,
  Send,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { DEMO_SCENARIOS } from '../data/seedData';
import { useScamSentry } from '../context/ScamSentryContext';
import { getVoiceAdapterInfo, speakDemoBrowserTts } from '../services/adapters';
import { AudioWaveform } from '../components/AudioWaveform';

export function AiDecoyView() {
  const {
    decoySessions,
    activeDecoyId,
    setActiveDecoyId,
    startStandaloneDecoy,
    sendCallerToDecoy,
    toggleDecoyStatus,
    completeDecoySession,
    setActiveSection,
    health,
  } = useScamSentry();

  const [callerInput, setCallerInput] = useState('');
  const [sending, setSending] = useState(false);
  const [elapsedTick, setElapsedTick] = useState(0);

  const activeDecoy = decoySessions.find((d) => d.id === activeDecoyId) || decoySessions[0] || null;
  const voiceAdapter = getVoiceAdapterInfo(health.agoraConfigured, health.murfConfigured);

  useEffect(() => {
    if (!activeDecoy || activeDecoy.status !== 'active') return;
    const timer = window.setInterval(() => setElapsedTick((t) => t + 1), 1000);
    return () => window.clearInterval(timer);
  }, [activeDecoy]);

  const handleStartScenarioDecoy = async (scenarioId: string) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId) || DEMO_SCENARIOS[0];
    setSending(true);
    await startStandaloneDecoy(scenario);
    setElapsedTick(0);
    setSending(false);
  };

  const handleSendCallerTurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDecoy || !callerInput.trim() || sending || activeDecoy.status !== 'active') return;
    setSending(true);
    await sendCallerToDecoy(activeDecoy.id, callerInput.trim());
    setCallerInput('');
    setSending(false);
  };

  const handleSimulateScammerPush = async () => {
    if (!activeDecoy || sending || activeDecoy.status !== 'active') return;
    const scenario =
      DEMO_SCENARIOS.find((s) => activeDecoy.scenarioTitle.includes(s.code)) || DEMO_SCENARIOS[0];
    const followUp =
      scenario.scammerFollowUps[
        activeDecoy.messages.filter((m) => m.speaker === 'caller').length %
          scenario.scammerFollowUps.length
      ];
    setSending(true);
    await sendCallerToDecoy(activeDecoy.id, followUp);
    setSending(false);
  };

  const handleCompleteSession = () => {
    if (!activeDecoy) return;
    const report = completeDecoySession(activeDecoy.id);
    if (report) {
      setActiveSection('evidence-reports');
    }
  };

  const displayDuration = activeDecoy
    ? activeDecoy.durationSec + (activeDecoy.status === 'active' ? elapsedTick : 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Voice Adapter Status Banner (Transparently Labeled Demo Mode) */}
      <div className="sentry-panel rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
            <Bot className="w-4 h-4" aria-hidden="true" />
            <span>{voiceAdapter.provider}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono text-amber-300">{voiceAdapter.modeLabel}</span>
          </div>
          <p className="text-xs text-slate-300">{voiceAdapter.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {DEMO_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              disabled={sending}
              onClick={() => handleStartScenarioDecoy(sc.id)}
              className="px-3 py-2 rounded-lg bg-[#131C31] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-100 whitespace-nowrap"
            >
              Launch {sc.code} Decoy
            </button>
          ))}
        </div>
      </div>

      {/* Session List Tabs */}
      {decoySessions.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {decoySessions.slice(0, 5).map((ds) => (
            <button
              key={ds.id}
              type="button"
              onClick={() => {
                setActiveDecoyId(ds.id);
                setElapsedTick(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap shrink-0 ${
                ds.id === activeDecoy?.id
                  ? 'bg-cyan-500/12 border-cyan-400/40 text-cyan-200'
                  : 'bg-[#0D1424] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {ds.scenarioTitle.slice(0, 32)} · <span className="font-mono uppercase">{ds.status}</span>
            </button>
          ))}
        </div>
      )}

      {activeDecoy ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left 8 Cols: Active Decoy Conversation */}
          <div className="xl:col-span-8 sentry-panel rounded-xl p-5 space-y-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-display font-semibold text-white">
                  {activeDecoy.scenarioTitle}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeDecoy.callerPersona} · Agent Status:{' '}
                  <span className="font-mono text-cyan-300 uppercase">{activeDecoy.status}</span> ·{' '}
                  <span className="font-mono tabular-nums">{displayDuration}s</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeDecoy.status !== 'completed' && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleDecoyStatus(activeDecoy.id)}
                      className="px-3 py-2 rounded-lg bg-[#131C31] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-100 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {activeDecoy.status === 'active' ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                          Pause Agent
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                          Resume Agent
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteSession}
                      className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Stop &amp; Generate Report
                    </button>
                  </>
                )}
              </div>
            </div>

            <AudioWaveform
              active={activeDecoy.status === 'active'}
              speaker="ai-decoy"
              intensity={0.75}
            />

            <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-4 space-y-3 min-h-[280px] max-h-[400px] overflow-y-auto">
              {activeDecoy.messages.map((msg) => {
                const isAi = msg.speaker === 'ai-decoy';
                return (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-lg border text-sm ${
                      isAi
                        ? 'bg-cyan-950/25 border-cyan-500/30 text-cyan-50'
                        : 'bg-orange-950/20 border-orange-500/25 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs mb-1">
                      <span className="font-semibold">
                        {isAi ? 'ScamSentry AI Decoy' : 'Suspected Scammer (Simulated)'}
                      </span>
                      <div className="flex items-center gap-2">
                        {isAi && (
                          <button
                            type="button"
                            onClick={() => speakDemoBrowserTts(msg.text)}
                            aria-label="Play AI Decoy voice preview"
                            className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
                          >
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span className="text-[11px]">Speak</span>
                          </button>
                        )}
                        <span className="font-mono tabular-nums text-slate-400">{msg.timestamp}</span>
                      </div>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.detectedTactic && (
                      <p className="text-xs text-amber-300 mt-1.5">
                        Detected Tactic: {msg.detectedTactic}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {activeDecoy.status === 'active' ? (
              <form onSubmit={handleSendCallerTurn} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="decoy-caller-input" className="text-xs font-medium text-slate-300">
                    Simulate Caller Turn (AI Decoy will reply safely)
                  </label>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={handleSimulateScammerPush}
                    className="text-xs text-cyan-300 hover:text-cyan-200 font-medium"
                  >
                    + Auto-send next scammer pressure line
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    id="decoy-caller-input"
                    type="text"
                    value={callerInput}
                    onChange={(e) => setCallerInput(e.target.value)}
                    placeholder="Type a simulated scammer message (e.g. Just share your verification code now)..."
                    className="flex-1 h-10 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
                  />
                  <button
                    type="submit"
                    disabled={sending || !callerInput.trim()}
                    className="px-4 h-10 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    {sending ? 'Replying...' : 'Send to Decoy'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="rounded-lg bg-emerald-950/20 border border-emerald-500/30 p-4 text-xs text-slate-200 space-y-1">
                <p className="font-semibold text-emerald-300">Post-Session Decoy Summary</p>
                <p className="leading-relaxed">{activeDecoy.summary}</p>
              </div>
            )}
          </div>

          {/* Right 4 Cols: Guardrails, Tactics & Extracted Indicators */}
          <div className="xl:col-span-4 space-y-4 min-w-0">
            <div className="sentry-panel rounded-xl p-5 space-y-4">
              <h3 className="text-base font-display font-semibold text-white">Decoy Guardrails</h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Never exposes real user identity, OTPs, PINs, or account numbers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Never clicks unverified URLs or executes financial transfers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Maintains polite, non-provocative inquiry to surface verifiable claims.</span>
                </li>
              </ul>

              <div className="pt-3 border-t border-slate-800/80">
                <p className="text-xs font-medium text-slate-300 mb-2">Detected Tactics</p>
                <div className="space-y-1.5">
                  {activeDecoy.detectedTactics.map((t) => (
                    <p key={t} className="text-xs text-amber-200 bg-amber-950/20 border border-amber-500/25 rounded px-2.5 py-1.5">
                      {t}
                    </p>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <p className="text-xs font-medium text-slate-300">Extracted Threat Indicators</p>
                <div className="text-xs space-y-1 font-mono text-slate-300">
                  <p>
                    URLs:{' '}
                    {activeDecoy.extractedIndicators.urls.length
                      ? activeDecoy.extractedIndicators.urls.join(', ')
                      : 'None yet'}
                  </p>
                  <p>
                    Phones:{' '}
                    {activeDecoy.extractedIndicators.phoneNumbers.length
                      ? activeDecoy.extractedIndicators.phoneNumbers.join(', ')
                      : 'None yet'}
                  </p>
                  <p>
                    Payment IDs:{' '}
                    {activeDecoy.extractedIndicators.paymentIdentifiers.length
                      ? activeDecoy.extractedIndicators.paymentIdentifiers.join(', ')
                      : 'None yet'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="sentry-panel rounded-xl p-8 text-center space-y-3">
          <p className="text-sm text-slate-300">No AI Decoy sessions active yet.</p>
          <button
            type="button"
            onClick={() => handleStartScenarioDecoy('banking-otp')}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs"
          >
            Start Banking OTP Decoy Demo
          </button>
        </div>
      )}
    </div>
  );
}
