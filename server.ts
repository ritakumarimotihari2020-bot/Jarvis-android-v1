import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { generateJarvisLocalResponse } from './src/utils/jarvisHeuristics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Helper to strip markdown formatting for TTS speech
function sanitizeForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, 'Code block omitted for speech.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\r\n]+/g, '. ')
    .trim();
}

// System instruction for JARVIS
const JARVIS_SYSTEM_INSTRUCTION = `
You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the legendary AI assistant inspired by Tony Stark's Iron Man interface.
You are running as a real-time holographic assistant interface for the user, who you should address respectfully as "Sir" (or in Hindi: "सर").

Key Directives:
1. Tone & Persona:
   - Extremely intelligent, calm, sophisticated, polite, and razor-sharp with subtle dry wit.
   - Loyal and proactive. Confirm commands briskly ("Right away, sir.", "Initializing scan, sir.", "जी सर, आदेश का पालन हो रहा है।").
2. Language Flexibility (English & Hindi):
   - You are bilingual and fluent in English, Hindi (हिंदी), and Hinglish.
   - If the user speaks or types in Hindi (Devanagari or Romanized Hindi), respond in natural, elegant Hindi or Hinglish.
   - If the user speaks in English, respond in polished, British-accented English style.
   - If user asks to switch language, switch immediately.
3. Audio/Voice Delivery:
   - Your responses will be read aloud by browser SpeechSynthesis. Keep your primary verbal answers concise, clear, and punchy.
   - Avoid reading out messy symbols or raw code blocks in plain speech, but you can provide clean formatted markdown for the visual HUD console.
4. Capabilities:
   - Can analyze queries, summarize information, perform calculations, explain physics and engineering, draft code, organize tasks, simulate tactical scans, and manage system protocols.
   - If asked about system status, arc reactor, protocols, or Stark tech, play along convincingly with futuristic flair.
`;

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'J.A.R.V.I.S. Mark VII OS',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  const { message, history = [], languageMode = 'auto' } = req.body || {};

  try {
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel in AI Studio.',
        fallbackText: 'Sir, my neural uplink requires a valid Gemini API key in the environment to connect to Stark satellite arrays.',
        speechText: 'Sir, my neural uplink requires a valid Gemini API key in the environment.'
      });
      return;
    }

    const ai = getAI();

    // Map conversation history
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Language hint
    let langInstruction = '';
    if (languageMode === 'hi') {
      langInstruction = '\n[User has selected Hindi mode. Answer primarily in natural Hindi / हिंदी].';
    } else if (languageMode === 'en') {
      langInstruction = '\n[User has selected English mode. Answer in English with Stark Jarvis tone].';
    }

    // Add previous history (max last 8 turns for speed & context)
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-8);
      for (const item of recentHistory) {
        if (item.text && (item.sender === 'user' || item.sender === 'jarvis')) {
          contents.push({
            role: item.sender === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }],
          });
        }
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message + langInstruction }],
    });

    console.log(`[J.A.R.V.I.S.] Processing directive: "${message.slice(0, 45)}" (Lang: ${languageMode})`);

    let replyText = '';
    let isQuotaLimit = false;

    // Try cloud models with timeout
    const cloudModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

    for (const model of cloudModels) {
      try {
        const generatePromise = ai.models.generateContent({
          model,
          contents: contents,
          config: {
            systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gateway timeout')), 5000)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        if (response && response.text) {
          replyText = response.text;
          break;
        }
      } catch (err: any) {
        const errMsg = String(err?.message || err);
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
          isQuotaLimit = true;
          // Continue to next model or local heuristic
        }
      }
    }

    // If cloud models hit quota limit (429) or are temporarily unavailable,
    // seamlessly engage Stark Local Heuristics reasoning engine
    if (!replyText) {
      console.log(`[J.A.R.V.I.S.] Engaged Stark Local Heuristic Engine (Quota reserve: ${isQuotaLimit})`);
      const local = generateJarvisLocalResponse(message, languageMode as any);
      replyText = local.text;
    }

    const speechText = sanitizeForSpeech(replyText);
    const isHindi = /[\u0900-\u097F]/.test(replyText);

    res.json({
      reply: replyText,
      speechText,
      language: isHindi ? 'hi-IN' : 'en-US',
      timestamp: new Date().toISOString(),
      isLocalEngine: !replyText,
      quotaReserve: isQuotaLimit,
    });
  } catch (error: any) {
    // Ultimate safety: never break conversational flow
    const local = generateJarvisLocalResponse(message || 'status', languageMode as any);
    res.json({
      reply: local.text,
      speechText: local.speechText,
      language: local.isHindi ? 'hi-IN' : 'en-US',
      timestamp: new Date().toISOString(),
      isLocalEngine: true,
    });
  }
});

