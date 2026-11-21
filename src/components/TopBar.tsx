import { useMemo, useState } from 'react';
import { Bell, Check, Menu, Search, ShieldAlert, Trash2, X } from 'lucide-react';
import { useScamSentry } from '../context/ScamSentryContext';
import type { NavSection } from '../types/scamsentry';

interface TopBarProps {
  onOpenMobileNav: () => void;
}

const SECTION_LABELS: Record<NavSection, string> = {
  dashboard: 'Overview Dashboard',
  'live-monitor': 'Live Call Monitor',
  'ai-decoy': 'AI Decoy System',
  'scam-analyzer': 'Scam Analyzer',
  'scam-intelligence': 'Scam Intelligence Network',
  'evidence-reports': 'Evidence Reports',
  'family-protection': 'Family Protection',
  settings: 'Settings & Privacy',
};

export function TopBar({ onOpenMobileNav }: TopBarProps) {
  const {
    activeSection,
    setActiveSection,
    globalSearch,
    setGlobalSearch,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    user,
    health,
    reports,
    threatIndicators,
    callSessions,
    setSelectedReportId,
    setActiveCallId,
  } = useScamSentry();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const searchMatches = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];

    const results: Array<{
      id: string;
      kind: string;
      label: string;
      section: NavSection;
      onSelect: () => void;
    }> = [];

    for (const r of reports) {
      if (
        r.id.toLowerCase().includes(q) ||
        r.scamCategory.toLowerCase().includes(q) ||
        r.conversationSummary.toLowerCase().includes(q)
      ) {
        results.push({
          id: r.id,
          kind: 'Report',
          label: `${r.id} · ${r.scamCategory}`,
          section: 'evidence-reports',
          onSelect: () => {
            setSelectedReportId(r.id);
            setActiveSection('evidence-reports');
            setGlobalSearch('');
          },
        });
      }
    }

    for (const ti of threatIndicators) {
      if (
        ti.patternTitle.toLowerCase().includes(q) ||
        ti.commonPhrase.toLowerCase().includes(q) ||
        ti.scamCategory.toLowerCase().includes(q)
      ) {
        results.push({
          id: ti.id,
          kind: 'Threat Pattern',
          label: `${ti.patternTitle} (${ti.reportCount} reports)`,
          section: 'scam-intelligence',
          onSelect: () => {
            setActiveSection('scam-intelligence');
          },
        });
      }
    }

    for (const cs of callSessions) {
      if (cs.title.toLowerCase().includes(q) || cs.callerLabel.toLowerCase().includes(q)) {
        results.push({
          id: cs.id,
          kind: 'Call Session',
          label: `${cs.title} · ${cs.latestAnalysis.scam_category}`,
          section: 'live-monitor',
          onSelect: () => {
            setActiveCallId(cs.id);
            setActiveSection('live-monitor');
            setGlobalSearch('');
          },
        });
      }
    }

    return results.slice(0, 6);
  }, [
    callSessions,
    globalSearch,
    reports,
    setActiveCallId,
    setActiveSection,
    setGlobalSearch,
    setSelectedReportId,
    threatIndicators,
  ]);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#070B14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/70"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <p className="text-xs text-slate-400 hidden sm:block truncate">
            ScamSentry AI / <span className="text-slate-200">{SECTION_LABELS[activeSection]}</span>
          </p>
          <p className="text-sm font-display font-semibold text-slate-100 sm:hidden truncate">
            {SECTION_LABELS[activeSection]}
          </p>
        </div>
      </div>

      {/* Global Search */}
      <div className="relative flex-1 max-w-md hidden md:block">
        <label htmlFor="global-search-input" className="sr-only">
          Search threats, reports, and sessions
        </label>
        <Search
          className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id="global-search-input"
          type="search"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Search threat patterns, report IDs, calls..."
          className="w-full h-9 pl-9 pr-8 rounded-lg bg-[#0D1424] border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
        />
        {globalSearch && (
          <button
            type="button"
            onClick={() => setGlobalSearch('')}
            aria-label="Clear global search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {searchMatches.length > 0 && (
          <div className="absolute left-0 right-0 mt-1.5 rounded-lg bg-[#0E1629] border border-slate-700/80 shadow-xl py-1.5 z-40">
            {searchMatches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={match.onSelect}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800/70 flex items-center justify-between gap-2"
              >
                <span className="text-slate-200 truncate">{match.label}</span>
                <span className="text-slate-400 font-mono shrink-0">{match.kind}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls: System Status, Notifications, Profile */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="hidden xl:flex items-center gap-2 text-xs text-slate-300 px-2.5 py-1.5 rounded-md bg-[#0D1424] border border-slate-800 whitespace-nowrap"
          title="Live adapter status"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-300 shrink-0" aria-hidden="true" />
          <span>{health.geminiConfigured ? 'Gemini Live · Voice Demo Mode' : 'Demo Mode (Simulated)'}</span>
        </div>

        {/* Notification Center Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((o) => !o);
              setProfileOpen(false);
            }}
            aria-label={`Notifications (${unreadCount} unread)`}
            aria-expanded={notifOpen}
            className="relative p-2 rounded-lg bg-[#0D1424] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-400 text-slate-950 font-mono text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              role="dialog"
              aria-label="Notification Center"
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#0D1424] border border-slate-700/80 shadow-2xl z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-100">Notifications</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Mark all read
                  </button>
                  <button
                    type="button"
                    onClick={clearNotifications}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/70">
                {notifications.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-400">
                    No active notifications. Alerts from Live Monitor, AI Decoy, and Family Protection appear here.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 text-xs transition-colors ${
                        n.read ? 'bg-transparent opacity-75' : 'bg-cyan-950/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-semibold text-slate-100">{n.title}</span>
                        <span className="font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed mb-2">{n.message}</p>
                      <div className="flex items-center justify-between">
                        {n.targetSection ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSection(n.targetSection!);
                              markNotificationRead(n.id);
                              setNotifOpen(false);
                            }}
                            className="text-cyan-300 hover:text-cyan-200 font-medium"
                          >
                            Open view
                          </button>
                        ) : (
                          <span />
                        )}
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(n.id)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((o) => !o);
              setNotifOpen(false);
            }}
            aria-label="Open user profile menu"
            aria-expanded={profileOpen}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-lg bg-[#0D1424] border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <img
              src={user.avatarUrl}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-md object-cover bg-slate-800 shrink-0"
            />
            <span className="hidden sm:block text-xs font-medium text-slate-200 whitespace-nowrap">
              {user.name}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0D1424] border border-slate-700/80 shadow-2xl p-4 z-50">
              <p className="text-sm font-semibold text-slate-100">{user.name}</p>
              <p className="text-xs text-slate-400 mb-3">{user.email}</p>
              <p className="text-xs text-slate-400 mb-3">
                {user.role} · {health.mode === 'DEMO_MODE' ? 'Simulated Demo' : 'Hybrid Live AI'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveSection('settings');
                  setProfileOpen(false);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 transition-colors"
              >
                Open Settings & Privacy
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
