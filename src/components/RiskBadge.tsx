import { AlertOctagon, AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import type { RiskLevel } from '../types/scamsentry';

interface RiskLabelProps {
  level: RiskLevel;
  score?: number;
  showScore?: boolean;
}

const RISK_STYLES: Record<RiskLevel, { text: string; border: string; bg: string }> = {
  Critical: {
    text: 'text-red-300',
    border: 'border-red-500/35',
    bg: 'bg-red-950/50',
  },
  High: {
    text: 'text-orange-300',
    border: 'border-orange-500/35',
    bg: 'bg-orange-950/45',
  },
  Medium: {
    text: 'text-amber-300',
    border: 'border-amber-500/35',
    bg: 'bg-amber-950/45',
  },
  Low: {
    text: 'text-emerald-300',
    border: 'border-emerald-500/35',
    bg: 'bg-emerald-950/45',
  },
};

export function RiskLabel({ level, score, showScore = false }: RiskLabelProps) {
  const style = RISK_STYLES[level];
  const Icon =
    level === 'Critical'
      ? AlertOctagon
      : level === 'High'
        ? AlertTriangle
        : level === 'Medium'
          ? Info
          : ShieldCheck;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${style.bg} ${style.border} ${style.text}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{level} Risk</span>
      {showScore && typeof score === 'number' && (
        <span className="font-mono tabular-nums opacity-90">· {score}/100</span>
      )}
    </span>
  );
}