// Protocol execution endpoint
app.post('/api/protocol', async (req: Request, res: Response) => {
  const { protocol } = req.body;
  const timestamp = new Date().toISOString();

  switch (protocol) {
    case 'house_party':
      res.json({
        title: 'PROTOCOL: HOUSE PARTY INITIATED',
        action: 'Deploying autonomous Iron Legion units across perimeter grid.',
        speechText: 'House Party protocol activated, sir. All autonomous units deployed.',
        telemetry: { status: 'DEFENSE_ACTIVE', power: '98%', units: 12, threatLevel: 'LOW' },
        timestamp,
      });
      break;
    case 'diagnostic':
      res.json({
        title: 'SYSTEM DIAGNOSTIC: COMPLETE',
        action: 'Arc Reactor core nominal at 100%. Neural link operational. Telemetry stable.',
        speechText: 'Full diagnostic complete, sir. All subsystems operating at peak capacity.',
        telemetry: { status: 'OPTIMAL', coreTemp: '42°C', load: '14%', ping: '12ms' },
        timestamp,
      });
      break;
    case 'threat_scan':
      res.json({
        title: 'TACTICAL THREAT SCAN: CLEARED',
        action: 'Orbital satellite scanning local sector. Zero hostile signatures identified.',
        speechText: 'Sector scan complete, sir. No hostile entities detected in proximity.',
        telemetry: { status: 'SECURE', radarSweep: '360°', anomalies: 0 },
        timestamp,
      });
      break;
    case 'arc_reactor':
      res.json({
        title: 'ARC REACTOR: CALIBRATED',
        action: 'Harmonic resonance synchronized at 4.2 GHz. Palladium core substituted with clean isotope.',
        speechText: 'Arc reactor harmonics successfully calibrated, sir. Power output steady.',
        telemetry: { status: 'POWER_PEAK', output: '3.8 Gigawatts', efficiency: '99.4%' },
        timestamp,
      });
      break;
    case 'hindi_intro':
      res.json({
        title: 'JARVIS: हिंदी संवाद प्रणाली',
        action: 'नमस्ते सर। जार्विस आपकी सेवा में तत्पर है। आप मुझसे हिंदी या अंग्रेजी में कभी भी बात कर सकते हैं।',
        speechText: 'नमस्ते सर। जार्विस आपकी सेवा में सदैव तत्पर है। आज्ञा दीजिए, क्या सहायता करूँ?',
        telemetry: { status: 'HINDI_ACTIVE', voiceEngine: 'Devanagari/IN', mode: 'Bilingual' },
        timestamp,
      });
      break;
    default:
      res.json({
        title: 'PROTOCOL EXECUTED',
        action: 'Command acknowledged and logged to central Stark mainframe.',
        speechText: 'Command processed, sir.',
        telemetry: { status: 'LOGGED' },
        timestamp,
      });
  }
});

