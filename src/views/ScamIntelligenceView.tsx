import { useMemo, useState } from 'react';
import { Network, Plus, Search, ShieldAlert } from 'lucide-react';
import { useScamSentry } from '../context/ScamSentryContext';
import type { RiskLevel, ScamCategory } from '../types/scamsentry';
import { RiskLabel } from '../components/RiskBadge';

const CATEGORIES: Array<'All' | ScamCategory> = [
  'All',
  'Banking Fraud',
  'OTP Theft',
  'Phishing',
  'Job Scams',
  'Investment Fraud',
  'Lottery Scams',
  'Fake Customer Support',
  'Impersonation',
  'Payment Fraud',
];

export function ScamIntelligenceView() {
  const { threatIndicators, addThreatContribution, globalSearch } = useScamSentry();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | ScamCategory>('All');
  const [showContribute, setShowContribute] = useState(false);

  const [patternTitle, setPatternTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ScamCategory>('Banking Fraud');
  const [commonPhrase, setCommonPhrase] = useState('');
  const [indicatorRaw, setIndicatorRaw] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('High');
  const [recommendedAction, setRecommendedAction] = useState(
    'Do not share OTPs or click unverified links.'
  );

  const effectiveQuery = (search || globalSearch).trim().toLowerCase();

  const filtered = useMemo(() => {
    return threatIndicators.filter((ti) => {
      const catMatch = categoryFilter === 'All' || ti.scamCategory === categoryFilter;
      if (!catMatch) return false;
      if (!effectiveQuery) return true;
      return (
        ti.patternTitle.toLowerCase().includes(effectiveQuery) ||
        ti.commonPhrase.toLowerCase().includes(effectiveQuery) ||
        ti.scamCategory.toLowerCase().includes(effectiveQuery) ||
        ti.indicators.some((ind) => ind.toLowerCase().includes(effectiveQuery))
      );
    });
  }, [categoryFilter, effectiveQuery, threatIndicators]);

  const handleSubmitContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patternTitle.trim() || !commonPhrase.trim()) return;
    addThreatContribution({
      patternTitle: patternTitle.trim(),
      category: newCategory,
      commonPhrase: commonPhrase.trim(),
      indicators: indicatorRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      riskLevel,
      recommendedAction: recommendedAction.trim(),
    });
    setPatternTitle('');
    setCommonPhrase('');
    setIndicatorRaw('');
    setShowContribute(false);
  };

  return (
    <div className="space-y-6">
      {/* Collective Intelligence Banner */}
      <div className="sentry-panel rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-300">
            <Network className="w-4 h-4" aria-hidden="true" />
            <span>Collective Scam Intelligence Network · Simulated &amp; Privacy-Preserving</span>
          </div>
          <h1 className="text-xl font-display font-semibold text-white">
            Community Scam Patterns &amp; Recurring Indicators
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            When multiple users report similar suspicious patterns, the system identifies recurring patterns and generates a community warning. All dataset counts shown here are simulated for demonstration, deduplicated, anonymized without personal information, and do not imply independent forensic verification of unrelated reports.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowContribute((v) => !v)}
          className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Report Simulated Pattern
        </button>
      </div>

      {showContribute && (
        <form onSubmit={handleSubmitContribution} className="sentry-panel rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-display font-semibold text-white">
            Submit Anonymized Threat Pattern (Simulated)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="ti-title" className="block text-xs text-slate-300 mb-1">
                Pattern Title
              </label>
              <input
                id="ti-title"
                type="text"
                required
                value={patternTitle}
                onChange={(e) => setPatternTitle(e.target.value)}
                placeholder="e.g. Fake Utility Disconnection SMS"
                className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-xs text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="ti-cat" className="block text-xs text-slate-300 mb-1">
                Scam Category
              </label>
              <select
                id="ti-cat"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ScamCategory)}
                className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-xs text-slate-100"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ti-risk" className="block text-xs text-slate-300 mb-1">
                Risk Level
              </label>
              <select
                id="ti-risk"
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-xs text-slate-100"
              >
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ti-phrase" className="block text-xs text-slate-300 mb-1">
                Common Scam Phrase
              </label>
              <input
                id="ti-phrase"
                type="text"
                required
                value={commonPhrase}
                onChange={(e) => setCommonPhrase(e.target.value)}
                placeholder="e.g. Power will be disconnected tonight unless bill is verified..."
                className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-xs text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="ti-indicators" className="block text-xs text-slate-300 mb-1">
                Indicators (comma-separated URLs, phones, payment IDs)
              </label>
              <input
                id="ti-indicators"
                type="text"
                value={indicatorRaw}
                onChange={(e) => setIndicatorRaw(e.target.value)}
                placeholder="e.g. http://bill-pay-alert.xyz, pay@ybl"
                className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-xs text-slate-100"
              />
            </div>
          </div>
          <div>
            <label htmlFor="ti-action" className="block text-xs text-slate-300 mb-1">
              Recommended Safety Action
            </label>
            <input
              id="ti-action"
              type="text"
              value={recommendedAction}
              onChange={(e) => setRecommendedAction(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#080E1B] border border-slate-800 text-xs text-slate-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowContribute(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs"
            >
              Add Pattern
            </button>
          </div>
        </form>
      )}

      {/* Search and Category Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <label htmlFor="intel-search" className="sr-only">
            Filter intelligence patterns
          </label>
          <input
            id="intel-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phrases, URLs, phones, payment IDs..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#0D1424] border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.slice(0, 7).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap shrink-0 transition-colors ${
                categoryFilter === cat
                  ? 'bg-cyan-500/15 border-cyan-400/45 text-cyan-200'
                  : 'bg-[#0D1424] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Threat Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="sentry-panel rounded-xl p-8 text-center text-xs text-slate-400">
            No matching threat patterns found. Clear your filter or search query to view all patterns.
          </div>
        ) : (
          filtered.map((ti) => (
            <article key={ti.id} className="sentry-panel rounded-xl p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
                    <span className="text-cyan-300 font-medium">{ti.scamCategory}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{ti.reportCount} simulated reports</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      First seen {new Date(ti.firstSeen).toLocaleDateString()} · Last seen{' '}
                      {new Date(ti.lastSeen).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-base font-display font-semibold text-white">{ti.patternTitle}</h2>
                </div>
                <RiskLabel level={ti.riskLevel} />
              </div>

              <p className="text-xs font-mono text-amber-200 bg-amber-950/20 border border-amber-500/25 rounded px-3 py-2">
                Common phrase: &ldquo;{ti.commonPhrase}&rdquo;
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-medium mb-1">Recurring Indicators (Anonymized)</p>
                  <p className="font-mono text-slate-200 break-all">
                    {ti.indicators.length ? ti.indicators.join(' · ') : 'Phrase-only signature'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium mb-1">Recommended Action</p>
                  <p className="text-slate-200">{ti.recommendedAction}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-300">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-300 shrink-0" aria-hidden="true" />
                <span>{ti.communityWarning}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
