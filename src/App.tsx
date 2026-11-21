import { useState } from 'react';
import { ScamSentryProvider, useScamSentry } from './context/ScamSentryContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { InteractiveDemoModal } from './components/InteractiveDemoModal';
import { DashboardView } from './views/DashboardView';
import { LiveMonitorView } from './views/LiveMonitorView';
import { AiDecoyView } from './views/AiDecoyView';
import { ScamAnalyzerView } from './views/ScamAnalyzerView';
import { ScamIntelligenceView } from './views/ScamIntelligenceView';
import { EvidenceReportsView } from './views/EvidenceReportsView';
import { FamilyProtectionView } from './views/FamilyProtectionView';
import { SettingsView } from './views/SettingsView';

function ScamSentryShell() {
  const { activeSection } = useScamSentry();
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderView = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardView />;
      case 'live-monitor':
        return <LiveMonitorView />;
      case 'ai-decoy':
        return <AiDecoyView />;
      case 'scam-analyzer':
        return <ScamAnalyzerView />;
      case 'scam-intelligence':
        return <ScamIntelligenceView />;
      case 'evidence-reports':
        return <EvidenceReportsView />;
      case 'family-protection':
        return <FamilyProtectionView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {renderView()}
        </main>
      </div>
      <InteractiveDemoModal />
    </div>
  );
}

export default function App() {
  return (
    <ScamSentryProvider>
      <ScamSentryShell />
    </ScamSentryProvider>
  );
}