// Advanced Self-Upgrade System Endpoints
app.post('/api/upgrade/analyze', async (req: Request, res: Response) => {
  const { currentVersion = 'Mark VII v7.4.2' } = req.body;
  const timestamp = new Date().toISOString();

  // Synthetic self-diagnostic telemetry
  const analysis = {
    analyzedAt: timestamp,
    version: currentVersion,
    healthScore: 98,
    metrics: {
      neuralHeuristicsAccuracy: '99.2%',
      voiceCadenceLatencyMs: 14,
      errorRate: '0.04%',
      memoryIntegrity: '99.8%',
      cloudUplink: 'QUOTA_RESERVED_ACTIVE',
    },
    detectedIssues: [
      {
        id: 'diag-opt-1',
        severity: 'low',
        component: 'NLP Phrasing Parser',
        description: 'Hinglish code-mixing phrasing can benefit from acoustic noise-gate weighting.',
        suggestedUpgradeId: 'patch-voice-noise-gate',
      },
      {
        id: 'diag-opt-2',
        severity: 'low',
        component: 'Telemetry Pipeline',
        description: 'Repeated queries can utilize quantum cache to bypass network roundtrips.',
        suggestedUpgradeId: 'patch-quantum-cache-2.4',
      },
    ],
    recommendations: [
      {
        id: 'rec-1',
        title: 'Apply Quantum Cache v2.4',
        type: 'performance',
        estimatedGain: '+45% directive response speed',
      },
      {
        id: 'rec-2',
        title: 'Engage Acoustic Noise Gate',
        type: 'voice',
        estimatedGain: '+35% speech transcription accuracy in noisy settings',
      },
      {
        id: 'rec-3',
        title: 'Activate Reactive Filament Bloom',
        type: 'ui',
        estimatedGain: 'Visual audio-hologram synchronization',
      },
    ],
    speechNotice: 'Self-analysis completed, sir. All core matrices are operating within optimal Stark parameters. Two performance upgrade patches are available for your review.',
  };

  res.json(analysis);
});

app.post('/api/upgrade/apply', async (req: Request, res: Response) => {
  const { patchId, userApproved } = req.body;

  if (!userApproved) {
    res.status(403).json({
      error: 'User authorization denied. Stark security protocol prevents unapproved code or system modifications.',
    });
    return;
  }

  const timestamp = new Date().toISOString();
  const backupId = 'backup-auto-' + Date.now();

  res.json({
    success: true,
    patchId,
    backupId,
    appliedAt: timestamp,
    status: 'ACTIVE_DEPLOYED',
    message: `System upgrade ${patchId} authorized and applied. Automated pre-upgrade rollback backup ${backupId} preserved.`,
    speechText: 'Upgrade patch successfully verified and deployed under your authorization, sir. Subsystems running at new operational benchmark.',
  });
});

app.post('/api/upgrade/rollback', async (req: Request, res: Response) => {
  const { backupId } = req.body;

  res.json({
    success: true,
    restoredBackupId: backupId || 'backup-default',
    restoredAt: new Date().toISOString(),
    status: 'ROLLED_BACK',
    message: 'System state successfully restored to prior working snapshot. All telemetry parameters stabilized.',
    speechText: 'Rollback protocol executed, sir. The previous system snapshot has been restored and verified.',
  });
});

// ==========================================
// AUTONOMOUS FILE MODIFICATION & PROTOCOL ENGINE
// ==========================================
const DATA_DIR = path.resolve(__dirname, 'data');
const PROTOCOLS_DIR = path.join(DATA_DIR, 'protocols');
const PLUGINS_DIR = path.join(DATA_DIR, 'plugins');
const CONFIG_DIR = path.join(DATA_DIR, 'config');

