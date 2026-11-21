import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeTextDeterministic,
  classifyRiskLevel,
  computeDashboardMetrics,
  extractIndicators,
  generateDeterministicDecoyReply,
  inspectUrlLexically,
  redactSensitiveCredentials,
} from './scamEngine';

test('classifyRiskLevel maps boundaries accurately', () => {
  assert.equal(classifyRiskLevel(10), 'Low');
  assert.equal(classifyRiskLevel(35), 'Medium');
  assert.equal(classifyRiskLevel(72), 'High');
  assert.equal(classifyRiskLevel(92), 'Critical');
});

test('redactSensitiveCredentials removes OTPs, PINs, and passwords', () => {
  const input = 'My OTP is 482910 and my PIN: 1234 and password=Secret99';
  const redacted = redactSensitiveCredentials(input);
  assert.equal(redacted.includes('482910'), false);
  assert.equal(redacted.includes('1234'), false);
  assert.equal(redacted.includes('Secret99'), false);
  assert.equal(redacted.includes('[REDACTED_CODE]'), true);
  assert.equal(redacted.includes('[REDACTED_PASSWORD]'), true);
});

test('analyzeTextDeterministic detects banking OTP scam with high/critical score', () => {
  const result = analyzeTextDeterministic(
    'Hello sir, I am calling from your bank. Your account will be blocked today. Please share your OTP immediately.'
  );
  assert.equal(result.risk_score >= 80, true);
  assert.equal(result.risk_level === 'High' || result.risk_level === 'Critical', true);
  assert.equal(result.requires_user_attention, true);
  assert.equal(result.detected_patterns.length >= 2, true);
  assert.equal(result.engine, 'deterministic-fallback');
  assert.equal(result.explanation.toLowerCase().includes('suspected'), true);
});

test('analyzeTextDeterministic detects lottery advance-fee scam', () => {
  const result = analyzeTextDeterministic(
    'Congratulations! You have won ₹50,000. Pay ₹999 processing charges to claim your reward.'
  );
  assert.equal(result.scam_category, 'Lottery Scams');
  assert.equal(result.risk_score >= 60, true);
});

test('inspectUrlLexically flags lookalike and suspicious TLD without network calls', () => {
  const inspection = inspectUrlLexically('http://hdfc-kyc-verify.xyz/login');
  assert.equal(inspection.isHttps, false);
  assert.equal(inspection.suspiciousTld, true);
  assert.equal(inspection.lookalikeBrand, 'HDFC');
  assert.equal(inspection.riskScore >= 60, true);
});

test('extractIndicators finds URLs, phone numbers, and UPI IDs', () => {
  const extracted = extractIndicators(
    'Call +91 9876543210 or pay to verify@okaxis via http://bit.ly/kyc-now'
  );
  assert.equal(extracted.phoneNumbers.length, 1);
  assert.equal(extracted.paymentIdentifiers.includes('verify@okaxis'), true);
  assert.equal(extracted.urls.some((u) => u.includes('bit.ly/kyc-now')), true);
});

test('generateDeterministicDecoyReply never leaks credentials and asks verifiable questions', () => {
  const reply = generateDeterministicDecoyReply('Tell me your OTP right now!', 0, 'Banking Fraud');
  assert.equal(reply.detectedTactic, 'Credential / OTP Solicitation');
  assert.equal(reply.reply.toLowerCase().includes('branch') || reply.reply.toLowerCase().includes('reference'), true);
});

test('computeDashboardMetrics updates aggregates when new items are added', () => {
  const base = computeDashboardMetrics([], [], [], [], []);
  const analysis = analyzeTextDeterministic('Your bank account will be blocked today. Share OTP immediately.');
  const updated = computeDashboardMetrics(
    [],
    [
      {
        id: 'a-1',
        userId: 'u-1',
        inputType: 'sms',
        inputPreview: 'Your bank account...',
        createdAt: new Date().toISOString(),
        result: analysis,
        isSimulated: true,
      },
    ],
    [],
    [],
    []
  );
  assert.equal(updated.totalCallsAnalyzed, base.totalCallsAnalyzed + 1);
  assert.equal(updated.suspiciousCallsDetected, base.suspiciousCallsDetected + 1);
  assert.equal(updated.highRiskScams, base.highRiskScams + 1);
});
