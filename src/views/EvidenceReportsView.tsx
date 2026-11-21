import { useMemo, useState } from 'react';
import { Check, Copy, Download, FileJson, FileText, Search } from 'lucide-react';
import { useScamSentry } from '../context/ScamSentryContext';
import type { RiskLevel } from '../types/scamsentry';
import {
  downloadReportAsJson,
  downloadReportAsPdf,
  formatReportSummaryText,
} from '../utils/reportExport';
import { RiskLabel } from '../components/RiskBadge';

export function EvidenceReportsView() {
  const { reports, selectedReportId, setSelectedReportId, globalSearch } = useScamSentry();
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'All' | RiskLevel>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const effectiveQuery = (search || globalSearch).trim().toLowerCase();

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (riskFilter !== 'All' && r.riskLevel !== riskFilter) return false;
      if (!effectiveQuery) return true;
      return (
        r.id.toLowerCase().includes(effectiveQuery) ||
        r.scamCategory.toLowerCase().includes(effectiveQuery) ||
        r.conversationSummary.toLowerCase().includes(effectiveQuery)
      );
    });
  }, [effectiveQuery, reports, riskFilter]);

  const activeReport =
    filteredReports.find((r) => r.id === selectedReportId) || filteredReports[0] || null;

  const handleCopySummary = async () => {
    if (!activeReport) return;
    const text = formatReportSummaryText(activeReport);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(activeReport.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <div className="space-y-6">
      <div className="sentry-panel rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <label htmlFor="report-search" className="sr-only">
            Search evidence reports
          </label>
          <input
            id="report-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by report ID, category, or summary..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#080E1B] border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setRiskFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap ${
                riskFilter === lvl
                  ? 'bg-cyan-500/15 border-cyan-400/45 text-cyan-200'
                  : 'bg-[#080E1B] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Report List (Left 4 Cols) */}
        <div className="xl:col-span-4 sentry-panel rounded-xl p-4 space-y-2 max-h-[680px] overflow-y-auto">
          <h2 className="text-sm font-display font-semibold text-white px-1 mb-2">
            Generated Reports ({filteredReports.length})
          </h2>
          {filteredReports.length === 0 ? (
            <p className="text-xs text-slate-400 p-6 text-center">
              No evidence reports match your filter. Complete a Live Call, AI Decoy session, or Scam Analyzer scan to generate one.
            </p>
          ) : (
            filteredReports.map((r) => {
              const selected = r.id === activeReport?.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReportId(r.id)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-colors ${
                    selected
                      ? 'bg-cyan-500/12 border-cyan-400/45'
                      : 'bg-[#080E1B] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs text-cyan-300">{r.id}</span>
                    <RiskLabel level={r.riskLevel} score={r.riskScore} showScore />
                  </div>
                  <p className="text-sm font-medium text-slate-100">{r.scamCategory}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{r.conversationSummary}</p>
                </button>
              );
            })
          )}
        </div>

        {/* Detailed Report Viewer (Right 8 Cols) */}
        <div className="xl:col-span-8 sentry-panel rounded-xl p-6 space-y-5 min-w-0">
          {activeReport ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <p className="font-mono text-xs text-cyan-300 mb-1">
                    {activeReport.id} · {new Date(activeReport.createdAt).toLocaleString()}
                  </p>
                  <h1 className="text-xl font-display font-semibold text-white">
                    {activeReport.scamCategory} Evidence Report
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Risk Score:{' '}
                    <span className="font-mono tabular-nums text-white">{activeReport.riskScore}/100</span> ·
                    Detection Confidence:{' '}
                    <span className="font-mono tabular-nums text-cyan-300">
                      {Math.round(activeReport.confidence * 100)}%
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadReportAsPdf(activeReport)}
                    className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadReportAsJson(activeReport)}
                    className="px-3 py-2 rounded-lg bg-[#131C31] hover:bg-slate-800 border border-slate-700 text-slate-100 font-medium text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <FileJson className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="px-3 py-2 rounded-lg bg-[#131C31] hover:bg-slate-800 border border-slate-700 text-slate-100 font-medium text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {copiedId === activeReport.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        Copy Summary
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Preliminary Analysis Disclaimer */}
              <div className="rounded-lg bg-amber-950/25 border border-amber-500/35 px-4 py-2.5 text-xs text-amber-200">
                {activeReport.preliminaryNotice}
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Conversation Summary
                  </h3>
                  <p className="text-slate-200 leading-relaxed text-sm">{activeReport.conversationSummary}</p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    AI Analysis Explanation
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-xs">{activeReport.aiExplanation}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-4">
                    <h3 className="text-xs font-semibold text-slate-300 mb-2">Detected Scam Techniques</h3>
                    <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                      {activeReport.scamTechniques.length ? (
                        activeReport.scamTechniques.map((t) => <li key={t}>{t}</li>)
                      ) : (
                        <li className="text-slate-500">None logged</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-[#080E1B] border border-slate-800 p-4">
                    <h3 className="text-xs font-semibold text-slate-300 mb-2">Extracted Indicators</h3>
                    <div className="text-xs font-mono text-slate-200 space-y-1">
                      <p>URLs: {activeReport.extractedIndicators.urls.join(', ') || 'None'}</p>
                      <p>Phones: {activeReport.extractedIndicators.phoneNumbers.join(', ') || 'None'}</p>
                      <p>
                        Payment IDs: {activeReport.extractedIndicators.paymentIdentifiers.join(', ') || 'None'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Suspicious Phrases
                  </h3>
                  <div className="space-y-1.5">
                    {activeReport.suspiciousPhrases.length ? (
                      activeReport.suspiciousPhrases.map((p) => (
                        <p key={p} className="text-xs font-mono text-amber-200 bg-amber-950/20 rounded px-3 py-1.5">
                          &ldquo;{p}&rdquo;
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No specific phrases extracted.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Relevant Timestamps
                  </h3>
                  <div className="divide-y divide-slate-800/80 rounded-lg bg-[#080E1B] border border-slate-800 px-3">
                    {activeReport.relevantTimestamps.map((ts, idx) => (
                      <div key={idx} className="py-2 flex items-start gap-3 text-xs">
                        <span className="font-mono tabular-nums text-cyan-300 shrink-0">{ts.time}</span>
                        <span className="text-slate-300">{ts.excerpt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Recommended User Actions
                  </h3>
                  <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
                    {activeReport.recommendedActions.map((act) => (
                      <li key={act}>{act}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" aria-hidden="true" />
              <p className="text-sm text-slate-300">Select a report on the left to inspect or export.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