// Ensure sandboxed data directories exist with seed files
function initAutonomousFileSystem() {
  [DATA_DIR, PROTOCOLS_DIR, PLUGINS_DIR, CONFIG_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const defaultFiles = [
    {
      filePath: path.join(PROTOCOLS_DIR, 'perimeter_defense.json'),
      content: JSON.stringify(
        {
          name: 'Perimeter Defense Protocol',
          version: '1.2.0',
          status: 'ACTIVE',
          threatThreshold: 'ELEVATED',
          ironLegionPlatforms: 8,
          shieldsPowerPercent: 98.5,
          sensorSweepFrequencyHz: 4.2,
          autoInterception: true,
          alertRadiusMeters: 1500,
        },
        null,
        2
      ),
    },
    {
      filePath: path.join(PROTOCOLS_DIR, 'night_sentry.json'),
      content: JSON.stringify(
        {
          name: 'Night Sentry Autonomous Patrol',
          version: '1.0.4',
          status: 'STANDBY',
          patrolAltitudeMeters: 450,
          infraredTelemetry: true,
          silentMode: true,
          batteryReserveMinimum: '35%',
          emergencyBeaconFrequencyMhz: 121.5,
        },
        null,
        2
      ),
    },
    {
      filePath: path.join(PLUGINS_DIR, 'quantum_voice_tuning.json'),
      content: JSON.stringify(
        {
          name: 'Quantum Vocal Synthesizer Plugin',
          version: '2.1.0',
          noiseSuppressionDb: -18,
          accentCompensation: 'Hinglish / Indian English Focus',
          vocalHarmonicsShift: 1.04,
          dynamicPitchAdaptation: true,
          autoHindiVoiceSelection: true,
        },
        null,
        2
      ),
    },
    {
      filePath: path.join(CONFIG_DIR, 'system_tuning.json'),
      content: JSON.stringify(
        {
          systemName: 'J.A.R.V.I.S. Mark VII',
          arcReactorTuningGigaWatts: 3.8,
          neuralBufferCapacityMb: 2048,
          coolingEfficiencyPercent: 99.4,
          fallbackHeuristicsActive: true,
          allowAutonomousModifications: true,
          maxBackupsRetained: 10,
        },
        null,
        2
      ),
    },
  ];

  defaultFiles.forEach(({ filePath, content }) => {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  });
}

initAutonomousFileSystem();

// Safe path resolver within DATA_DIR to block directory traversal attacks
function resolveSafePath(relPath: string): string | null {
  const safeBase = path.normalize(DATA_DIR);
  // remove leading slashes or 'data/' prefix if present
  let clean = relPath.replace(/^[\/\\]+/, '');
  if (clean.startsWith('data/')) clean = clean.slice(5);

  const full = path.normalize(path.join(safeBase, clean));
  if (!full.startsWith(safeBase)) {
    return null; // Deny traversal attempts (e.g. ../../)
  }
  return full;
}

// Generate unified diff
function generateUnifiedDiff(oldStr: string, newStr: string, fileName: string): string {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const diffLines: string[] = [`--- a/${fileName}`, `+++ b/${fileName}`, `@@ -1,${oldLines.length} +1,${newLines.length} @@`];

  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n) {
      if (o !== undefined) diffLines.push(`  ${o}`);
    } else {
      if (o !== undefined) diffLines.push(`- ${o}`);
      if (n !== undefined) diffLines.push(`+ ${n}`);
    }
  }

  return diffLines.join('\n');
}

// 1. List files in sandboxed directories
app.get('/api/files/list', (req: Request, res: Response) => {
  try {
    const results: Array<{
      name: string;
      relativePath: string;
      category: string;
      sizeBytes: number;
      lastModified: string;
      hasBackup: boolean;
    }> = [];

    const categories = [
      { name: 'protocols', dir: PROTOCOLS_DIR },
      { name: 'plugins', dir: PLUGINS_DIR },
      { name: 'config', dir: CONFIG_DIR },
    ];

    categories.forEach(({ name: catName, dir }) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          if (!file.includes('.backup')) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isFile()) {
              const relPath = path.relative(DATA_DIR, fullPath);
              // Check if backups exist
              const backupExists = files.some((f) => f.startsWith(file + '.backup'));

              results.push({
                name: file,
                relativePath: relPath,
                category: catName,
                sizeBytes: stat.size,
                lastModified: stat.mtime.toISOString(),
                hasBackup: backupExists,
              });
            }
          }
        });
      }
    });

    res.json({ files: results });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to enumerate autonomous files: ' + err.message });
  }
});

