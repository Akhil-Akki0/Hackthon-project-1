import {
  Activity,
  Bot,
  FileText,
  LayoutDashboard,
  Network,
  PhoneCall,
  SearchCheck,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';
import type { NavSection } from '../types/scamsentry';
import { useScamSentry } from '../context/ScamSentryContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Overview Dashboard', icon: LayoutDashboard },
  { id: 'live-monitor', label: 'Live Call Monitor', icon: PhoneCall },
  { id: 'ai-decoy', label: 'AI Decoy', icon: Bot },
  { id: 'scam-analyzer', label: 'Scam Analyzer', icon: SearchCheck },
  { id: 'scam-intelligence', label: 'Scam Intelligence', icon: Network },
  { id: 'evidence-reports', label: 'Evidence Reports', icon: FileText },
  { id: 'family-protection', label: 'Family Protection', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { activeSection, setActiveSection, decoySessions, callSessions, setDemoModalOpen } = useScamSentry();

  const activeCallCount = callSessions.filter((c) => c.status !== 'ended').length;
  const activeDecoyCount = decoySessions.filter((d) => d.status === 'active').length;

  const handleSelect = (id: NavSection) => {
    setActiveSection(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#090F1D] border-r border-slate-800/80">
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800/80 shrink-0">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded"
        >
          <span className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-300 shrink-0">
            <Shield className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="font-display font-semibold text-base tracking-tight text-slate-100 whitespace-nowrap">
            ScamSentry AI
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Sidebar Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const count =
            item.id === 'live-monitor' && activeCallCount > 0
              ? activeCallCount
              : item.id === 'ai-decoy' && activeDecoyCount > 0
                ? activeDecoyCount
                : null;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                isActive
                  ? 'bg-cyan-500/12 text-cyan-200 border border-cyan-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>
              {count !== null && (
                <span className="font-mono tabular-nums text-xs text-cyan-300">{count}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/80 space-y-3 shrink-0">
        <div className="rounded-lg bg-[#0E1629] border border-slate-800 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-200 mb-1">
            <Activity className="w-3.5 h-3.5 text-cyan-300 shrink-0" aria-hidden="true" />
            <span>Hackathon Demo Flow</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-2.5">
            Run a full 10-step scam detection, AI Decoy, report, and family alert walkthrough.
          </p>
          <button
            type="button"
            onClick={() => {
              setDemoModalOpen(true);
              onCloseMobile();
            }}
            className="w-full px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
          >
            Launch Interactive Demo
          </button>
        </div>
        <p className="text-[11px] text-slate-500 leading-snug">
          Turning Every Scam Attempt Into an Opportunity to Protect Someone.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">{navContent}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full">{navContent}</aside>
        </div>
      )}
    </>
  );
}
