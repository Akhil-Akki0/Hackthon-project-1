import { useState } from 'react';
import {
  FileText,
  FileUp,
  Globe,
  Link2,
  SearchCheck,
  ShieldAlert,
} from 'lucide-react';
import { useScamSentry } from '../context/ScamSentryContext';
import type { ScamAnalysisRecord } from '../types/scamsentry';
import { RiskLabel } from '../components/RiskBadge';

const PRESET_EXAMPLES: Array<{
  label: string;
  inputType: ScamAnalysisRecord['inputType'];
  text: string;
}> = [
  {
    label: 'Lottery Fee SMS',
    inputType: 'sms',
    text: 'Congratulations! You have won ₹50,000. Pay ₹999 processing charges to claim your reward immediately.',
  },
  {
    label: 'Fake Bank KYC WhatsApp',
    inputType: 'whatsapp',
    text: 'Dear customer, your bank account will be suspended within 24 hours. Update KYC immediately at http://hdfc-kyc-verify.xyz/login or share your 6-digit OTP.',
  },
  {
    label: 'Suspicious URL Check',
    inputType: 'url',
    text: 'http://sbi-kyc-alert.xyz/verify',
  },
  {
    label: 'Job Deposit Email',
    inputType: 'email',
    text: 'Urgent remote hiring offer! Earn ₹3,500 daily. Send a refundable ₹1,500 security deposit to hrdesk.pay@ybl via UPI to activate your task portal.',
  },
];

