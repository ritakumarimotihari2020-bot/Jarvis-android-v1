/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HudHeader } from './components/HudHeader';
import { JarvisCore, CoreState } from './components/JarvisCore';
import { TelemetryPanel } from './components/TelemetryPanel';
import { ChatConsole, ChatMessage } from './components/ChatConsole';
import { SettingsModal } from './components/SettingsModal';
import { UpgradeCenter } from './components/UpgradeCenter';
import { AutonomousDesignStudio } from './components/AutonomousDesignStudio';
import { upgradeManager, SystemUpgrade } from './utils/upgradeSystem';
import { JarvisTheme, themeManager } from './utils/themeSystem';
import { speechEngine } from './utils/speech';
import {
  playWakeChime,
  playMicStart,
  playMicStop,
  playResponseChime,
  playClick,
  playAlert,
  setSoundMuted,
  unlockAudio,
} from './utils/soundEffects';
import { Activity, Terminal, Radio, Palette } from 'lucide-react';

const STORAGE_KEY_MESSAGES = 'jarvis_chat_history_v1';
const STORAGE_KEY_CONFIG = 'jarvis_config_v1';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'jarvis-welcome-1',
  sender: 'jarvis',
  text: 'J.A.R.V.I.S. Mark VII online. Good day, sir. All neural heuristics and vocal synthesizers are operational in both English and Hindi. How may I assist you today?\n\n(सर, जार्विस ऑनलाइन है। आप मुझसे हिंदी या अंग्रेजी में बात कर सकते हैं।)',
  speechText: 'Jarvis online. Good day, sir. All systems operational. How may I assist you today?',
  language: 'en-US',
  timestamp: new Date().toISOString(),
  isProtocol: true,
};

