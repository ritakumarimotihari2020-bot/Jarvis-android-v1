/**
 * Robust Dual-Engine Speech Recognition (STT) and Speech Synthesis (TTS) system for J.A.R.V.I.S.
 * - Starts browser SpeechRecognition synchronously on user click (preserving user-gesture activation).
 * - Automatically flushes captured interim transcripts when speech ends so spoken Hindi/English
 *   commands are never dropped even on mobile Chrome/WebView.
 * - Falls back to MediaRecorder + Server-Side Gemini Audio Transcription (/api/voice/transcribe)
 *   if Web Speech API is unavailable or blocked.
 * - Dual-Engine TTS: Uses native Hindi (hi-IN) / English voices, automatically transliterates
 *   Devanagari to phonetic Hinglish if the OS lacks a native hi-IN voice pack (preventing silent TTS drops),
 *   and falls back to Server-Side Gemini TTS (/api/voice/tts) if browser SpeechSynthesis fails.
 */

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    __jarvis_active_utterance?: SpeechSynthesisUtterance | null;
    __jarvis_active_audio?: HTMLAudioElement | null;
  }
}

export interface VoiceOption {
  voice: SpeechSynthesisVoice;
  name: string;
  lang: string;
  isHindi: boolean;
  isEnglish: boolean;
}

