import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  analyzeTextDeterministic,
  extractIndicators,
  generateDeterministicDecoyReply,
  inspectUrlLexically,
  redactSensitiveCredentials,
} from './src/utils/scamEngine';
import type { ScamCategory } from './src/types/scamsentry';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms = 4500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const VALID_CATEGORIES: ScamCategory[] = [
  'Banking Fraud',
  'OTP Theft',
  'Phishing',
  'Fake Customer Support',
  'Investment Fraud',
  'Job Scams',
  'Lottery Scams',
  'Identity Theft',
  'Impersonation',
  'Romance Scams',
  'Social Engineering',
  'Payment Fraud',
  'Benign / Unclear',
];

function normalizeCategory(cat: string): ScamCategory {
  const found = VALID_CATEGORIES.find((c) => c.toLowerCase() === cat.toLowerCase());
  return found ?? 'Social Engineering';
}

function normalizeRiskLevel(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (score >= 85) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const geminiConfigured = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
        process.env.GEMINI_API_KEY.trim() !== ''
    );
    const agoraConfigured = Boolean(process.env.AGORA_APP_ID && process.env.AGORA_APP_ID.trim() !== '');
    const murfConfigured = Boolean(process.env.MURF_API_KEY && process.env.MURF_API_KEY.trim() !== '');
    const firebaseConfigured = Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID.trim() !== '');

    res.json({
      serverOnline: true,
      geminiConfigured,
      agoraConfigured,
      murfConfigured,
      firebaseConfigured,
      mode: geminiConfigured ? 'HYBRID_LIVE_AI' : 'DEMO_MODE',
    });
  });

  app.post('/api/analyze', async (req, res) => {
    const rawText = typeof req.body?.text === 'string' ? req.body.text : '';
    const inputType = typeof req.body?.inputType === 'string' ? req.body.inputType : 'transcript';

    if (!rawText.trim()) {
      return res.status(400).json({ error: 'Input text is required for analysis.' });
    }

    const sanitizedText = redactSensitiveCredentials(rawText.trim());
    const extracted = extractIndicators(sanitizedText);
    const urlInspections = extracted.urls.map(inspectUrlLexically);

    const ai = getGeminiClient();
    if (!ai) {
      const fallback = analyzeTextDeterministic(
        sanitizedText,
        'GEMINI_API_KEY is not configured; using local deterministic pattern engine.'
      );
      return res.json(fallback);
    }

    try {
      const response = await withTimeout(ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze the following ${inputType} input for potential scam, phishing, or social-engineering signals.\n\nInput:\n"""\n${sanitizedText}\n"""`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are ScamSentry AI, a defensive cybersecurity & fraud analyst. Evaluate conversation transcripts, messages, and URL text for urgency manipulation, requests for sensitive info (OTPs/PINs/passwords), financial threats, suspicious payment instructions, fake authority claims, suspicious URLs, verification manipulation, psychological pressure, and unusual payment requests. Rules: (1) Never label a person a criminal; use "suspected scam" phrasing and note uncertainty. (2) Distinguish risk_score (0-100 severity) from confidence (0.0-1.0 certainty). (3) Cite specific evidence phrases from the input. (4) Never output or repeat raw passwords/OTPs/PINs. (5) Never claim an unverified URL is definitively malicious without visiting—flag lexical characteristics only.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              risk_score: { type: Type.INTEGER, description: 'Risk severity from 0 to 100.' },
              risk_level: { type: Type.STRING, description: 'One of Low, Medium, High, Critical.' },
              confidence: { type: Type.NUMBER, description: 'Detection confidence between 0 and 1.' },
              scam_category: {
                type: Type.STRING,
                description:
                  'One of: Banking Fraud, OTP Theft, Phishing, Fake Customer Support, Investment Fraud, Job Scams, Lottery Scams, Identity Theft, Impersonation, Romance Scams, Social Engineering, Payment Fraud, Benign / Unclear.',
              },
              detected_patterns: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suspicious_phrases: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              explanation: { type: Type.STRING },
              recommended_actions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              safer_next_steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              requires_user_attention: { type: Type.BOOLEAN },
            },
            required: [
              'risk_score',
              'risk_level',
              'confidence',
              'scam_category',
              'detected_patterns',
              'suspicious_phrases',
              'explanation',
              'recommended_actions',
              'safer_next_steps',
              'requires_user_attention',
            ],
          },
        },
      }));

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const score = Math.min(100, Math.max(0, Number(parsed.risk_score) || 0));
      const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5));

      return res.json({
        risk_score: score,
        risk_level: normalizeRiskLevel(score),
        confidence: Number(confidence.toFixed(2)),
        scam_category: normalizeCategory(String(parsed.scam_category || 'Social Engineering')),
        detected_patterns: Array.isArray(parsed.detected_patterns) ? parsed.detected_patterns.slice(0, 8) : [],
        suspicious_phrases: Array.isArray(parsed.suspicious_phrases) ? parsed.suspicious_phrases.slice(0, 8) : [],
        explanation: String(parsed.explanation || 'Preliminary AI analysis completed.'),
        recommended_actions: Array.isArray(parsed.recommended_actions)
          ? parsed.recommended_actions.slice(0, 5)
          : ['Never share OTPs, PINs, or passwords.'],
        safer_next_steps: Array.isArray(parsed.safer_next_steps)
          ? parsed.safer_next_steps.slice(0, 5)
          : ['Verify independently through official channels.'],
        requires_user_attention: Boolean(parsed.requires_user_attention ?? score >= 60),
        extracted_indicators: extracted,
        url_inspections: urlInspections,
        engine: 'gemini-live',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini API call failed';
      const fallback = analyzeTextDeterministic(
        sanitizedText,
        `Live Gemini analysis unavailable (${message}); switched transparently to deterministic fallback.`
      );
      return res.json(fallback);
    }
  });

  app.post('/api/decoy/reply', async (req, res) => {
    const callerMessage = typeof req.body?.callerMessage === 'string' ? req.body.callerMessage.trim() : '';
    const turnIndex = Number(req.body?.turnIndex) || 0;
    const categoryHint = normalizeCategory(String(req.body?.categoryHint || 'Banking Fraud'));
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];

    if (!callerMessage) {
      return res.status(400).json({ error: 'callerMessage is required.' });
    }

    const sanitizedCaller = redactSensitiveCredentials(callerMessage);
    const ai = getGeminiClient();

    if (!ai) {
      const det = generateDeterministicDecoyReply(sanitizedCaller, turnIndex, categoryHint);
      return res.json({
        ...det,
        engine: 'deterministic-fallback',
        fallbackReason: 'GEMINI_API_KEY not configured; using deterministic decoy adapter.',
      });
    }

    try {
      const historyContext = history
        .map((m: { speaker?: string; text?: string }) => `${m.speaker || 'unknown'}: ${m.text || ''}`)
        .join('\n');

      const response = await withTimeout(ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Recent context:\n${historyContext}\n\nLatest suspected scammer message:\n"${sanitizedCaller}"\n\nGenerate the next safe AI Decoy reply.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are ScamSentry AI Decoy engaging a suspected scammer in a controlled defensive simulation. Rules: (1) Stay polite, calm, natural, and inquisitive to stall and gather verifiable claims (branch name, reference number, official callback line, domain). (2) NEVER reveal real user info, OTPs, PINs, passwords, or banking credentials. (3) NEVER perform transactions or agree to open links/install remote tools. (4) NEVER threaten, harass, or provoke. (5) Keep reply concise (1-2 sentences).',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              detectedTactic: { type: Type.STRING },
              shouldHandoffToHuman: { type: Type.BOOLEAN },
            },
            required: ['reply', 'detectedTactic', 'shouldHandoffToHuman'],
          },
        },
      }));

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        reply: String(parsed.reply || 'Could you share your official branch and case reference number?'),
        detectedTactic: String(parsed.detectedTactic || 'Social Engineering Probe'),
        shouldHandoffToHuman: Boolean(parsed.shouldHandoffToHuman),
        engine: 'gemini-live',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini API error';
      const det = generateDeterministicDecoyReply(sanitizedCaller, turnIndex, categoryHint);
      return res.json({
        ...det,
        engine: 'deterministic-fallback',
        fallbackReason: `Live Gemini decoy unavailable (${message}); using deterministic decoy adapter.`,
      });
    }
  });

  app.post('/api/report/summarize', async (req, res) => {
    const transcriptText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!transcriptText) {
      return res.status(400).json({ error: 'Transcript or text is required to summarize report.' });
    }
    const sanitized = redactSensitiveCredentials(transcriptText);
    const analysis = analyzeTextDeterministic(sanitized);

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        summary: analysis.explanation,
        engine: 'deterministic-fallback',
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Write a concise 2-sentence objective preliminary evidence summary for this suspected scam interaction. Do not assert criminal guilt.\n\n${sanitized}`,
      });
      return res.json({
        summary: (response.text ?? analysis.explanation).trim(),
        engine: 'gemini-live',
      });
    } catch {
      return res.json({
        summary: analysis.explanation,
        engine: 'deterministic-fallback',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ScamSentry AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