export default function App() {
  // Assistant States
  const [isAwake, setIsAwake] = useState<boolean>(true);
  const [coreState, setCoreState] = useState<CoreState>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [languageMode, setLanguageMode] = useState<'auto' | 'en' | 'hi'>('auto');

  // Messages & Memory
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [INITIAL_WELCOME_MESSAGE];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load chat history:', e);
    }
    return [INITIAL_WELCOME_MESSAGE];
  });

  // Speech & Voice State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);

  // Settings
  const [soundMuted, setMutedState] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [voicePitch, setVoicePitch] = useState<number>(1.0);
  const [voiceRate, setVoiceRate] = useState<number>(1.0);
  const [preferredVoiceURI, setPreferredVoiceURI] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isUpgradeCenterOpen, setIsUpgradeCenterOpen] = useState<boolean>(false);
  const [isDesignStudioOpen, setIsDesignStudioOpen] = useState<boolean>(false);
  const [activeTheme, setActiveTheme] = useState<JarvisTheme>(() => themeManager.getActiveTheme());
  const [upgradeCenterTab, setUpgradeCenterTab] = useState<'available' | 'files' | 'health' | 'history' | 'memory' | 'bugs'>('available');
  const [availableUpgradesCount, setAvailableUpgradesCount] = useState<number>(() =>
    upgradeManager.getAvailableUpgrades().filter((u) => u.status === 'available').length
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Apply theme tokens immediately on mount
  useEffect(() => {
    themeManager.applyTheme(activeTheme, false);
  }, []);

  // Mobile Tabs
  const [mobileTab, setMobileTab] = useState<'core' | 'console' | 'telemetry'>('core');

  // Sync settings with localStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (savedConfig) {
        const cfg = JSON.parse(savedConfig);
        if (typeof cfg.soundMuted === 'boolean') {
          setMutedState(cfg.soundMuted);
          setSoundMuted(cfg.soundMuted);
        }
        if (typeof cfg.autoSpeak === 'boolean') setAutoSpeak(cfg.autoSpeak);
        if (typeof cfg.voicePitch === 'number') setVoicePitch(cfg.voicePitch);
        if (typeof cfg.voiceRate === 'number') setVoiceRate(cfg.voiceRate);
        if (typeof cfg.preferredVoiceURI === 'string') setPreferredVoiceURI(cfg.preferredVoiceURI);
        if (cfg.languageMode) setLanguageMode(cfg.languageMode);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to persist chat history:', e);
    }
  }, [messages]);

  // Save config
  const saveConfig = useCallback(
    (key: string, val: any) => {
      try {
        const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
        const cfg = savedConfig ? JSON.parse(savedConfig) : {};
        cfg[key] = val;
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(cfg));
      } catch (e) {
        // ignore
      }
    },
    []
  );

  // Core State Sync
  useEffect(() => {
    if (!isAwake) {
      setCoreState('standby');
      return;
    }
    if (isListening) {
      setCoreState('listening');
    } else if (isThinking) {
      setCoreState('thinking');
    } else if (isSpeaking) {
      setCoreState('speaking');
    } else {
      setCoreState('idle');
    }
  }, [isAwake, isListening, isThinking, isSpeaking]);

  // Speak a message
  const handleSpeak = useCallback(
    (text: string, langHint?: string, msgId?: string) => {
      if (!text || !isAwake) return;

      unlockAudio();
      setIsSpeaking(true);
      setActiveSpeakingId(msgId || null);

      speechEngine
        .speak({
          text,
          preferredVoiceURI,
          pitch: voicePitch,
          rate: voiceRate,
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            setIsSpeaking(false);
            setActiveSpeakingId(null);
          },
          onError: () => {
            setIsSpeaking(false);
            setActiveSpeakingId(null);
          },
        })
        .catch(() => {
          setIsSpeaking(false);
          setActiveSpeakingId(null);
        });
    },
    [isAwake, preferredVoiceURI, voicePitch, voiceRate]
  );

  const handleStopSpeaking = useCallback(() => {
    speechEngine.stopSpeaking();
    setIsSpeaking(false);
    setActiveSpeakingId(null);
  }, []);

  // Quick sound and speech verification
  const handleTestVoiceSound = useCallback(() => {
    unlockAudio();
    playWakeChime();
    const testText =
      languageMode === 'hi'
        ? 'नमस्ते सर। जार्विस वाणी एवं ध्वनि प्रणालियां पूर्ण रूप से सक्रिय हैं।'
        : 'J.A.R.V.I.S. speech synthesis and cybernetic sound effects operational, sir.';
    handleSpeak(testText, languageMode === 'hi' ? 'hi-IN' : 'en-US');
  }, [languageMode, handleSpeak]);

  // Send message to Gemini server-side proxy
  const handleSendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      // Make sure Jarvis is awake
      if (!isAwake) {
        setIsAwake(true);
        playWakeChime();
      }

      setErrorMessage(null);
      handleStopSpeaking();

      const userMsgId = 'user-' + Date.now();
      const userMessage: ChatMessage = {
        id: userMsgId,
        sender: 'user',
        text: userInput,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Check for autonomous design studio triggers
      const lowerInput = userInput.toLowerCase();
      if (
        lowerInput.includes('design') ||
        lowerInput.includes('डिज़ाइन') ||
        lowerInput.includes('theme') ||
        lowerInput.includes('थीम') ||
        lowerInput.includes('नया लुक')
      ) {
        setIsDesignStudioOpen(true);
      }

      setIsThinking(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userInput,
            history: messages.slice(-8),
            languageMode: languageMode,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Server connection error');
        }

        const jarvisMsgId = 'jarvis-' + Date.now();
        const jarvisMessage: ChatMessage = {
          id: jarvisMsgId,
          sender: 'jarvis',
          text: data.reply || 'Acknowledged, sir.',
          speechText: data.speechText || data.reply,
          language: data.language || 'en-US',
          timestamp: data.timestamp || new Date().toISOString(),
        };

        setMessages((prev) => [...prev, jarvisMessage]);
        playResponseChime();

        if (autoSpeak && data.speechText) {
          handleSpeak(data.speechText, data.language, jarvisMsgId);
        }
      } catch (err: any) {
        console.error('Chat error:', err);
        playAlert();
        setErrorMessage(err?.message || 'Neural network latency error');

        const fallbackId = 'jarvis-err-' + Date.now();
        const fallbackMessage: ChatMessage = {
          id: fallbackId,
          sender: 'jarvis',
          text: `My apologies, sir. There was an unexpected disruption in my neural processing link: ${
            err?.message || 'Connection lost'
          }. Please check that the server is online.`,
          speechText: 'My apologies, sir. An error occurred in my neural processing core.',
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, fallbackMessage]);
        if (autoSpeak) {
          handleSpeak(fallbackMessage.speechText!, 'en-US', fallbackId);
        }
      } finally {
        setIsThinking(false);
      }
    },
    [isAwake, messages, languageMode, autoSpeak, handleSpeak, handleStopSpeaking]
  );

  // Toggle Voice Recognition
  const handleToggleMic = useCallback(() => {
    unlockAudio();

    if (!isAwake) {
      setIsAwake(true);
      playWakeChime();
    }

    if (isListening) {
      speechEngine.stopListening();
      setIsListening(false);
      setInterimTranscript('');
      playMicStop();
      return;
    }

    handleStopSpeaking();
    playMicStart();
    setIsListening(true);
    setInterimTranscript('');

    const targetLang = languageMode === 'hi' ? 'hi-IN' : 'en-US';

    speechEngine.startListening({
      lang: targetLang,
      onStart: () => {
        setIsListening(true);
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
      onResult: (transcript, isFinal) => {
        setInterimTranscript(transcript);
        if (isFinal) {
          setIsListening(false);
          setInterimTranscript('');
          playMicStop();
          handleSendMessage(transcript);
        }
      },
      onError: (err) => {
        console.warn('Speech error:', err);
        setIsListening(false);
        setInterimTranscript('');
        playMicStop();
        if (err !== 'no-speech') {
          setErrorMessage(err);
        }
      },
      onEnd: () => {
        setIsListening(false);
        setInterimTranscript('');
      },
    });
  }, [isAwake, isListening, languageMode, handleStopSpeaking, handleSendMessage]);

  // Toggle Wake / Standby
  const handleToggleWake = useCallback(() => {
    playClick();
    if (isAwake) {
      // Put to standby
      setIsAwake(false);
      handleStopSpeaking();
      if (isListening) {
        speechEngine.stopListening();
        setIsListening(false);
      }
      playAlert();
    } else {
      // Wake Up
      setIsAwake(true);
      playWakeChime();
      if (autoSpeak) {
        handleSpeak('J.A.R.V.I.S. online. All systems nominal, sir.', 'en-US');
      }
    }
  }, [isAwake, isListening, autoSpeak, handleSpeak, handleStopSpeaking]);

  // Run Protocol
  const handleRunProtocol = useCallback(
    async (protocol: string, title: string) => {
      if (!isAwake) {
        setIsAwake(true);
        playWakeChime();
      }

      handleStopSpeaking();
      setIsThinking(true);

      try {
        const response = await fetch('/api/protocol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protocol }),
        });

        const data = await response.json();
        const jarvisMsgId = 'jarvis-proto-' + Date.now();

        const protocolMessage: ChatMessage = {
          id: jarvisMsgId,
          sender: 'jarvis',
          text: `[${data.title}]\n${data.action}\n\nTelemetry: ${JSON.stringify(
            data.telemetry,
            null,
            2
          )}`,
          speechText: data.speechText,
          language: protocol === 'hindi_intro' ? 'hi-IN' : 'en-US',
          timestamp: data.timestamp || new Date().toISOString(),
          isProtocol: true,
        };

        setMessages((prev) => [...prev, protocolMessage]);
        playResponseChime();

        if (autoSpeak && data.speechText) {
          handleSpeak(data.speechText, protocolMessage.language, jarvisMsgId);
        }
      } catch (err: any) {
        setErrorMessage('Failed to trigger protocol: ' + err.message);
      } finally {
        setIsThinking(false);
      }
    },
    [isAwake, autoSpeak, handleSpeak, handleStopSpeaking]
  );

  // Settings Handlers
  const handleToggleSound = useCallback(() => {
    const nextVal = !soundMuted;
    setMutedState(nextVal);
    setSoundMuted(nextVal);
    saveConfig('soundMuted', nextVal);
  }, [soundMuted, saveConfig]);

  const handleToggleAutoSpeak = useCallback(() => {
    const nextVal = !autoSpeak;
    setAutoSpeak(nextVal);
    saveConfig('autoSpeak', nextVal);
    playClick();
  }, [autoSpeak, saveConfig]);

  const handleLanguageChange = useCallback(
    (mode: 'auto' | 'en' | 'hi') => {
      setLanguageMode(mode);
      saveConfig('languageMode', mode);
      playClick();
    },
    [saveConfig]
  );

  const handleClearHistory = useCallback(() => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    try {
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
    } catch (e) {
      // ignore
    }
  }, []);

  const handleClearAllData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
      localStorage.removeItem(STORAGE_KEY_CONFIG);
    } catch (e) {
      // ignore
    }
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setLanguageMode('auto');
    setAutoSpeak(true);
    setMutedState(false);
    setSoundMuted(false);
    setVoicePitch(1.0);
    setVoiceRate(1.0);
    setPreferredVoiceURI('');
  }, []);

  return (
    <div
      style={{ backgroundColor: activeTheme.bgTone }}
      className={`min-h-screen text-slate-100 flex flex-col relative overflow-x-hidden ${activeTheme.gridStyle} hud-scanlines selection:bg-cyan-500/30 selection:text-cyan-200`}
    >
      {/* Top Futuristic HUD Header */}
      <HudHeader
        isAwake={isAwake}
        languageMode={languageMode}
        onLanguageChange={handleLanguageChange}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={handleToggleAutoSpeak}
        onTestVoice={handleTestVoiceSound}
        onOpenDesignStudio={() => {
          playClick();
          setIsDesignStudioOpen(true);
        }}
        onOpenUpgradeCenter={() => {
          playClick();
          setUpgradeCenterTab('available');
          setIsUpgradeCenterOpen(true);
        }}
        availableUpgradesCount={availableUpgradesCount}
        onOpenSettings={() => {
          playClick();
          setIsSettingsOpen(true);
        }}
      />

      {/* Mobile Navigation Tabs (visible only on small screens) */}
      <div className="lg:hidden flex items-center justify-around bg-slate-950/90 border-b border-cyan-500/20 px-2 py-2 sticky top-[49px] z-20 backdrop-blur-md overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            playClick();
            setMobileTab('core');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron transition-all shrink-0 ${
            mobileTab === 'core'
              ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 shadow-cyan-500/20 shadow-sm'
              : 'text-slate-400 hover:text-cyan-300'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          HOLO CORE
        </button>
        <button
          onClick={() => {
            playClick();
            setMobileTab('console');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron transition-all shrink-0 ${
            mobileTab === 'console'
              ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 shadow-cyan-500/20 shadow-sm'
              : 'text-slate-400 hover:text-cyan-300'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          TERMINAL
        </button>
        <button
          onClick={() => {
            playClick();
            setMobileTab('telemetry');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron transition-all shrink-0 ${
            mobileTab === 'telemetry'
              ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 shadow-cyan-500/20 shadow-sm'
              : 'text-slate-400 hover:text-cyan-300'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          PROTOCOLS
        </button>
        <button
          onClick={() => {
            playClick();
            setIsDesignStudioOpen(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-orbitron text-cyan-200 bg-cyan-950/60 border border-cyan-400/50 shrink-0"
        >
          <Palette className="w-3.5 h-3.5 text-cyan-300" />
          DESIGN
        </button>
        <button
          onClick={() => {
            playClick();
            setUpgradeCenterTab('available');
            setIsUpgradeCenterOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron text-cyan-300 bg-cyan-950/60 border border-cyan-400/50 shrink-0"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          UPGRADE
        </button>
      </div>

      {/* Main Command Center Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Diagnostics & Stark Protocols (Desktop 3 cols) */}
        <aside
          className={`lg:col-span-3 w-full ${
            mobileTab === 'telemetry' ? 'block' : 'hidden lg:block'
          }`}
        >
          <TelemetryPanel
            onRunProtocol={handleRunProtocol}
            onOpenFileModifier={() => {
              playClick();
              setUpgradeCenterTab('files');
              setIsUpgradeCenterOpen(true);
            }}
            onOpenDesignStudio={() => {
              playClick();
              setIsDesignStudioOpen(true);
            }}
            disabled={!isAwake}
          />
        </aside>

        {/* Center Column: Holographic Circular Core (Desktop 4 cols) */}
        <section
          className={`lg:col-span-4 flex flex-col items-center justify-center w-full min-h-[420px] ${
            mobileTab === 'core' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <JarvisCore
            state={coreState}
            audioLevel={audioLevel}
            isAwake={isAwake}
            onToggleWake={handleToggleWake}
            onToggleMic={handleToggleMic}
            isListening={isListening}
            isSpeaking={isSpeaking}
            languageMode={languageMode}
            theme={activeTheme}
          />
        </section>

        {/* Right Column: Chat Console & Terminal (Desktop 5 cols) */}
        <section
          className={`lg:col-span-5 w-full h-[620px] ${
            mobileTab === 'console' ? 'block' : 'hidden lg:block'
          }`}
        >
          <ChatConsole
            messages={messages}
            onSendMessage={handleSendMessage}
            isThinking={isThinking}
            isListening={isListening}
            onToggleMic={handleToggleMic}
            interimTranscript={interimTranscript}
            onSpeakMessage={(text, lang) => handleSpeak(text, lang)}
            isSpeaking={isSpeaking}
            onStopSpeaking={handleStopSpeaking}
            onClearHistory={handleClearHistory}
            activeSpeakingId={activeSpeakingId}
            errorMessage={errorMessage}
            onDismissError={() => setErrorMessage(null)}
            languageMode={languageMode}
            onLanguageChange={handleLanguageChange}
            onTestVoice={handleTestVoiceSound}
          />
        </section>
      </main>

      {/* Bottom Stark Footer Banner */}
      <footer className="w-full bg-[#030712]/90 border-t border-cyan-500/15 py-2 px-4 text-center z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-[11px] font-tech text-cyan-400/50">
          <div>STARK TELECOMMUNICATIONS // SECURE ENCRYPTED CHANNEL</div>
          <div className="flex items-center gap-3">
            <span>GEMINI 3.8 FLASH UPLINK</span>
            <span>•</span>
            <span>DUAL VOICE HINDI & ENGLISH</span>
            <span>•</span>
            <span className="text-cyan-300">v7.4.2</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        voicePitch={voicePitch}
        onPitchChange={(v) => {
          setVoicePitch(v);
          saveConfig('voicePitch', v);
        }}
        voiceRate={voiceRate}
        onRateChange={(v) => {
          setVoiceRate(v);
          saveConfig('voiceRate', v);
        }}
        preferredVoiceURI={preferredVoiceURI}
        onVoiceChange={(uri) => {
          setPreferredVoiceURI(uri);
          saveConfig('preferredVoiceURI', uri);
        }}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={handleToggleAutoSpeak}
        onClearAllData={handleClearAllData}
      />

      {/* Advanced Self-Upgrade Center Modal */}
      <UpgradeCenter
        isOpen={isUpgradeCenterOpen}
        initialTab={upgradeCenterTab}
        onClose={() => setIsUpgradeCenterOpen(false)}
        onUpgradeApplied={(patch: SystemUpgrade) => {
          setAvailableUpgradesCount(
            upgradeManager.getAvailableUpgrades().filter((u) => u.status === 'available').length
          );
          const msg: ChatMessage = {
            id: 'jarvis-upgrade-' + Date.now(),
            sender: 'jarvis',
            text: `[SYSTEM UPGRADE APPLIED: ${patch.version}]\nPatch: ${patch.title}\nCategory: ${patch.category.toUpperCase()}\nStatus: Active & Verified.\n\nAll operational benchmarks elevated, sir.`,
            speechText: `System upgrade ${patch.version} has been verified and deployed under your authorization, sir.`,
            timestamp: new Date().toISOString(),
            isProtocol: true,
          };
          setMessages((prev) => [...prev, msg]);
        }}
        onRollbackExecuted={(version: string) => {
          setAvailableUpgradesCount(
            upgradeManager.getAvailableUpgrades().filter((u) => u.status === 'available').length
          );
          const msg: ChatMessage = {
            id: 'jarvis-rollback-' + Date.now(),
            sender: 'jarvis',
            text: `[ROLLBACK EXECUTED]\nRestored to working snapshot: ${version}\nAll telemetry parameters stabilized.`,
            speechText: `Rollback completed. Restored to snapshot ${version}, sir.`,
            timestamp: new Date().toISOString(),
            isProtocol: true,
          };
          setMessages((prev) => [...prev, msg]);
        }}
        onFileModified={(fileName: string) => {
          const msg: ChatMessage = {
            id: 'jarvis-filemod-' + Date.now(),
            sender: 'jarvis',
            text: `[AUTONOMOUS FILE MODIFIED: ${fileName}]\nStatus: Successfully updated on disk.\nPre-write backup preserved. Dynamic protocols updated.`,
            speechText: `Sir, I have successfully updated the file ${fileName} on disk according to your directive.`,
            timestamp: new Date().toISOString(),
            isProtocol: true,
          };
          setMessages((prev) => [...prev, msg]);
        }}
        onSpeak={(text) => handleSpeak(text)}
      />

      {/* Autonomous Design Studio Modal / Live Preview Drawer */}
      <AutonomousDesignStudio
        isOpen={isDesignStudioOpen}
        onClose={() => setIsDesignStudioOpen(false)}
        currentTheme={activeTheme}
        onThemeApplied={(newTheme) => {
          setActiveTheme(newTheme);
          const msg: ChatMessage = {
            id: 'jarvis-design-' + Date.now(),
            sender: 'jarvis',
            text: `[VISUAL ARCHITECTURE RECONFIGURED: ${newTheme.name}]\nCodename: ${newTheme.codename}\nCore Geometry: ${newTheme.coreGeometry.toUpperCase()}\nStatus: Deployed under explicit user authorization.\n\nAll HUD optics and core resonance adjusted to match chromatic specification.`,
            speechText: `Sir, visual architecture has been reconfigured to ${newTheme.name} under your authorization.`,
            timestamp: new Date().toISOString(),
            isProtocol: true,
          };
          setMessages((prev) => [...prev, msg]);
        }}
        onRollbackExecuted={(restoredTheme) => {
          setActiveTheme(restoredTheme);
          const msg: ChatMessage = {
            id: 'jarvis-design-rollback-' + Date.now(),
            sender: 'jarvis',
            text: `[DESIGN ROLLBACK EXECUTED]\nRestored Look: ${restoredTheme.name}\nStatus: Prior visual snapshot reinstated.`,
            speechText: `Design rollback completed. Restored to ${restoredTheme.name}, sir.`,
            timestamp: new Date().toISOString(),
            isProtocol: true,
          };
          setMessages((prev) => [...prev, msg]);
        }}
        onSpeak={(text) => handleSpeak(text)}
      />
    </div>
  );
}