// Clean text for natural speech synthesis
export function cleanForTTS(text: string): string {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1') // remove inline code marks
    .replace(/\*\(.*?\)\*/g, '') // remove parenthetical notes
    .replace(/\[.*?\]/g, '') // remove bracket tags like [SYSTEM REPORT]
    .replace(/[*_~#>]/g, '') // remove markdown symbols
    .replace(/https?:\/\/\S+/g, '') // remove urls
    .replace(/•/g, ', ') // replace bullet with comma pause
    .replace(/[\r\n]+/g, '. ') // replace newlines with period
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

// Phonetic Devanagari -> Romanized Hinglish converter for OSes without a native hi-IN voice pack
export function romanizeDevanagariForFallbackTTS(text: string): string {
  const wordMap: Record<string, string> = {
    'नमस्ते': 'Namaste',
    'सर': 'Sir',
    'जार्विस': 'Jarvis',
    'ऑनलाइन': 'online',
    'है': 'hai',
    'हैं': 'hain',
    'आपकी': 'aapki',
    'सेवा': 'seva',
    'में': 'mein',
    'तैयार': 'taiyaar',
    'तत्पर': 'tatpar',
    'आज्ञा': 'aagya',
    'दीजिए': 'deejiye',
    'क्या': 'kya',
    'सहायता': 'sahayata',
    'करूँ': 'karoon',
    'पूरा': 'poora',
    'डिवाइस': 'device',
    'कंट्रोल': 'control',
    'सेल्फ': 'self',
    'अपग्रेड': 'upgrade',
    'और': 'aur',
    'ऐप': 'app',
    'फ़ाइल': 'file',
    'फाइल': 'file',
    'एडिटर': 'editor',
    'वाणी': 'vaani',
    'एवं': 'evam',
    'ध्वनि': 'dhwani',
    'प्रणालियां': 'pranaliyan',
    'पूर्ण': 'poorn',
    'रूप': 'roop',
    'से': 'se',
    'सक्रिय': 'sakriya',
    'जी': 'Jee',
    'आदेश': 'aadesh',
    'का': 'ka',
    'पालन': 'paalan',
    'हो': 'ho',
    'रहा': 'raha',
    'सफलतापूर्वक': 'safaltapoorvak',
    'बदल': 'badal',
    'दिया': 'diya',
    'गया': 'gaya',
  };

  let out = text;
  for (const [dev, rom] of Object.entries(wordMap)) {
    out = out.split(dev).join(rom);
  }

  // Character-level Devanagari phonetic mapping for any remaining Hindi characters
  const charMap: Record<string, string> = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऋ': 'ri',
    'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'n',
    'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'n',
    'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
    'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
    'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
    'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va',
    'श': 'sha', 'ष': 'sha', 'स': 'sa', 'ह': 'ha',
    'क्ष': 'ksha', 'त्र': 'tra', 'ज्ञ': 'gya',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ृ': 'ri',
    'ं': 'n', 'ँ': 'n', 'ः': 'h', '्': '', '़': '', '।': '.',
  };

  let result = '';
  for (let i = 0; i < out.length; i++) {
    const ch = out[i];
    const next = out[i + 1];
    // Handle consonant + virama or matra cleanly
    if (charMap[ch] !== undefined) {
      let mapped = charMap[ch];
      if (
        mapped.length > 1 &&
        mapped.endsWith('a') &&
        ch >= 'क' &&
        ch <= 'ह' &&
        next &&
        ((next >= 'ा' && next <= 'ौ') || next === '्' || next === ' ' || next === '.' || next === ',')
      ) {
        mapped = mapped.slice(0, -1);
      }
      result += mapped;
    } else {
      result += ch;
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}

export class JarvisSpeechEngine {
  private recognition: any = null;
  private isListening = false;
  private isNeuralFallbackMode = false;
  private audioPulseInterval: any = null;
  private ttsResumeWatchdog: any = null;
  private speechDispatchTimeout: any = null;
  private silenceAutoSubmitTimer: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor() {
    this.initRecognition();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
      } catch (e) {
        console.warn('SpeechRecognition initialization error:', e);
      }
    }
  }

  public isRecognitionSupported(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
        (window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  public isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getIsNeuralFallbackMode(): boolean {
    return this.isNeuralFallbackMode;
  }

  public async requestHardwareMicPermission(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      this.isNeuralFallbackMode = false;
      return true;
    } catch {
      return false;
    }
  }

  // Get available voices
  public getVoices(): Promise<VoiceOption[]> {
    return new Promise((resolve) => {
      if (!this.isSynthesisSupported()) {
        resolve([]);
        return;
      }

      const mapVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const mapped = voices.map((v) => {
          const l = v.lang.toLowerCase();
          const n = v.name.toLowerCase();
          const isHi =
            l.startsWith('hi') ||
            n.includes('hindi') ||
            n.includes('हिन्दी') ||
            n.includes('lekha') ||
            n.includes('kalpana') ||
            n.includes('swara') ||
            n.includes('madhur');
          const isEn = l.startsWith('en');
          return {
            voice: v,
            name: v.name,
            lang: v.lang,
            isHindi: isHi,
            isEnglish: isEn,
          };
        });
        resolve(mapped);
      };

      const initial = window.speechSynthesis.getVoices();
      if (initial.length > 0) {
        mapVoices();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          mapVoices();
        };
        setTimeout(mapVoices, 400);
      }
    });
  }

  private engageNeuralVoiceFallback(
    onStart?: () => void,
    onAudioLevel?: (level: number) => void,
    onFallbackModeChange?: (active: boolean) => void,
    onResult?: (transcript: string, isFinal: boolean) => void,
    onEnd?: () => void,
    lang?: string
  ) {
    this.isListening = true;
    this.isNeuralFallbackMode = true;
    onFallbackModeChange?.(true);
    onStart?.();
    this.startSynthesizedAudioMeter(onAudioLevel);

    // Attempt MediaRecorder fallback -> /api/voice/transcribe if hardware mic is available
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && onResult) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          if (!this.isListening) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          this.recordedChunks = [];
          const recorder = new MediaRecorder(stream);
          this.mediaRecorder = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              this.recordedChunks.push(e.data);
            }
          };

          recorder.onstop = async () => {
            stream.getTracks().forEach((t) => t.stop());
            if (this.recordedChunks.length === 0) return;
            const blob = new Blob(this.recordedChunks, { type: recorder.mimeType || 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Data = String(reader.result || '').split(',')[1];
              if (!base64Data) return;
              try {
                const res = await fetch('/api/voice/transcribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    audioBase64: base64Data,
                    mimeType: blob.type || 'audio/webm',
                    language: lang || 'auto',
                  }),
                });
                const data = await res.json();
                if (data.transcript && data.transcript.trim()) {
                  onResult(data.transcript.trim(), true);
                }
              } catch {
                // ignore
              } finally {
                onEnd?.();
              }
            };
            reader.readAsDataURL(blob);
          };

          recorder.start();
          // Automatically stop recording after 5 seconds to transcribe
          setTimeout(() => {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
              this.mediaRecorder.stop();
            }
          }, 5000);
        })
        .catch(() => {
          // Stay in visual Neural Transceiver mode
        });
    }
  }

  /**
   * Start Voice Recognition (STT)
   * IMPORTANT: Starts SpeechRecognition synchronously on user click without pre-calling getUserMedia
   * so Chrome/Android user-gesture activation is preserved and hardware mic is never locked.
   */
  public startListening({
    lang = 'en-IN',
    onStart,
    onResult,
    onError,
    onEnd,
    onAudioLevel,
    onFallbackModeChange,
  }: {
    lang?: string;
    onStart?: () => void;
    onResult: (transcript: string, isFinal: boolean) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
    onAudioLevel?: (level: number) => void;
    onFallbackModeChange?: (active: boolean) => void;
  }) {
    if (this.isListening) {
      this.stopListening();
    }

    if (this.silenceAutoSubmitTimer) {
      clearTimeout(this.silenceAutoSubmitTimer);
      this.silenceAutoSubmitTimer = null;
    }

    if (!this.isRecognitionSupported()) {
      this.engageNeuralVoiceFallback(onStart, onAudioLevel, onFallbackModeChange, onResult, onEnd, lang);
      return;
    }

    try {
      this.initRecognition();
    } catch {
      // ignore
    }

    if (!this.recognition) {
      this.engageNeuralVoiceFallback(onStart, onAudioLevel, onFallbackModeChange, onResult, onEnd, lang);
      return;
    }

    // Use hi-IN when Hindi is chosen, or en-IN (which recognizes both Indian English and Hinglish!)
    this.recognition.lang = lang === 'hi-IN' ? 'hi-IN' : 'en-IN';

    let latestCapturedTranscript = '';
    let hasDispatchedFinal = false;

    const finalizeTranscript = (text: string) => {
      if (hasDispatchedFinal || !text.trim()) return;
      hasDispatchedFinal = true;
      if (this.silenceAutoSubmitTimer) {
        clearTimeout(this.silenceAutoSubmitTimer);
        this.silenceAutoSubmitTimer = null;
      }
      this.stopListening();
      onResult(text.trim(), true);
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      this.isNeuralFallbackMode = false;
      onFallbackModeChange?.(false);
      onStart?.();
      this.startSynthesizedAudioMeter(onAudioLevel);
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i][0];
        if (item) {
          if (event.results[i].isFinal) {
            finalTranscript += item.transcript + ' ';
          } else {
            interimTranscript += item.transcript;
          }
        }
      }

      const combined = (finalTranscript + interimTranscript).trim();
      if (combined) {
        latestCapturedTranscript = combined;
      }

      if (onAudioLevel) {
        const bump = Math.min(1.0, 0.45 + (combined.length % 5) * 0.12);
        onAudioLevel(bump);
      }

      if (finalTranscript.trim()) {
        finalizeTranscript(finalTranscript.trim());
        return;
      }

      if (interimTranscript.trim()) {
        onResult(interimTranscript.trim(), false);
        // Reset 1.7-second silence auto-submit timer so if user pauses after speaking, it submits automatically
        if (this.silenceAutoSubmitTimer) {
          clearTimeout(this.silenceAutoSubmitTimer);
        }
        this.silenceAutoSubmitTimer = setTimeout(() => {
          if (latestCapturedTranscript.trim() && !hasDispatchedFinal) {
            finalizeTranscript(latestCapturedTranscript);
          }
        }, 1700);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (this.silenceAutoSubmitTimer) {
        clearTimeout(this.silenceAutoSubmitTimer);
        this.silenceAutoSubmitTimer = null;
      }

      // If we already captured words before an error/abort, submit them immediately!
      if (latestCapturedTranscript.trim() && !hasDispatchedFinal) {
        finalizeTranscript(latestCapturedTranscript);
        return;
      }

      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed' ||
        event.error === 'audio-capture' ||
        event.error === 'network'
      ) {
        this.engageNeuralVoiceFallback(onStart, onAudioLevel, onFallbackModeChange, onResult, onEnd, lang);
        return;
      }

      this.isListening = false;
      this.stopSynthesizedAudioMeter();
      onError?.('no-speech');
    };

    this.recognition.onend = () => {
      if (this.silenceAutoSubmitTimer) {
        clearTimeout(this.silenceAutoSubmitTimer);
        this.silenceAutoSubmitTimer = null;
      }

      // If user spoke words and recognition ended before firing isFinal, submit them right now!
      if (latestCapturedTranscript.trim() && !hasDispatchedFinal) {
        finalizeTranscript(latestCapturedTranscript);
        return;
      }

      if (this.isNeuralFallbackMode) {
        return;
      }

      this.isListening = false;
      this.stopSynthesizedAudioMeter();
      onEnd?.();
    };

    try {
      this.recognition.start();
    } catch {
      this.engageNeuralVoiceFallback(onStart, onAudioLevel, onFallbackModeChange, onResult, onEnd, lang);
    }
  }

  public stopListening() {
    if (this.silenceAutoSubmitTimer) {
      clearTimeout(this.silenceAutoSubmitTimer);
      this.silenceAutoSubmitTimer = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    if (this.recognition && this.isListening && !this.isNeuralFallbackMode) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
    this.isNeuralFallbackMode = false;
    this.stopSynthesizedAudioMeter();
  }

  private startSynthesizedAudioMeter(onAudioLevel?: (level: number) => void) {
    if (!onAudioLevel) return;
    this.stopSynthesizedAudioMeter();

    let step = 0;
    this.audioPulseInterval = setInterval(() => {
      if (!this.isListening) {
        this.stopSynthesizedAudioMeter();
        return;
      }
      step += 0.22;
      const level = Math.abs(Math.sin(step) * 0.45) + (Math.sin(step * 2.3) > 0 ? 0.35 : 0.15);
      onAudioLevel(Math.min(1.0, level));
    }, 80);
  }

  private stopSynthesizedAudioMeter() {
    if (this.audioPulseInterval) {
      clearInterval(this.audioPulseInterval);
      this.audioPulseInterval = null;
    }
  }

  /**
   * Server-Side Gemini AI Voice Fallback (/api/voice/tts)
   * Plays high-definition 24kHz WAV audio if browser SpeechSynthesis fails or is unavailable.
   */
  private async playServerTtsFallback(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ): Promise<boolean> {
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 600) }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.audioBase64) return false;

      return await new Promise<boolean>((resolve) => {
        const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
        window.__jarvis_active_audio = audio;
        audio.onplay = () => onStart?.();
        audio.onended = () => {
          window.__jarvis_active_audio = null;
          onEnd?.();
          resolve(true);
        };
        audio.onerror = (err) => {
          window.__jarvis_active_audio = null;
          onError?.(err);
          resolve(false);
        };
        audio.play().catch((err) => {
          window.__jarvis_active_audio = null;
          onError?.(err);
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * Text-to-Speech (TTS)
   * Speaks both Hindi and English reliably across all browsers and operating systems:
   * 1. If text contains Hindi (Devanagari) and the browser has a native hi-IN voice, uses it directly.
   * 2. If text contains Hindi and the browser has NO hi-IN voice installed, automatically transliterates
   *    Devanagari into phonetic Hinglish so the English/Indian-English voice speaks it aloud clearly!
   * 3. Includes a 650ms start watchdog that falls back to Server-Side Gemini TTS (/api/voice/tts)
   *    if browser SpeechSynthesis fails to produce audio.
   */
  public speak({
    text,
    langHint,
    preferredVoiceURI,
    rate = 1.0,
    pitch = 1.0,
    onStart,
    onEnd,
    onError,
  }: {
    text: string;
    langHint?: string;
    preferredVoiceURI?: string;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }): Promise<void> {
    return new Promise((resolve) => {
      const cleanText = cleanForTTS(text);
      if (!cleanText) {
        onEnd?.();
        resolve();
        return;
      }

      this.stopSpeaking();

      if (!this.isSynthesisSupported()) {
        this.playServerTtsFallback(cleanText, onStart, onEnd, onError).finally(() => resolve());
        return;
      }

      this.speechDispatchTimeout = setTimeout(() => {
        try {
          window.speechSynthesis.resume();
        } catch {
          // ignore
        }

        const hasDevanagari = /[\u0900-\u097F]/.test(cleanText);
        const isHindiRequested =
          hasDevanagari ||
          Boolean(langHint && (langHint.toLowerCase().startsWith('hi') || langHint.toLowerCase().includes('hindi')));

        const allVoices = window.speechSynthesis.getVoices();
        let chosenVoice: SpeechSynthesisVoice | null = null;

        if (preferredVoiceURI) {
          chosenVoice = allVoices.find((v) => v.voiceURI === preferredVoiceURI) || null;
        }

        const hindiVoice =
          allVoices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('hi') ||
              v.name.toLowerCase().includes('hindi') ||
              v.name.includes('हिन्दी') ||
              v.name.toLowerCase().includes('lekha') ||
              v.name.toLowerCase().includes('kalpana') ||
              v.name.toLowerCase().includes('swara') ||
              v.name.toLowerCase().includes('madhur')
          ) || null;

        const englishVoice =
          allVoices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
          allVoices.find(
            (v) =>
              v.lang.toLowerCase().startsWith('en-gb') &&
              (v.name.toLowerCase().includes('male') ||
                v.name.toLowerCase().includes('george') ||
                v.name.toLowerCase().includes('daniel') ||
                v.name.toLowerCase().includes('oliver'))
          ) ||
          allVoices.find((v) => v.lang.toLowerCase().startsWith('en-gb')) ||
          allVoices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ||
          allVoices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
          allVoices[0] ||
          null;

        let textToSpeak = cleanText;
        let targetLang = 'en-US';

        if (!chosenVoice) {
          if (isHindiRequested) {
            if (hindiVoice) {
              chosenVoice = hindiVoice;
              targetLang = hindiVoice.lang || 'hi-IN';
            } else {
              // CRITICAL FIX: Browser has NO Hindi voice installed!
              // Transliterate Devanagari to Romanized Hinglish and speak with Indian-English / English voice
              // so speechSynthesis NEVER silently drops Hindi utterances!
              chosenVoice = englishVoice;
              targetLang = englishVoice?.lang || 'en-US';
              if (hasDevanagari) {
                textToSpeak = romanizeDevanagariForFallbackTTS(cleanText);
              }
            }
          } else {
            chosenVoice = englishVoice;
            targetLang = englishVoice?.lang || 'en-US';
            if (hasDevanagari && !hindiVoice) {
              textToSpeak = romanizeDevanagariForFallbackTTS(cleanText);
            }
          }
        } else {
          targetLang = chosenVoice.lang || 'en-US';
          if (hasDevanagari && !targetLang.toLowerCase().startsWith('hi')) {
            textToSpeak = romanizeDevanagariForFallbackTTS(cleanText);
          }
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = Math.max(0.7, Math.min(1.5, rate));
        utterance.pitch = Math.max(0.7, Math.min(1.3, pitch));
        utterance.volume = 1.0;
        utterance.lang = targetLang;

        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }

        window.__jarvis_active_utterance = utterance;
        let hasStarted = false;
        let settled = false;

        const cleanup = () => {
          window.__jarvis_active_utterance = null;
          if (this.ttsResumeWatchdog) {
            clearInterval(this.ttsResumeWatchdog);
            this.ttsResumeWatchdog = null;
          }
        };

        // Watchdog: if browser TTS fails to start within 800ms, try Server TTS fallback
        const startFallbackTimer = setTimeout(() => {
          if (!hasStarted && !settled) {
            settled = true;
            cleanup();
            try {
              window.speechSynthesis.cancel();
            } catch {
              // ignore
            }
            this.playServerTtsFallback(cleanText, onStart, onEnd, onError).finally(() => resolve());
          }
        }, 800);

        utterance.onstart = () => {
          hasStarted = true;
          clearTimeout(startFallbackTimer);
          onStart?.();

          this.ttsResumeWatchdog = setInterval(() => {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          }, 2000);
        };

        utterance.onend = () => {
          clearTimeout(startFallbackTimer);
          if (settled) return;
          settled = true;
          cleanup();
          onEnd?.();
          resolve();
        };

        utterance.onerror = (e) => {
          clearTimeout(startFallbackTimer);
          if (settled) return;
          settled = true;
          cleanup();
          this.playServerTtsFallback(cleanText, onStart, onEnd, onError).finally(() => resolve());
        };

        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          clearTimeout(startFallbackTimer);
          if (!settled) {
            settled = true;
            cleanup();
            this.playServerTtsFallback(cleanText, onStart, onEnd, onError).finally(() => resolve());
          }
        }
      }, 30);
    });
  }

  public stopSpeaking() {
    if (this.speechDispatchTimeout) {
      clearTimeout(this.speechDispatchTimeout);
      this.speechDispatchTimeout = null;
    }
    if (typeof window !== 'undefined' && window.__jarvis_active_audio) {
      try {
        window.__jarvis_active_audio.pause();
        window.__jarvis_active_audio = null;
      } catch {
        // ignore
      }
    }
    if (this.isSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      window.__jarvis_active_utterance = null;
      if (this.ttsResumeWatchdog) {
        clearInterval(this.ttsResumeWatchdog);
        this.ttsResumeWatchdog = null;
      }
    }
  }
}

export const speechEngine = new JarvisSpeechEngine();
