import type {
  CallSession,
  DecoySession,
  IntelligenceReport,
  RiskLevel,
  ScamAnalysisRecord,
  ScamAnalysisResult,
  ScamCategory,
  ThreatIndicator,
  UrlInspectionResult,
} from '../types/scamsentry';

const SUSPICIOUS_TLDS = ['.xyz', '.top', '.club', '.buzz', '.click', '.tk', '.ml', '.ga', '.cf', '.gq', '.icu', '.vip'];
const URL_SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'rb.gy', 'cutt.ly'];
const BRAND_KEYWORDS = ['hdfc', 'sbi', 'icici', 'axis', 'chase', 'citibank', 'paypal', 'amazon', 'microsoft', 'apple', 'google', 'binance', 'coinbase', 'fedex', 'dhl', 'irs', 'gov'];

export function classifyRiskLevel(score: number): RiskLevel {
  if (score >= 85) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

/**
 * Redacts potential sensitive credentials (OTPs, PINs, CVVs, passwords, card numbers)
 * so the platform never stores actual user credentials.
 */
export function redactSensitiveCredentials(text: string): string {
  let sanitized = text;
  // Redact 4-8 digit numeric codes when near OTP/PIN/CVV/code context
  sanitized = sanitized.replace(
    /\b(otp|pin|cvv|passcode|verification\s*code|security\s*code)\b(\s*(?:is|:|=|-)?\s*)(\d{4,8})\b/gi,
    '$1$2[REDACTED_CODE]'
  );
  // Redact explicit password assignments
  sanitized = sanitized.replace(
    /\b(password|passphrase)\b(\s*(?:is|:|=|-)?\s*)([^\s,;]{4,32})/gi,
    '$1$2[REDACTED_PASSWORD]'
  );
  // Redact 13-19 digit payment card patterns
  sanitized = sanitized.replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_CARD]');
  return sanitized;
}

export function inspectUrlLexically(rawUrl: string): UrlInspectionResult {
  const trimmed = rawUrl.trim();
  let normalized = trimmed;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `http://${normalized}`;
  }

  let domain = trimmed;
  let isHttps = /^https:\/\//i.test(trimmed);
  let pathname = '';
  try {
    const parsed = new URL(normalized);
    domain = parsed.hostname.toLowerCase();
    isHttps = parsed.protocol === 'https:';
    pathname = parsed.pathname.toLowerCase();
  } catch {
    domain = trimmed.split('/')[0].toLowerCase();
  }

  const characteristics: string[] = [];
  let riskScore = 10;

  const hasIpHost = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(domain);
  if (hasIpHost) {
    characteristics.push('Uses raw IP address instead of registered domain name');
    riskScore += 35;
  }

  if (!isHttps && /^https?:\/\//i.test(trimmed)) {
    characteristics.push('Unencrypted HTTP scheme (no TLS/HTTPS)');
    riskScore += 18;
  }

  const isShortener = URL_SHORTENERS.some((s) => domain === s || domain.endsWith(`.${s}`));
  if (isShortener) {
    characteristics.push('Shortened URL obscures final destination domain');
    riskScore += 22;
  }

  const suspiciousTld = SUSPICIOUS_TLDS.some((tld) => domain.endsWith(tld));
  if (suspiciousTld) {
    characteristics.push('High-risk / frequently abused top-level domain');
    riskScore += 24;
  }

  let lookalikeBrand: string | null = null;
  const deobfuscated = domain.replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's');
  for (const brand of BRAND_KEYWORDS) {
    if (domain.includes(brand) || deobfuscated.includes(brand)) {
      const officialExact = domain === `${brand}.com` || domain.endsWith(`.${brand}.com`) || domain === `${brand}.co.in` || domain === `${brand}.org`;
      if (!officialExact) {
        lookalikeBrand = brand.toUpperCase();
        characteristics.push(`Domain contains "${brand}" outside verified official root domain (possible brand lookalike)`);
        riskScore += 28;
        break;
      }
    }
  }

  if (/(verify|kyc|update|secure|login|reward|claim|urgent|refund|block)/i.test(domain + pathname)) {
    characteristics.push('Contains high-urgency credential/account lure keywords in host or path');
    riskScore += 16;
  }

  if ((domain.match(/-/g) || []).length >= 2) {
    characteristics.push('Multiple hyphens in hostname (common in disposable phishing domains)');
    riskScore += 12;
  }

  const bounded = Math.min(98, riskScore);
  return {
    url: trimmed,
    domain,
    isHttps,
    hasIpHost,
    isShortener,
    suspiciousTld,
    lookalikeBrand,
    characteristics: characteristics.length > 0 ? characteristics : ['No immediate lexical anomalies detected; still verify domain ownership independently'],
    riskScore: bounded,
    note: 'Lexical analysis performed offline without visiting or resolving the URL. Do not treat heuristic flags as verified proof of malice without independent verification.',
  };
}

