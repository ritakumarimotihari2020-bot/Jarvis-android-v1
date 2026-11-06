/**
 * Robust Speech Recognition (STT) and Speech Synthesis (TTS) system for J.A.R.V.I.S.
 * - Solves microphone hardware contention by separating STT from audio meter.
 * - Solves Chrome TTS garbage-collection bug with persistent utterance references.
 * - Fixes Chromium cancel->speak race condition with scheduled utterance dispatch.
 * - Provides intelligent voice selection for English, Hindi (hi-IN), and Hinglish.
 * - Sanitizes spoken text to ensure natural, flawless pronunciation.
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
    .replace(/\*\(.*?\)\*/g, '') // remove parenthetical notes like *(Note:...)*
    .replace(/\[.*?\]/g, '') // remove bracket tags like [SYSTEM REPORT]
    .replace(/[*_~#>]/g, '') // remove markdown symbols
    .replace(/https?:\/\/\S+/g, '') // remove urls
    .replace(/•/g, ', ') // replace bullet with comma pause
    .replace(/[\r\n]+/g, '. ') // replace newlines with period
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

export class JarvisSpeechEngine {
  private recognition: any = null;
  private isListening = false;
  private audioPulseInterval: any = null;
  private ttsResumeWatchdog: any = null;
  private speechDispatchTimeout: any = null;

  constructor() {
    this.initRecognition();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        // Pre-warm voices cache
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
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
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
            n.includes('kalpana');
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

  // Start Voice Recognition (STT)
  public startListening({
    lang = 'en-US',
    onStart,
    onResult,
    onError,
    onEnd,
    onAudioLevel,
  }: {
    lang?: string;
    onStart?: () => void;
    onResult: (transcript: string, isFinal: boolean) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
    onAudioLevel?: (level: number) => void;
  }) {
    if (!this.isRecognitionSupported()) {
      onError?.('Microphone speech recognition is not supported in this browser. Please use Chrome, Edge, or Android Chrome.');
      return;
    }

    // Abort existing session if running
    if (this.isListening) {
      this.stopListening();
    }

    try {
      this.initRecognition();
    } catch (e) {
      // ignore
    }

    if (!this.recognition) {
      onError?.('Speech recognition failed to initialize.');
      return;
    }

    this.recognition.lang = lang;

    this.recognition.onstart = () => {
      this.isListening = true;
      onStart?.();
      this.startSynthesizedAudioMeter(onAudioLevel);
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i][0];
        if (item) {
          if (event.results[i].isFinal) {
            finalTranscript += item.transcript;
          } else {
            interimTranscript += item.transcript;
          }
        }
      }

      // Voice reactive amplitude bump
      if (onAudioLevel) {
        const bump = Math.min(1.0, 0.4 + (interimTranscript.length % 5) * 0.12);
        onAudioLevel(bump);
      }

      if (finalTranscript.trim()) {
        onResult(finalTranscript.trim(), true);
      } else if (interimTranscript.trim()) {
        onResult(interimTranscript.trim(), false);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false;
      this.stopSynthesizedAudioMeter();

      let friendlyMsg = event.error;
      if (event.error === 'not-allowed') {
        friendlyMsg = 'Microphone permission was denied. Please allow microphone access in your browser.';
      } else if (event.error === 'no-speech') {
        friendlyMsg = 'no-speech';
      } else if (event.error === 'audio-capture') {
        friendlyMsg = 'No microphone device was detected.';
      }

      onError?.(friendlyMsg);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.stopSynthesizedAudioMeter();
      onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (err: any) {
      this.isListening = false;
      this.stopSynthesizedAudioMeter();
      onError?.(err?.message || 'Could not start microphone');
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
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
      step += 0.2;
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
   * Text-to-Speech (TTS)
   * Resolves Chromium cancel-speak race condition, garbage collection bugs, and voice selection.
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
      if (!this.isSynthesisSupported()) {
        resolve();
        return;
      }

      if (this.speechDispatchTimeout) {
        clearTimeout(this.speechDispatchTimeout);
        this.speechDispatchTimeout = null;
      }

      // Cancel prior speech
      window.speechSynthesis.cancel();
      if (this.ttsResumeWatchdog) {
        clearInterval(this.ttsResumeWatchdog);
        this.ttsResumeWatchdog = null;
      }

      const cleanText = cleanForTTS(text);
      if (!cleanText) {
        resolve();
        return;
      }

      // Delay by 60ms to avoid Chromium's cancel-speak cancellation bug
      this.speechDispatchTimeout = setTimeout(() => {
        try {
          window.speechSynthesis.resume();
        } catch (e) {
          // ignore
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = Math.max(0.7, Math.min(1.5, rate));
        utterance.pitch = Math.max(0.7, Math.min(1.3, pitch));

        // Detect if text or langHint indicates Hindi
        const isHindiText =
          /[\u0900-\u097F]/.test(cleanText) ||
          (langHint && (langHint.toLowerCase().startsWith('hi') || langHint.toLowerCase().includes('hindi')));

        const allVoices = window.speechSynthesis.getVoices();
        let chosenVoice: SpeechSynthesisVoice | null = null;

        if (preferredVoiceURI) {
          chosenVoice = allVoices.find((v) => v.voiceURI === preferredVoiceURI) || null;
        }

        if (!chosenVoice) {
          if (isHindiText) {
            // Priority 1: Native Hindi voice
            chosenVoice =
              allVoices.find(
                (v) =>
                  v.lang.toLowerCase().startsWith('hi') ||
                  v.name.toLowerCase().includes('hindi') ||
                  v.name.includes('हिन्दी') ||
                  v.name.toLowerCase().includes('lekha') ||
                  v.name.toLowerCase().includes('kalpana')
              ) ||
              // Priority 2: Indian English voice (great for Hinglish)
              allVoices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
              null;
            utterance.lang = 'hi-IN';
          } else {
            // Priority 1: British male / Jarvis-like
            chosenVoice =
              allVoices.find(
                (v) =>
                  v.lang.toLowerCase().startsWith('en-gb') &&
                  (v.name.toLowerCase().includes('male') ||
                    v.name.toLowerCase().includes('george') ||
                    v.name.toLowerCase().includes('daniel') ||
                    v.name.toLowerCase().includes('oliver'))
              ) ||
              allVoices.find((v) => v.lang.toLowerCase().startsWith('en-gb')) ||
              allVoices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
              allVoices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ||
              allVoices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
              null;
            utterance.lang = 'en-US';
          }
        }

        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }

        // Persist global reference so Chrome doesn't garbage collect mid-speech
        window.__jarvis_active_utterance = utterance;

        const cleanup = () => {
          window.__jarvis_active_utterance = null;
          if (this.ttsResumeWatchdog) {
            clearInterval(this.ttsResumeWatchdog);
            this.ttsResumeWatchdog = null;
          }
        };

        utterance.onstart = () => {
          onStart?.();

          // Chrome speech pause bug workaround: periodically pulse resume
          this.ttsResumeWatchdog = setInterval(() => {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          }, 2500);
        };

        utterance.onend = () => {
          cleanup();
          onEnd?.();
          resolve();
        };

        utterance.onerror = (e) => {
          cleanup();
          console.warn('SpeechSynthesis event error:', e);
          onError?.(e);
          resolve();
        };

        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          cleanup();
          console.warn('SpeechSynthesis speak failed:', err);
          onError?.(err);
          resolve();
        }
      }, 60);
    });
  }

  public stopSpeaking() {
    if (this.speechDispatchTimeout) {
      clearTimeout(this.speechDispatchTimeout);
      this.speechDispatchTimeout = null;
    }
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
      window.__jarvis_active_utterance = null;
      if (this.ttsResumeWatchdog) {
        clearInterval(this.ttsResumeWatchdog);
        this.ttsResumeWatchdog = null;
      }
    }
  }
}

export const speechEngine = new JarvisSpeechEngine();
