import { jsPDF } from 'jspdf';
import type { IntelligenceReport } from '../types/scamsentry';

export function downloadReportAsJson(report: IntelligenceReport): void {
  const payload = JSON.stringify(report, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatReportSummaryText(report: IntelligenceReport): string {
  return [
    `ScamSentry AI — Evidence Report ${report.id}`,
    `Generated: ${new Date(report.createdAt).toLocaleString()}`,
    `Category: ${report.scamCategory}`,
    `Risk Score: ${report.riskScore}/100 (${report.riskLevel}) | Confidence: ${Math.round(report.confidence * 100)}%`,
    ``,
    `Preliminary Notice: ${report.preliminaryNotice}`,
    ``,
    `Summary:`,
    report.conversationSummary,
    ``,
    `Detected Techniques: ${report.scamTechniques.join(', ') || 'None'}`,
    `Suspicious Phrases: ${report.suspiciousPhrases.join(' | ') || 'None'}`,
    `Extracted URLs: ${report.extractedIndicators.urls.join(', ') || 'None'}`,
    `Extracted Phones: ${report.extractedIndicators.phoneNumbers.join(', ') || 'None'}`,
    `Extracted Payment IDs: ${report.extractedIndicators.paymentIdentifiers.join(', ') || 'None'}`,
    ``,
    `Recommended Actions:`,
    ...report.recommendedActions.map((act, i) => `${i + 1}. ${act}`),
  ].join('\n');
}

export function downloadReportAsPdf(report: IntelligenceReport): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 44;
  const maxWidth = 507;
  let y = 48;

  const addLine = (text: string, size = 10, bold = false, color: [number, number, number] = [30, 41, 59]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      if (y > 775) {
        doc.addPage();
        y = 48;
      }
      doc.text(line, margin, y);
      y += size * 1.45;
    }
  };

  addLine('ScamSentry AI — Preliminary Evidence Report', 16, true, [15, 23, 42]);
  y += 4;
  addLine(`Report ID: ${report.id}   |   Generated: ${new Date(report.createdAt).toLocaleString()}`, 9, false, [71, 85, 105]);
  addLine(
    `Category: ${report.scamCategory}   |   Risk Score: ${report.riskScore}/100 (${report.riskLevel})   |   Confidence: ${Math.round(report.confidence * 100)}%`,
    10,
    true,
    [15, 23, 42]
  );
  y += 8;
  addLine(`Notice: ${report.preliminaryNotice}`, 9, false, [180, 83, 9]);
  y += 10;

  addLine('Conversation & Incident Summary', 12, true, [15, 23, 42]);
  addLine(report.conversationSummary, 10);
  y += 8;

  addLine('AI Analysis Explanation', 12, true, [15, 23, 42]);
  addLine(report.aiExplanation, 10);
  y += 8;

  addLine('Detected Scam Techniques', 12, true, [15, 23, 42]);
  addLine(report.scamTechniques.length ? report.scamTechniques.join(', ') : 'None recorded', 10);
  y += 8;

  addLine('Suspicious Phrases', 12, true, [15, 23, 42]);
  if (report.suspiciousPhrases.length) {
    report.suspiciousPhrases.forEach((p) => addLine(`• "${p}"`, 10));
  } else {
    addLine('None recorded', 10);
  }
  y += 8;

  addLine('Extracted Indicators', 12, true, [15, 23, 42]);
  addLine(`URLs (unverified): ${report.extractedIndicators.urls.join(', ') || 'None'}`, 10);
  addLine(`Phone Numbers: ${report.extractedIndicators.phoneNumbers.join(', ') || 'None'}`, 10);
  addLine(`Payment Identifiers: ${report.extractedIndicators.paymentIdentifiers.join(', ') || 'None'}`, 10);
  y += 8;

  addLine('Recommended User Actions', 12, true, [15, 23, 42]);
  report.recommendedActions.forEach((a, i) => addLine(`${i + 1}. ${a}`, 10));

  doc.save(`${report.id}.pdf`);
}