export function extractIndicators(text: string): {
  urls: string[];
  phoneNumbers: string[];
  paymentIdentifiers: string[];
} {
  const urlRegex = /\b(?:https?:\/\/|www\.)[^\s<>"')]+|(?:[a-z0-9-]+\.)+(?:com|net|org|in|xyz|top|club|icu|vip|click|ly|co)\b(?:\/[^\s<>"')]*)?/gi;
  const rawUrls = text.match(urlRegex) || [];
  const urls = Array.from(new Set(rawUrls.map((u) => u.replace(/[.,;!?]+$/, '')))).slice(0, 8);

  const phoneRegex = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)\d{3,5}[\s-]?\d{3,5}\b/g;
  const rawPhones = (text.match(phoneRegex) || []).filter((p) => {
    const digits = p.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 13;
  });
  const phoneNumbers = Array.from(new Set(rawPhones.map((p) => p.trim()))).slice(0, 8);

  const upiRegex = /\b[a-zA-Z0-9._-]{3,}@(?:okicici|okaxis|oksbi|okhdfcbank|ybl|paytm|ibl|axl|upi|apl)\b/gi;
  const cryptoRegex = /\b(?:0x[a-fA-F0-9]{16,40}|bc1[a-zA-Z0-9]{20,42})\b/g;
  const paymentMatches = [...(text.match(upiRegex) || []), ...(text.match(cryptoRegex) || [])];
  const paymentIdentifiers = Array.from(new Set(paymentMatches)).slice(0, 8);

  return { urls, phoneNumbers, paymentIdentifiers };
}

interface RuleMatch {
  pattern: string;
  categoryHint: ScamCategory;
  weight: number;
  regex: RegExp;
}

const SCAM_RULES: RuleMatch[] = [
  {
    pattern: 'OTP / Verification Code Harvesting',
    categoryHint: 'OTP Theft',
    weight: 42,
    regex: /\b(otp|one[- ]time password|verification code|6[- ]digit code|pin|cvv|mpin|password)\b/i,
  },
  {
    pattern: 'Urgency & Account Suspension Manipulation',
    categoryHint: 'Banking Fraud',
    weight: 28,
    regex: /\b(immediately|urgent|within \d+ (?:hours?|minutes?)|blocked today|suspended|deactivated|frozen|expire today|last warning)\b/i,
  },
  {
    pattern: 'Bank or Financial Institution Impersonation',
    categoryHint: 'Banking Fraud',
    weight: 26,
    regex: /\b(calling from your bank|bank manager|kyc update|rbi|hdfc|sbi|icici|fraud department|account verification|debit card blocked)\b/i,
  },
  {
    pattern: 'Advance Fee / Lottery / Prize Claim',
    categoryHint: 'Lottery Scams',
    weight: 34,
    regex: /\b(won|winner|lottery|prize|processing charges?|registration fee|claim your reward|lucky draw|congratulations)\b/i,
  },
  {
    pattern: 'Fake Job / Recruitment Advance Payment',
    categoryHint: 'Job Scams',
    weight: 32,
    regex: /\b(job offer|work from home|part[- ]time task|hiring|hr manager|security deposit|training fee|daily payout|prepaid task)\b/i,
  },
  {
    pattern: 'Guaranteed High-Return Investment Lure',
    categoryHint: 'Investment Fraud',
    weight: 32,
    regex: /\b(guaranteed return|double your money|crypto signal|vip trading|risk[- ]free profit|insider tip|100% profit|wire to wallet)\b/i,
  },
  {
    pattern: 'Fake Authority / Law Enforcement Threat',
    categoryHint: 'Impersonation',
    weight: 34,
    regex: /\b(arrest warrant|customs|parcel seized|cyber crime|police|tax authority|irs|digital arrest|legal action)\b/i,
  },
  {
    pattern: 'Remote Screen-Sharing / Support Takeover',
    categoryHint: 'Fake Customer Support',
    weight: 34,
    regex: /\b(anydesk|teamviewer|quicksupport|remote access|screen share|tech support|refund department)\b/i,
  },
  {
    pattern: 'Unusual Payment Rail (Gift Cards / UPI Collect / Crypto)',
    categoryHint: 'Payment Fraud',
    weight: 30,
    regex: /\b(gift card|google play card|upi pin|approve collect request|scan qr to receive|crypto transfer|pay ₹\d+|pay \$\d+)\b/i,
  },
  {
    pattern: 'Phishing / Unverified Verification Link',
    categoryHint: 'Phishing',
    weight: 24,
    regex: /\b(click (?:the )?link|verify here|update kyc link|login immediately|http:\/\/|bit\.ly)\b/i,
  },
  {
    pattern: 'Identity / Government ID Harvesting',
    categoryHint: 'Identity Theft',
    weight: 28,
    regex: /\b(aadhaar|pan card|ssn|social security|passport photo|share your id)\b/i,
  },
  {
    pattern: 'Emotional / Romance Financial Solicitation',
    categoryHint: 'Romance Scams',
    weight: 26,
    regex: /\b(stranded|hospital emergency|customs fee for gift|my love.*send money|wire me funds)\b/i,
  },
];

