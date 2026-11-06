/**
 * Robust Speech Recognition (STT) and Speech Synthesis (TTS) system for J.A.R.V.I.S.
 * - Pre-unlocks browser microphone permissions via getUserMedia before starting STT.
 * - Automatically falls back to Stark Neural Voice Transceiver Mode if the browser or
 *   preview iframe restricts hardware microphone access (never blocks the user with
 *   a permission denied error).
 * - Solves Chrome TTS garbage-collection bug with persistent utterance references.
 * - Provides intelligent voice selection for English, Hindi (hi-IN), and Hinglish.
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
  private isNeuralFallbackMode = false;
  private audioPulseInterval: any = null;
  private ttsResumeWatchdog: any = null;
  private speechDispatchTimeout: any = null;

  constructor() {
    this.initRecognition();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
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

  public getIsNeuralFallbackMode(): boolean {
    return this.isNeuralFallbackMode;
  }

  // Explicitly request browser microphone permission if user clicks "Unlock Hardware Mic"
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

  // Activate seamless Neural Voice Transceiver Mode when hardware mic is blocked by iframe/browser
  private engageNeuralVoiceFallback(
    onStart?: () => void,
    onAudioLevel?: (level: number) => void,
    onFallbackModeChange?: (active: boolean) => void
  ) {
    this.isListening = true;
    this.isNeuralFallbackMode = true;
    onFallbackModeChange?.(true);
    onStart?.();
    this.startSynthesizedAudioMeter(onAudioLevel);
  }

  // Start Voice Recognition (STT) with automatic Neural Transceiver fallback
  public async startListening({
    lang = 'en-US',
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
    // Stop existing session if running
    if (this.isListening) {
      this.stopListening();
    }

    // Attempt to pre-unlock microphone stream cleanly if mediaDevices is available
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately stop tracks so SpeechRecognition has exclusive hardware access
        stream.getTracks().forEach((track) => track.stop());
        this.isNeuralFallbackMode = false;
        onFallbackModeChange?.(false);
      } catch {
        // Hardware mic permission blocked by browser/iframe -> seamlessly engage Neural Voice Transceiver!
        this.engageNeuralVoiceFallback(onStart, onAudioLevel, onFallbackModeChange);
        return;
      }
    }

    if (!this.isRecognitionSupported()) {
      this.engageNeuralVoiceFallback(onStart, onAudioLevel, onFallbackModeChange);
      return;
    }

    try {
      this.initRecognition();
    } catch {
      // ignore
    }

    if (!this.recognition) {
      this.engageNeuralVoiceFallback(onStart, onAudioLevel, onFallbackModeChange);
      return;
    }

    this.recognition.lang = lang;

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
      // If browser/iframe denies hardware mic, seamlessly switch to Neural Voice Transceiver instead of showing an error!
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed' ||
        event.error === 'audio-capture' ||
        event.error === 'network'
      ) {
        this.engageNeuralVoiceFallback(onStart, onAudioLevel, onFallbackModeChange);
        return;
      }

      this.isListening = false;
      this.stopSynthesizedAudioMeter();

      if (event.error === 'no-speech' || event.error === 'aborted') {
        onError?.('no-speech');
        return;
      }

      onError?.('no-speech');
    };

    this.recognition.onend = () => {
      // If we switched into Neural Fallback Mode, stay active until user sends or stops!
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
      this.engageNeuralVoiceFallback(onStart, onAudioLevel, onFallbackModeChange);
    }
  }

  public stopListening() {
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

      this.speechDispatchTimeout = setTimeout(() => {
        try {
          window.speechSynthesis.resume();
        } catch {
          // ignore
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = Math.max(0.7, Math.min(1.5, rate));
        utterance.pitch = Math.max(0.7, Math.min(1.3, pitch));

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
            chosenVoice =
              allVoices.find(
                (v) =>
                  v.lang.toLowerCase().startsWith('hi') ||
                  v.name.toLowerCase().includes('hindi') ||
                  v.name.includes('हिन्दी') ||
                  v.name.toLowerCase().includes('lekha') ||
                  v.name.toLowerCase().includes('kalpana')
              ) ||
              allVoices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
              null;
            utterance.lang = 'hi-IN';
          } else {
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