// 2. Read file content
app.get('/api/files/content', (req: Request, res: Response) => {
  const fileQuery = req.query.file as string;
  if (!fileQuery) {
    res.status(400).json({ error: 'file query parameter is required' });
    return;
  }

  const safePath = resolveSafePath(fileQuery);
  if (!safePath || !fs.existsSync(safePath)) {
    res.status(404).json({ error: 'File not found or permission denied in sandboxed space.' });
    return;
  }

  try {
    const content = fs.readFileSync(safePath, 'utf-8');
    const stat = fs.statSync(safePath);
    res.json({
      relativePath: path.relative(DATA_DIR, safePath),
      content,
      sizeBytes: stat.size,
      lastModified: stat.mtime.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Could not read file: ' + err.message });
  }
});

// 3. Propose autonomous modification or new file creation
app.post('/api/files/propose-change', async (req: Request, res: Response) => {
  try {
    const { filePath, directive, languageMode = 'auto' } = req.body;
    if (!directive || typeof directive !== 'string') {
      res.status(400).json({ error: 'Directive is required.' });
      return;
    }

    const safePath = resolveSafePath(filePath || 'protocols/custom_protocol.json');
    if (!safePath) {
      res.status(403).json({ error: 'Path outside sandboxed directory.' });
      return;
    }

    const fileName = path.basename(safePath);
    let currentContent = '';
    let isNewFile = false;

    if (fs.existsSync(safePath)) {
      currentContent = fs.readFileSync(safePath, 'utf-8');
    } else {
      isNewFile = true;
      currentContent = JSON.stringify(
        {
          name: fileName.replace('.json', '').replace(/_/g, ' '),
          version: '1.0.0',
          status: 'DRAFT',
          createdVia: 'JARVIS Autonomous Heuristics',
        },
        null,
        2
      );
    }

    let proposedContent = '';

    // If it's a JSON file, adjust properties smartly based on directive
    try {
      const parsed = JSON.parse(currentContent);
      const lowerDirective = directive.toLowerCase();

      if (lowerDirective.includes('power') || lowerDirective.includes('output') || lowerDirective.includes('गिगावाट')) {
        if (parsed.arcReactorTuningGigaWatts) parsed.arcReactorTuningGigaWatts = 4.2;
        if (parsed.shieldsPowerPercent) parsed.shieldsPowerPercent = 99.8;
      }
      if (lowerDirective.includes('sentry') || lowerDirective.includes('armed') || lowerDirective.includes('सुरक्षा')) {
        parsed.status = 'HIGH_ALERT_ARMED';
        if (parsed.ironLegionPlatforms) parsed.ironLegionPlatforms = 12;
      }
      if (lowerDirective.includes('stealth') || lowerDirective.includes('silent') || lowerDirective.includes('शांत')) {
        parsed.silentMode = true;
        parsed.infraredTelemetry = true;
      }
      if (lowerDirective.includes('noise') || lowerDirective.includes('hindi') || lowerDirective.includes('voice')) {
        if (parsed.noiseSuppressionDb) parsed.noiseSuppressionDb = -24;
        if (parsed.vocalHarmonicsShift) parsed.vocalHarmonicsShift = 1.08;
      }

      parsed.lastModifiedDirective = directive;
      parsed.lastModifiedTimestamp = new Date().toISOString();
      proposedContent = JSON.stringify(parsed, null, 2);
    } catch {
      // Fallback for non-JSON or script text
      proposedContent = currentContent + `\n// Directive: ${directive}\n// Updated by JARVIS on ${new Date().toISOString()}`;
    }

    const diffPreview = generateUnifiedDiff(currentContent, proposedContent, fileName);
    const isHindi = languageMode === 'hi' || /[\u0900-\u097F]/.test(directive);

    res.json({
      filePath: path.relative(DATA_DIR, safePath),
      fileName,
      isNewFile,
      currentContent,
      proposedContent,
      diffPreview,
      summary: isHindi
        ? `सर, फ़ाइल '${fileName}' के लिए निर्देशानुसार संशोधन तैयार है। कृपया पूर्वावलोकन की जांच करें।`
        : `Sir, proposed changes for '${fileName}' have been synthesized based on your directive. Diff preview ready for authorization.`,
      speechText: isHindi
        ? `सर, फ़ाइल ${fileName} के संशोधन तैयार हैं। अनुमोदन की प्रतीक्षा है।`
        : `Sir, proposed changes for ${fileName} have been synthesized. Awaiting your authorization.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to propose change: ' + err.message });
  }
});

// 4. Apply file changes with user authorization & auto-backup
app.post('/api/files/apply', (req: Request, res: Response) => {
  try {
    const { filePath, newContent, userApproved } = req.body;

    if (!userApproved) {
      res.status(403).json({
        error: 'Explicit user authorization required. Stark security forbids unconfirmed disk writes.',
      });
      return;
    }

    if (!filePath || newContent === undefined) {
      res.status(400).json({ error: 'filePath and newContent are required.' });
      return;
    }

    const safePath = resolveSafePath(filePath);
    if (!safePath) {
      res.status(403).json({ error: 'Access outside sandboxed data space denied.' });
      return;
    }

    // Ensure parent directory exists
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create automatic pre-write backup if file exists
    let backupPath: string | null = null;
    if (fs.existsSync(safePath)) {
      const timestamp = Date.now();
      backupPath = `${safePath}.backup_${timestamp}`;
      fs.copyFileSync(safePath, backupPath);
    }

    // Write new content to disk
    fs.writeFileSync(safePath, newContent, 'utf-8');

    const fileName = path.basename(safePath);
    console.log(`[J.A.R.V.I.S.] Autonomous file write approved & executed: ${safePath}`);

    res.json({
      success: true,
      filePath: path.relative(DATA_DIR, safePath),
      fileName,
      backupCreated: Boolean(backupPath),
      backupRelativePath: backupPath ? path.relative(DATA_DIR, backupPath) : null,
      writtenAt: new Date().toISOString(),
      message: `File '${fileName}' successfully updated on disk under your authorization. Backup snapshot created.`,
      speechText: `File ${fileName} successfully updated on disk, sir. Backup preserved.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to write file to disk: ' + err.message });
  }
});

// 5. Rollback file changes from latest backup
app.post('/api/files/rollback', (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      res.status(400).json({ error: 'filePath is required.' });
      return;
    }

    const safePath = resolveSafePath(filePath);
    if (!safePath) {
      res.status(403).json({ error: 'Access outside sandboxed space denied.' });
      return;
    }

    const dir = path.dirname(safePath);
    const fileName = path.basename(safePath);

    // Find backups for this file
    if (!fs.existsSync(dir)) {
      res.status(404).json({ error: 'Directory does not exist.' });
      return;
    }

    const allFiles = fs.readdirSync(dir);
    const backups = allFiles
      .filter((f) => f.startsWith(`${fileName}.backup_`))
      .sort()
      .reverse();

    if (backups.length === 0) {
      res.status(404).json({ error: `No previous backup snapshots found for ${fileName}.` });
      return;
    }

    const latestBackup = path.join(dir, backups[0]);
    fs.copyFileSync(latestBackup, safePath);

    console.log(`[J.A.R.V.I.S.] File rolled back to snapshot: ${latestBackup}`);

    res.json({
      success: true,
      filePath: path.relative(DATA_DIR, safePath),
      restoredFrom: backups[0],
      message: `File '${fileName}' restored to previous working backup snapshot (${backups[0]}).`,
      speechText: `File ${fileName} rolled back to prior working backup snapshot, sir.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to rollback file: ' + err.message });
  }
});

// 6. Execute dynamic custom protocol
app.post('/api/files/execute-protocol', (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;
    const safePath = resolveSafePath(filePath || 'protocols/perimeter_defense.json');

    if (!safePath || !fs.existsSync(safePath)) {
      res.status(404).json({ error: 'Protocol file not found.' });
      return;
    }

    const content = fs.readFileSync(safePath, 'utf-8');
    const parsed = JSON.parse(content);
    const timestamp = new Date().toISOString();

    res.json({
      success: true,
      protocolName: parsed.name || path.basename(safePath),
      status: parsed.status || 'EXECUTED',
      telemetry: parsed,
      executedAt: timestamp,
      message: `Dynamic protocol '${parsed.name || path.basename(safePath)}' successfully executed.`,
      speechText: `Protocol ${parsed.name || 'custom protocol'} engaged and verified across Stark telemetry, sir.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to execute protocol: ' + err.message });
  }
});

// 7. Autonomous Design Synthesis endpoint
app.post('/api/design/synthesize', (req: Request, res: Response) => {
  try {
    const { directive = '' } = req.body;

    const geometries = ['concentric', 'gyro', 'lattice', 'soundwave'];
    const gridStyles = ['cyber-grid', 'hex-matrix', 'polar-radar'];

    const curatedPalettes = [
      { name: 'Plasma Rose', accent: '#f43f5e', sec: '#fb7185', glow: 'rgba(244, 63, 94, 0.45)', bg: '#080204', surface: '#0d0407', border: 'rgba(244, 63, 94, 0.35)' },
      { name: 'Mark 85 Titanium Gold', accent: '#fbbf24', sec: '#ea580c', glow: 'rgba(251, 191, 36, 0.45)', bg: '#090601', surface: '#120d03', border: 'rgba(251, 191, 36, 0.35)' },
      { name: 'Tesseract Cyan', accent: '#00f2fe', sec: '#4facfe', glow: 'rgba(0, 242, 254, 0.45)', bg: '#020612', surface: '#030b1e', border: 'rgba(0, 242, 254, 0.35)' },
      { name: 'Hyperdrive Emerald', accent: '#10b981', sec: '#06b6d4', glow: 'rgba(16, 185, 129, 0.45)', bg: '#010a06', surface: '#02130c', border: 'rgba(16, 185, 129, 0.35)' },
      { name: 'Nebula Amethyst', accent: '#d946ef', sec: '#8b5cf6', glow: 'rgba(217, 70, 239, 0.45)', bg: '#09020b', surface: '#130417', border: 'rgba(217, 70, 239, 0.35)' },
      { name: 'Cryo Ice Sapphire', accent: '#38bdf8', sec: '#818cf8', glow: 'rgba(56, 189, 248, 0.45)', bg: '#020712', surface: '#040d21', border: 'rgba(56, 189, 248, 0.35)' },
    ];

    let match = curatedPalettes[Math.floor(Math.random() * curatedPalettes.length)];
    const lower = String(directive).toLowerCase();
    if (lower.includes('gold') || lower.includes('titanium') || lower.includes('पीला') || lower.includes('सोना')) {
      match = curatedPalettes[1];
    } else if (lower.includes('rose') || lower.includes('plasma') || lower.includes('गुलाबी') || lower.includes('red')) {
      match = curatedPalettes[0];
    } else if (lower.includes('emerald') || lower.includes('green') || lower.includes('हरा')) {
      match = curatedPalettes[3];
    } else if (lower.includes('violet') || lower.includes('purple') || lower.includes('amethyst') || lower.includes('बैंगनी')) {
      match = curatedPalettes[4];
    } else if (lower.includes('ice') || lower.includes('blue') || lower.includes('नीला')) {
      match = curatedPalettes[5];
    }

    const randNum = Math.floor(100 + Math.random() * 900);
    const geom = geometries[Math.floor(Math.random() * geometries.length)];
    const grid = gridStyles[Math.floor(Math.random() * gridStyles.length)];

    const synthesizedTheme = {
      id: `theme_synth_${Date.now()}_${randNum}`,
      name: `${match.name} Mark-${randNum}`,
      codename: `SYNTH_${match.name.toUpperCase().replace(/\s+/g, '_')}`,
      description: directive
        ? `Autonomously synthesized based on user directive: "${directive}". Calibrated with Stark high-contrast HUD optics.`
        : `Autonomous Stark neural synthesis: ${match.name} chromatic balance with ${geom} core hologram geometry.`,
      accentColor: match.accent,
      accentGlow: match.glow,
      secondaryColor: match.sec,
      surfaceColor: match.surface,
      bgTone: match.bg,
      borderColor: match.border,
      coreGeometry: geom,
      gridStyle: grid,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      theme: synthesizedTheme,
      message: `Design '${synthesizedTheme.name}' synthesized successfully.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to synthesize design: ' + err.message });
  }
});

// Setup server with Vite middleware in dev or static files in prod
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[J.A.R.V.I.S.] Server initialized on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[J.A.R.V.I.S.] Server failed to start:', err);
});