export function analyzeTextDeterministic(
  rawText: string,
  fallbackReason?: string
): ScamAnalysisResult {
  const sanitized = redactSensitiveCredentials(rawText.trim());
  const indicators = extractIndicators(sanitized);
  const urlInspections = indicators.urls.map(inspectUrlLexically);

  if (!sanitized) {
    return {
      risk_score: 0,
      risk_level: 'Low',
      confidence: 0.35,
      scam_category: 'Benign / Unclear',
      detected_patterns: [],
      suspicious_phrases: [],
      explanation: 'No content was provided for analysis.',
      recommended_actions: ['Provide a message, call transcript, or URL to evaluate potential scam signals.'],
      requires_user_attention: false,
      safer_next_steps: ['Keep conversations verified through official channels.'],
      extracted_indicators: indicators,
      url_inspections: [],
      engine: 'deterministic-fallback',
      fallbackReason,
    };
  }

  let totalScore = 8;
  const detectedPatterns: string[] = [];
  const suspiciousPhrases: string[] = [];
  const categoryScores = new Map<ScamCategory, number>();

  for (const rule of SCAM_RULES) {
    const match = sanitized.match(rule.regex);
    if (match) {
      totalScore += rule.weight;
      detectedPatterns.push(rule.pattern);
      if (match[0]) {
        suspiciousPhrases.push(match[0]);
      }
      categoryScores.set(rule.categoryHint, (categoryScores.get(rule.categoryHint) || 0) + rule.weight);
    }
  }

  // Factor URL lexical risk
  const maxUrlRisk = urlInspections.reduce((acc, u) => Math.max(acc, u.riskScore), 0);
  if (urlInspections.length > 0 && maxUrlRisk >= 35) {
    totalScore += Math.round(maxUrlRisk * 0.45);
    detectedPatterns.push('Suspicious URL Characteristics');
    categoryScores.set('Phishing', (categoryScores.get('Phishing') || 0) + 25);
  }

  if (indicators.paymentIdentifiers.length > 0) {
    totalScore += 18;
    detectedPatterns.push('Unverified Payment Identifier Solicited');
  }

  // Extract sentence fragments containing suspicious triggers
  const sentences = sanitized.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim().length > 0);
  for (const s of sentences) {
    if (SCAM_RULES.some((r) => r.regex.test(s)) && suspiciousPhrases.length < 6) {
      const cleaned = s.trim();
      if (!suspiciousPhrases.includes(cleaned)) {
        suspiciousPhrases.push(cleaned);
      }
    }
  }

  const riskScore = Math.min(99, Math.max(4, totalScore));
  const riskLevel = classifyRiskLevel(riskScore);

  let topCategory: ScamCategory = 'Benign / Unclear';
  let topWeight = 0;
  for (const [cat, weight] of categoryScores.entries()) {
    if (weight > topWeight) {
      topWeight = weight;
      topCategory = cat;
    }
  }
  if (topCategory === 'Benign / Unclear' && detectedPatterns.length > 0) {
    topCategory = 'Social Engineering';
  }

  // Distinguish confidence from risk score: confidence reflects signal density & clarity
  const signalCount = detectedPatterns.length + (urlInspections.some((u) => u.riskScore >= 40) ? 1 : 0);
  const confidence = Number(Math.min(0.95, Math.max(0.42, 0.42 + signalCount * 0.11)).toFixed(2));

  const requiresAttention = riskScore >= 60;

  const explanation =
    detectedPatterns.length > 0
      ? `Preliminary pattern analysis identified ${detectedPatterns.length} indicator(s) consistent with a suspected ${topCategory.toLowerCase()} attempt (${detectedPatterns.join(', ')}). Because automated analysis cannot verify caller identity on its own, treat this as a suspected scam risk and verify independently via official channels.`
      : 'No strong fraud or social-engineering patterns were detected in the provided text. Remain cautious with unsolicited links or requests for payment or verification codes.';

  const recommendedActions: string[] = [];
  if (riskScore >= 60) {
    recommendedActions.push('Never share your OTP, PIN, password, CVV, or banking credentials.');
    recommendedActions.push('End the conversation or route the caller to AI Decoy while you stay protected.');
    recommendedActions.push('Contact your bank or service provider directly using the official number on your card or statement.');
  } else if (riskScore >= 30) {
    recommendedActions.push('Verify the sender identity through an independent official channel before responding.');
    recommendedActions.push('Do not click unverified links or pay upfront processing fees.');
  } else {
    recommendedActions.push('Continue normal caution and avoid sharing sensitive personal details with unverified contacts.');
  }

  const saferNextSteps = [
    'Hang up or stop replying if pressured with urgent deadlines.',
    'Do not install remote desktop apps (AnyDesk, TeamViewer) for callers.',
    'Save the preliminary report or alert a trusted family contact if you feel unsure.',
  ];

  return {
    risk_score: riskScore,
    risk_level: riskLevel,
    confidence,
    scam_category: topCategory,
    detected_patterns: detectedPatterns,
    suspicious_phrases: suspiciousPhrases.slice(0, 6),
    explanation,
    recommended_actions: recommendedActions,
    requires_user_attention: requiresAttention,
    safer_next_steps: saferNextSteps,
    extracted_indicators: indicators,
    url_inspections: urlInspections,
    engine: 'deterministic-fallback',
    fallbackReason,
  };
}