export function ScamAnalyzerView() {
  const {
    analyzeStandaloneInput,
    scamAnalyses,
    createReportFromAnalysis,
    setActiveSection,
  } = useScamSentry();

  const [inputType, setInputType] = useState<ScamAnalysisRecord['inputType']>('sms');
  const [text, setText] = useState(PRESET_EXAMPLES[0].text);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestRecord, setLatestRecord] = useState<ScamAnalysisRecord | null>(scamAnalyses[0] ?? null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Please paste a message, email, URL, or upload a text file to analyze.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const record = await analyzeStandaloneInput(text.trim(), inputType);
      setLatestRecord(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200_000) {
      setError('Please upload a plain text file under 200 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setInputType('file');
      setText(content);
      setError(null);
    };
    reader.readAsText(file);
  };

  const result = latestRecord?.result;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Input Form (Left 6 Cols) */}
        <div className="xl:col-span-6 sentry-panel rounded-xl p-5 space-y-4 min-w-0">
          <div>
            <h1 className="text-lg font-display font-semibold text-white">AI Scam Analyzer</h1>
            <p className="text-xs text-slate-400">
              Inspect suspicious SMS, WhatsApp messages, emails, URLs, or exported chat logs. URLs are inspected lexically without visiting them.
            </p>
          </div>

          {/* Input Channel Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-[#080E1B] border border-slate-800">
            {(['sms', 'whatsapp', 'email', 'url', 'file'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setInputType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium uppercase transition-colors ${
                  inputType === t
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Sample Presets */}
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400">Load Test Example:</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    setInputType(ex.inputType);
                    setText(ex.text);
                    setError(null);
                  }}
                  className="px-2.5 py-1 rounded bg-[#131C31] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-3">
            <div>
              <label htmlFor="scam-analyzer-textarea" className="block text-xs font-medium text-slate-300 mb-1.5">
                Suspicious Content ({inputType.toUpperCase()})
              </label>
              <textarea
                id="scam-analyzer-textarea"
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste suspicious SMS, email body, WhatsApp message, or URL..."
                className="w-full rounded-lg bg-[#080E1B] border border-slate-800 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#131C31] hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 cursor-pointer">
                <FileUp className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                <span>Upload .txt / .eml</span>
                <input
                  type="file"
                  accept=".txt,.eml,.csv,.log"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold text-sm flex items-center gap-2 whitespace-nowrap"
              >
                <SearchCheck className="w-4 h-4" aria-hidden="true" />
                {loading ? 'Analyzing Input...' : 'Analyze for Scam Signals'}
              </button>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-300 bg-red-950/30 border border-red-500/30 rounded px-3 py-2">
                {error}
              </p>
            )}
          </form>
        </div>

        {/* Structured Analysis Output (Right 6 Cols) */}
        <div className="xl:col-span-6 sentry-panel rounded-xl p-5 space-y-4 min-w-0">
          {result ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-display font-semibold text-white">Structured Analysis Result</h2>
                  <p className="text-xs text-slate-400">
                    Engine:{' '}
                    <span className="font-mono text-slate-300">
                      {result.engine === 'gemini-live' ? 'Gemini Live AI' : 'Deterministic Fallback Engine'}
                    </span>
                  </p>
                </div>
                <RiskLabel level={result.risk_level} />
              </div>

              {result.fallbackReason && (
                <p className="text-xs text-amber-200 bg-amber-950/25 border border-amber-500/30 rounded px-3 py-2">
                  {result.fallbackReason}
                </p>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-3">
                  <p className="text-xs text-slate-400">Risk Score</p>
                  <p className="text-xl font-display font-semibold font-mono tabular-nums text-white mt-0.5">
                    {result.risk_score}/100
                  </p>
                </div>
                <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-3">
                  <p className="text-xs text-slate-400">Confidence</p>
                  <p className="text-xl font-display font-semibold font-mono tabular-nums text-cyan-300 mt-0.5">
                    {Math.round(result.confidence * 100)}%
                  </p>
                </div>
                <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-3">
                  <p className="text-xs text-slate-400">Category</p>
                  <p className="text-sm font-semibold text-slate-100 mt-1 truncate">{result.scam_category}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-300 mb-1">Preliminary AI Explanation</p>
                <p className="text-xs text-slate-200 leading-relaxed">{result.explanation}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-300 mb-1.5">Manipulation Techniques</p>
                  <ul className="space-y-1 text-xs text-slate-200">
                    {result.detected_patterns.length ? (
                      result.detected_patterns.map((pat) => (
                        <li key={pat} className="flex items-start gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" aria-hidden="true" />
                          <span>{pat}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500">None detected</li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-300 mb-1.5">Suspicious Keywords / Phrases</p>
                  <div className="space-y-1">
                    {result.suspicious_phrases.length ? (
                      result.suspicious_phrases.map((kw) => (
                        <p key={kw} className="text-xs font-mono text-amber-200 bg-amber-950/20 rounded px-2 py-1">
                          {kw}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">None highlighted</p>
                    )}
                  </div>
                </div>
              </div>

              {/* URL Lexical Inspection (Offline) */}
              {result.url_inspections && result.url_inspections.length > 0 && (
                <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                    <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Offline URL Lexical Inspection (Not Visited)</span>
                  </div>
                  {result.url_inspections.map((u) => (
                    <div key={u.url} className="text-xs space-y-1 border-t border-slate-800/80 pt-2 first:border-t-0 first:pt-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-slate-100 truncate flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                          {u.domain}
                        </span>
                        <span className="font-mono tabular-nums text-amber-300">Lexical Risk: {u.riskScore}/100</span>
                      </div>
                      <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                        {u.characteristics.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-slate-500">{u.note}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div>
                  <p className="text-xs font-medium text-slate-300 mb-1">Recommended Actions</p>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {result.recommended_actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-300 mb-1">Safer Next Steps</p>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {result.safer_next_steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {latestRecord && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      createReportFromAnalysis(latestRecord);
                      setActiveSection('evidence-reports');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#131C31] hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-100 flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                    Generate Evidence Report
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400 py-12 text-center">
              Submit text or a URL on the left to inspect risk score, confidence, and indicators.
            </p>
          )}
        </div>
      </div>

      {/* Recent Standalone Scans */}
      {scamAnalyses.length > 0 && (
        <div className="sentry-panel rounded-xl p-5">
          <h3 className="text-sm font-display font-semibold text-white mb-3">Recent Standalone Scans</h3>
          <div className="divide-y divide-slate-800/80">
            {scamAnalyses.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLatestRecord(item)}
                className="w-full text-left py-2.5 flex items-center justify-between gap-4 hover:bg-slate-800/30 px-2 rounded transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 uppercase font-mono">
                    {item.inputType} · {item.result.scam_category}
                  </p>
                  <p className="text-sm text-slate-100 truncate">{item.inputPreview}</p>
                </div>
                <RiskLabel level={item.result.risk_level} score={item.result.risk_score} showScore />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
