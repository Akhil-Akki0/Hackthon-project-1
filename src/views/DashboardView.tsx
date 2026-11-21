import {
  AlertTriangle,
  ArrowRight,
  Bot,
  FileText,
  Globe,
  Network,
  PhoneCall,
  Play,
  SearchCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useScamSentry } from '../context/ScamSentryContext';
import { RiskLabel } from '../components/RiskBadge';

export function DashboardView() {
  const {
    metrics,
    callSessions,
    decoySessions,
    threatIndicators,
    scamAnalyses,
    setActiveSection,
    setActiveCallId,
    setActiveDecoyId,
    setDemoModalOpen,
    health,
  } = useScamSentry();

  const kpis = [
    {
      label: 'Total Calls & Messages Analyzed',
      value: metrics.totalCallsAnalyzed,
      sub: 'Live + simulated baseline',
      icon: PhoneCall,
    },
    {
      label: 'Suspicious Calls Detected',
      value: metrics.suspiciousCallsDetected,
      sub: 'Risk score ≥ 45',
      icon: AlertTriangle,
    },
    {
      label: 'High-Risk Scams',
      value: metrics.highRiskScams,
      sub: 'High & Critical severity',
      icon: ShieldAlert,
    },
    {
      label: 'AI Decoy Sessions',
      value: metrics.aiDecoySessions,
      sub: 'Safe decoy engagements',
      icon: Bot,
    },
    {
      label: 'Threats Reported',
      value: metrics.threatsReported,
      sub: 'Collective intelligence total',
      icon: Network,
    },
  ];

  const recentSuspicious = [
    ...callSessions.map((c) => ({
      id: c.id,
      title: c.title,
      kind: 'Call Monitor' as const,
      category: c.latestAnalysis.scam_category,
      riskLevel: c.latestAnalysis.risk_level,
      score: c.latestAnalysis.risk_score,
      time: c.startedAt,
      onOpen: () => {
        setActiveCallId(c.id);
        setActiveSection('live-monitor');
      },
    })),
    ...scamAnalyses.map((a) => ({
      id: a.id,
      title: a.inputPreview,
      kind: 'Scam Analyzer' as const,
      category: a.result.scam_category,
      riskLevel: a.result.risk_level,
      score: a.result.risk_score,
      time: a.createdAt,
      onOpen: () => setActiveSection('scam-analyzer'),
    })),
  ]
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header / Primary Actions */}
      <div className="sentry-panel rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-300 font-medium">
            <span>ScamSentry AI Operations Overview</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400">
              {health.mode === 'DEMO_MODE' ? 'Simulated Demo Dataset Active' : 'Gemini Live AI + Simulated Telephony'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight text-white text-balance">
            Detect, Analyze &amp; Neutralize Social Engineering Threats
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Real-time call risk scoring, autonomous AI Decoy engagement, structured evidence reporting, and collective community scam intelligence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection('scam-analyzer')}
            className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <SearchCheck className="w-4 h-4" aria-hidden="true" />
            Start Scam Analysis
          </button>
          <button
            type="button"
            onClick={() => setDemoModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-[#131C31] hover:bg-slate-800 border border-slate-700 text-slate-100 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Play className="w-4 h-4 text-cyan-300" aria-hidden="true" />
            Launch Interactive Demo
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <section aria-label="Key Protection Metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="sentry-panel rounded-xl p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-400 leading-snug">{kpi.label}</span>
                <Icon className="w-4 h-4 text-cyan-300/80 shrink-0" aria-hidden="true" />
              </div>
              <div>
                <p
                  className="text-2xl font-display font-semibold text-white font-mono tabular-nums"
                  data-testid={`kpi-${kpi.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                >
                  {kpi.value}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Charts Row 1: Trend + Category Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="sentry-panel rounded-xl p-5 xl:col-span-2 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-display font-semibold text-white">Scam Detection Trend</h2>
              <p className="text-xs text-slate-400">Daily analyzed interactions, suspicious flags, and AI Decoy activations (Simulated + Live)</p>
            </div>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.trendSeries} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAnalyzed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSuspicious" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D1424',
                    borderColor: 'rgba(148,163,184,0.25)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                />
                <Area type="monotone" dataKey="analyzed" name="Analyzed" stroke="#22D3EE" fill="url(#gradAnalyzed)" strokeWidth={2} />
                <Area type="monotone" dataKey="suspicious" name="Suspicious" stroke="#F97316" fill="url(#gradSuspicious)" strokeWidth={2} />
                <Area type="monotone" dataKey="decoyed" name="AI Decoy" stroke="#818CF8" fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="sentry-panel rounded-xl p-5 min-w-0">
          <div className="mb-4">
            <h2 className="text-base font-display font-semibold text-white">Scam Category Distribution</h2>
            <p className="text-xs text-slate-400">Most frequent suspected scam vectors</p>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.categoryDistribution}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="#CBD5E1" fontSize={11} width={110} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D1424',
                    borderColor: 'rgba(148,163,184,0.25)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Incidents" fill="#22D3EE" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Risk-Level Distribution + Geographic Threat Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="sentry-panel rounded-xl p-5 min-w-0">
          <div className="mb-4">
            <h2 className="text-base font-display font-semibold text-white">Risk-Level Distribution</h2>
            <p className="text-xs text-slate-400">Severity breakdown across analyzed conversations</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.riskDistribution}
                    dataKey="count"
                    nameKey="level"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={3}
                  >
                    {metrics.riskDistribution.map((entry) => (
                      <Cell key={entry.level} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1424',
                      borderColor: 'rgba(148,163,184,0.25)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5">
              {metrics.riskDistribution.map((item) => (
                <div key={item.level} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: item.fill }} />
                    <span className="text-slate-200">{item.level}</span>
                  </div>
                  <span className="font-mono tabular-nums text-slate-300">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sentry-panel rounded-xl p-5 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-display font-semibold text-white">Regional Threat Activity</h2>
              <p className="text-xs text-slate-400">Aggregated simulated carrier relay clusters (anonymized)</p>
            </div>
            <Globe className="w-4 h-4 text-cyan-300 shrink-0" aria-hidden="true" />
          </div>
          <div className="space-y-3.5">
            {metrics.regionalThreats.map((reg) => (
              <div key={reg.region} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium">{reg.region}</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {reg.incidents} reports · {reg.topCategory}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800/90 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400"
                    style={{ width: `${reg.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Operational Lists: Recent Activity, Decoy Sessions, Collective Threat Updates */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Suspicious Activity */}
        <div className="sentry-panel rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-display font-semibold text-white">Recent Suspicious Activity</h2>
              <button
                type="button"
                onClick={() => setActiveSection('live-monitor')}
                className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 whitespace-nowrap"
              >
                Live Monitor
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="divide-y divide-slate-800/80">
              {recentSuspicious.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onOpen}
                  className="w-full text-left py-3 first:pt-1 last:pb-1 hover:bg-slate-800/30 rounded transition-colors px-1"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-400">
                      {item.kind} · {item.category}
                    </span>
                    <RiskLabel level={item.riskLevel} score={item.score} showScore />
                  </div>
                  <p className="text-sm text-slate-100 truncate">{item.title}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent AI Decoy Sessions */}
        <div className="sentry-panel rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-display font-semibold text-white">Recent AI Decoy Sessions</h2>
              <button
                type="button"
                onClick={() => setActiveSection('ai-decoy')}
                className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 whitespace-nowrap"
              >
                Open Decoy
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="divide-y divide-slate-800/80">
              {decoySessions.slice(0, 3).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setActiveDecoyId(d.id);
                    setActiveSection('ai-decoy');
                  }}
                  className="w-full text-left py-3 first:pt-1 last:pb-1 hover:bg-slate-800/30 rounded transition-colors px-1"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-1">
                    <span className="uppercase font-mono text-cyan-300">{d.status}</span>
                    <span className="font-mono tabular-nums">{d.durationSec}s · {d.messages.length} turns</span>
                  </div>
                  <p className="text-sm font-medium text-slate-100 truncate">{d.scenarioTitle}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{d.summary}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Collective Threat Intelligence Updates */}
        <div className="sentry-panel rounded-xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-display font-semibold text-white">Threat Intelligence Updates</h2>
              <button
                type="button"
                onClick={() => setActiveSection('scam-intelligence')}
                className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 whitespace-nowrap"
              >
                Explore Network
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="divide-y divide-slate-800/80">
              {threatIndicators.slice(0, 3).map((ti) => (
                <button
                  key={ti.id}
                  type="button"
                  onClick={() => setActiveSection('scam-intelligence')}
                  className="w-full text-left py-3 first:pt-1 last:pb-1 hover:bg-slate-800/30 rounded transition-colors px-1"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-slate-400">
                      {ti.scamCategory} · <span className="font-mono tabular-nums">{ti.reportCount} reports</span>
                    </span>
                    <RiskLabel level={ti.riskLevel} />
                  </div>
                  <p className="text-sm font-medium text-slate-100 truncate">{ti.patternTitle}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSection('evidence-reports')}
            className="w-full px-3 py-2 rounded-lg bg-[#131C31] hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 flex items-center justify-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
            Inspect Preliminary Evidence Reports
          </button>
        </div>
      </div>
    </div>
  );
}
