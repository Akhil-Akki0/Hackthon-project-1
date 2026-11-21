import { useState } from 'react';
import {
  AlertOctagon,
  Bot,
  CheckCircle2,
  FileText,
  Network,
  Play,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { DEMO_SCENARIOS } from '../data/seedData';
import { useScamSentry } from '../context/ScamSentryContext';
import type { DemoScenario } from '../types/scamsentry';

export function InteractiveDemoModal() {
  const {
    demoModalOpen,
    setDemoModalOpen,
    startLiveCallSession,
    appendCallTranscript,
    activateDecoyForCall,
    sendCallerToDecoy,
    completeDecoySession,
    setActiveSection,
    setSelectedReportId,
  } = useScamSentry();

  const [selectedScenario, setSelectedScenario] = useState<DemoScenario>(DEMO_SCENARIOS[0]);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedReportId, setCompletedReportId] = useState<string | null>(null);
  const [stepLogs, setStepLogs] = useState<string[]>([]);

  if (!demoModalOpen) return null;

  const STEPS = [
    '1. Simulated incoming call starts',
    '2. AI detects suspicious phrases',
    '3. Risk score & confidence generated',
    '4. Dashboard metrics updated',
    '5. User activates AI Decoy',
    '6. AI Decoy engages suspected scammer',
    '7. Decoy conversation safely concludes',
    '8. Threat indicators extracted & clustered',
    '9. Structured Evidence Report generated',
    '10. Family Protection alert dispatched',
  ];

  const runFullDemoWorkflow = async () => {
    setRunning(true);
    setCurrentStep(1);
    setCompletedReportId(null);
    setStepLogs([`Starting ${selectedScenario.code}: ${selectedScenario.title} (Simulated Demo)`]);

    const call = startLiveCallSession({
      title: `${selectedScenario.code}: ${selectedScenario.title}`,
      callerLabel: selectedScenario.callerLabel,
      channel: 'Voice Call (Simulated)',
    });

    setCurrentStep(2);
    for (let i = 0; i < selectedScenario.callerScript.length; i++) {
      const line = selectedScenario.callerScript[i];
      const isLast = i === selectedScenario.callerScript.length - 1;
      await appendCallTranscript(call.id, 'caller', line, !isLast);
      setStepLogs((prev) => [...prev, `Caller: "${line}"`]);
    }

    setCurrentStep(4);
    setStepLogs((prev) => [
      ...prev,
      `AI Detection Engine scored ${selectedScenario.category} threat and updated Dashboard counters.`,
    ]);

    setCurrentStep(5);
    const decoy = await activateDecoyForCall(call.id);
    if (decoy) {
      setStepLogs((prev) => [...prev, `AI Decoy activated (${decoy.voiceAdapterMode}).`]);
      setCurrentStep(6);
      const followUp = selectedScenario.scammerFollowUps[0];
      if (followUp) {
        await sendCallerToDecoy(decoy.id, followUp);
        setStepLogs((prev) => [...prev, `AI Decoy engaged follow-up without sharing credentials.`]);
      }

      setCurrentStep(8);
      const report = completeDecoySession(decoy.id);
      if (report) {
        setCompletedReportId(report.id);
        setStepLogs((prev) => [
          ...prev,
          `Extracted indicators added to Collective Scam Intelligence.`,
          `Generated Evidence Report ${report.id} and sent simulated Family Protection alert.`,
        ]);
      }
    }

    setCurrentStep(10);
    setRunning(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interactive-demo-title"
    >
      <div className="w-full max-w-3xl rounded-xl bg-[#0D1424] border border-slate-700/80 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 id="interactive-demo-title" className="text-lg font-display font-semibold text-slate-100">
              Interactive ScamSentry AI Demo
            </h2>
            <p className="text-xs text-slate-400">
              All scenarios run in clearly labeled Simulated Demo Mode without external telephony or API keys.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDemoModalOpen(false)}
            aria-label="Close Interactive Demo"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Scenario Selector */}
          <div>
            <p className="text-xs font-medium text-slate-300 mb-2.5">Select Demonstration Scenario</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {DEMO_SCENARIOS.map((sc) => {
                const isSelected = sc.id === selectedScenario.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    disabled={running}
                    onClick={() => setSelectedScenario(sc)}
                    className={`text-left p-3.5 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/12 border-cyan-400/50 text-slate-100'
                        : 'bg-[#090F1D] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-mono text-cyan-300 mb-1">{sc.code}</p>
                    <p className="text-sm font-semibold mb-1">{sc.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{sc.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 10-Step Pipeline Progress */}
          <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-200">
                End-to-End Workflow Progress
              </span>
              <span className="text-xs font-mono tabular-nums text-cyan-300">
                Step {currentStep} / 10
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STEPS.map((label, idx) => {
                const done = currentStep >= idx + 1;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded ${
                      done ? 'text-emerald-300 bg-emerald-950/30' : 'text-slate-400 bg-slate-900/40'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${done ? 'text-emerald-400' : 'text-slate-600'}`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Execution Log */}
          {stepLogs.length > 0 && (
            <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-4 space-y-1.5 max-h-44 overflow-y-auto">
              <p className="text-xs font-medium text-slate-300 mb-1">Simulated Execution Trace</p>
              {stepLogs.map((log, i) => (
                <p key={i} className="text-xs font-mono text-slate-300 leading-relaxed">
                  {log}
                </p>
              ))}
            </div>
          )}

          {/* Post-Demo Quick Jumps */}
          {completedReportId && (
            <div className="rounded-lg bg-emerald-950/25 border border-emerald-500/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-emerald-200">
                    Workflow Complete — Dashboard, Intelligence, Report & Family Alert Updated
                  </p>
                  <p className="text-xs text-slate-300">
                    Report <span className="font-mono">{completedReportId}</span> is ready to inspect.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReportId(completedReportId);
                    setActiveSection('evidence-reports');
                    setDemoModalOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  View Report
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('family-protection');
                    setDemoModalOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                  Family Alert
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-[#090F1D] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              Simulated Demo
            </span>
            <span className="inline-flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
              AI Decoy
            </span>
            <span className="inline-flex items-center gap-1">
              <Network className="w-3.5 h-3.5 text-indigo-300" aria-hidden="true" />
              Intelligence Sync
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDemoModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
            >
              Close
            </button>
            <button
              type="button"
              disabled={running}
              onClick={runFullDemoWorkflow}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              {running ? 'Running End-to-End Demo...' : 'Run Full 10-Step Demo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