export function generateDeterministicDecoyReply(
  callerMessage: string,
  turnIndex: number,
  categoryHint: ScamCategory = 'Banking Fraud'
): {
  reply: string;
  detectedTactic: string;
  shouldHandoffToHuman: boolean;
} {
  const lower = callerMessage.toLowerCase();

  if (/\b(otp|code|pin|password|cvv)\b/i.test(lower)) {
    const replies = [
      'Oh, I understand there is an alert. Before I look up anything, could you tell me which branch you are calling from and provide an official reference number?',
      'I see—my phone screen is a bit slow right now. Could you read out your employee ID and the official callback landline on the back of my card?',
      'I prefer not to read codes over an incoming call. If you share your department case number, I can walk into my local branch to confirm.',
    ];
    return {
      reply: replies[turnIndex % replies.length],
      detectedTactic: 'Credential / OTP Solicitation',
      shouldHandoffToHuman: false,
    };
  }

  if (/\b(fee|deposit|pay|transfer|upi|gift card|₹|\$)\b/i.test(lower)) {
    const replies = [
      'Could you send an official invoice or breakdown on your organization’s verified domain before any payment is considered?',
      'Why would a verification or prize process require an upfront payment? Could you share your registered corporate CIN or official helpline?',
      'I am unable to process transfers right now. Please provide the supervisor’s official email domain so this can be documented.',
    ];
    return {
      reply: replies[turnIndex % replies.length],
      detectedTactic: 'Advance Fee / Payment Pressure',
      shouldHandoffToHuman: false,
    };
  }

  if (/\b(link|click|http|anydesk|teamviewer|install|download)\b/i.test(lower)) {
    const replies = [
      'I am not able to open external links or install remote tools on this device. Can you explain the official portal path instead?',
      'My security policy blocks unverified links. What is the exact registered domain and support ticket ID?',
    ];
    return {
      reply: replies[turnIndex % replies.length],
      detectedTactic: 'Malicious Link / Remote Access Lure',
      shouldHandoffToHuman: false,
    };
  }

  if (/\b(urgent|blocked|arrest|warrant|minutes|immediately|suspend)\b/i.test(lower)) {
    return {
      reply: 'That sounds concerning, though I want to verify it properly. What is your full name, department, and an official written notice number?',
      detectedTactic: 'Artificial Urgency & Intimidation',
      shouldHandoffToHuman: false,
    };
  }

  if (categoryHint === 'Job Scams') {
    return {
      reply: 'Thank you for the details. Could you share the official company careers page URL and the recruiter’s verified corporate email address?',
      detectedTactic: 'Unverified Recruitment Pitch',
      shouldHandoffToHuman: false,
    };
  }

  return {
    reply: 'Could you clarify your official organization name, branch location, and a verifiable reference number for this request?',
    detectedTactic: 'Social Engineering Probe',
    shouldHandoffToHuman: false,
  };
}

export interface DashboardAggregates {
  totalCallsAnalyzed: number;
  suspiciousCallsDetected: number;
  highRiskScams: number;
  aiDecoySessions: number;
  threatsReported: number;
  categoryDistribution: Array<{ name: string; count: number }>;
  riskDistribution: Array<{ level: RiskLevel; count: number; fill: string }>;
  trendSeries: Array<{ day: string; analyzed: number; suspicious: number; decoyed: number }>;
  regionalThreats: Array<{ region: string; incidents: number; share: number; topCategory: string }>;
}

export function computeDashboardMetrics(
  calls: CallSession[],
  analyses: ScamAnalysisRecord[],
  decoys: DecoySession[],
  indicators: ThreatIndicator[],
  reports: IntelligenceReport[]
): DashboardAggregates {
  const totalCallsAnalyzed = calls.length + analyses.length + 142; // Base simulated historical volume + live session items
  const liveSuspicious =
    calls.filter((c) => c.latestAnalysis.risk_score >= 45).length +
    analyses.filter((a) => a.result.risk_score >= 45).length;
  const suspiciousCallsDetected = liveSuspicious + 49;

  const liveHighRisk =
    calls.filter((c) => c.latestAnalysis.risk_level === 'High' || c.latestAnalysis.risk_level === 'Critical').length +
    analyses.filter((a) => a.result.risk_level === 'High' || a.result.risk_level === 'Critical').length;
  const highRiskScams = liveHighRisk + 27;

  const aiDecoySessions = decoys.length + 18;
  const threatsReported = indicators.reduce((sum, i) => sum + i.reportCount, 0) + reports.length;

  const categoryMap = new Map<string, number>([
    ['Banking Fraud', 34],
    ['OTP Theft', 29],
    ['Phishing', 22],
    ['Job Scams', 16],
    ['Investment Fraud', 14],
    ['Impersonation', 11],
  ]);

  for (const c of calls) {
    const cat = c.latestAnalysis.scam_category;
    if (cat !== 'Benign / Unclear') {
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }
  }
  for (const a of analyses) {
    const cat = a.result.scam_category;
    if (cat !== 'Benign / Unclear') {
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    }
  }

  const categoryDistribution = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const riskCounts: Record<RiskLevel, number> = {
    Low: 38,
    Medium: 31,
    High: 19,
    Critical: 12,
  };
  for (const c of calls) {
    riskCounts[c.latestAnalysis.risk_level] += 1;
  }
  for (const a of analyses) {
    riskCounts[a.result.risk_level] += 1;
  }

  const riskDistribution: Array<{ level: RiskLevel; count: number; fill: string }> = [
    { level: 'Critical', count: riskCounts.Critical, fill: '#EF4444' },
    { level: 'High', count: riskCounts.High, fill: '#F97316' },
    { level: 'Medium', count: riskCounts.Medium, fill: '#F59E0B' },
    { level: 'Low', count: riskCounts.Low, fill: '#10B981' },
  ];

  const trendSeries = [
    { day: 'Mon', analyzed: 21, suspicious: 7, decoyed: 2 },
    { day: 'Tue', analyzed: 26, suspicious: 9, decoyed: 3 },
    { day: 'Wed', analyzed: 24, suspicious: 8, decoyed: 3 },
    { day: 'Thu', analyzed: 31, suspicious: 12, decoyed: 4 },
    { day: 'Fri', analyzed: 29, suspicious: 11, decoyed: 4 },
    { day: 'Sat', analyzed: 18 + calls.length, suspicious: 5 + liveSuspicious, decoyed: 2 + Math.min(3, decoys.length) },
    { day: 'Today', analyzed: 15 + analyses.length + calls.length, suspicious: 4 + liveSuspicious, decoyed: decoys.length },
  ];

  const regionalThreats = [
    { region: 'South Asia Metro Hubs (Simulated)', incidents: 48 + liveHighRisk, share: 38, topCategory: 'Banking KYC & OTP' },
    { region: 'North America Toll-Free Relays (Simulated)', incidents: 31, share: 25, topCategory: 'Fake Tech Support' },
    { region: 'Southeast Asia Messaging Clusters (Simulated)', incidents: 27, share: 21, topCategory: 'Job & Task Scams' },
    { region: 'Europe Cross-Border VoIP (Simulated)', incidents: 20, share: 16, topCategory: 'Investment Fraud' },
  ];

  return {
    totalCallsAnalyzed,
    suspiciousCallsDetected,
    highRiskScams,
    aiDecoySessions,
    threatsReported,
    categoryDistribution,
    riskDistribution,
    trendSeries,
    regionalThreats,
  };
}
