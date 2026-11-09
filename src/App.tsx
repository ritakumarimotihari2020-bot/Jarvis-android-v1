// Rebuild Android APK with configured remote JARVIS API URL
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
import { DeviceControlCenter } from './components/DeviceControlCenter';
import { OwnerSecurityDashboard } from './components/OwnerSecurityDashboard';
import { AdminUpdatePanel } from './components/AdminUpdatePanel';
import { WorkspaceHub } from './components/WorkspaceHub';
import { PersonalAccountsDashboard } from './components/PersonalAccountsDashboard';
import { MinecraftControlCenter } from './components/MinecraftControlCenter';
import { ComputerControlCenter } from './components/ComputerControlCenter';
import { FileModifierPanel } from './components/FileModifierPanel';
import { VersionStatusPayload, formatExactSystemTimestamp } from './utils/versionManager';
import { ownerAuthManager } from './utils/ownerAuth';
import { deviceBridge } from './utils/deviceBridge';
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
import {
  Activity,
  Terminal,
  Radio,
  Palette,
  Cpu,
  Rocket,
  Sparkles,
  Clock,
  Gamepad2,
  Mail,
  KeyRound,
  Monitor,
  FolderOpen,
} from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_JARVIS_API_URL || '').replace(/\/+$/, '');
const STORAGE_KEY_MESSAGES = 'jarvis_chat_history_v1';
const STORAGE_KEY_CONFIG = 'jarvis_config_v1';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'jarvis-welcome-1',
  sender: 'jarvis',
  text: 'J.A.R.V.I.S. Mark VII online. Good day, sir. All neural heuristics, autonomous self-upgrade protocols, app source file editors, and full device hardware controls are operational in both English and Hindi. How may I assist you today?\n\n(सर, जार्विस ऑनलाइन है। पूरा डिवाइस कंट्रोल, सेल्फ-अपग्रेड और ऐप फ़ाइल एडिटर आपकी सेवा में तैयार हैं।)',
  speechText: 'Jarvis online. Good day, sir. All systems, autonomous self-upgrade, and full device controls are operational.',
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

  // Settings & Modals
  const [soundMuted, setMutedState] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [voicePitch, setVoicePitch] = useState<number>(1.0);
  const [voiceRate, setVoiceRate] = useState<number>(1.0);
  const [preferredVoiceURI, setPreferredVoiceURI] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isUpgradeCenterOpen, setIsUpgradeCenterOpen] = useState<boolean>(false);
  const [isDesignStudioOpen, setIsDesignStudioOpen] = useState<boolean>(false);
  const [isDeviceControlOpen, setIsDeviceControlOpen] = useState<boolean>(false);
  const [isSecurityDashboardOpen, setIsSecurityDashboardOpen] = useState<boolean>(false);
  const [isAdminUpdatePanelOpen, setIsAdminUpdatePanelOpen] = useState<boolean>(false);
  const [isWorkspaceHubOpen, setIsWorkspaceHubOpen] = useState<boolean>(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState<boolean>(false);
  const [isMinecraftOpen, setIsMinecraftOpen] = useState<boolean>(false);
  const [isComputerControlOpen, setIsComputerControlOpen] = useState<boolean>(false);
  const [isFileModifierOpen, setIsFileModifierOpen] = useState<boolean>(false);
  const [versionStatus, setVersionStatus] = useState<VersionStatusPayload | null>(null);
  const [isInstallingStagedUpdate, setIsInstallingStagedUpdate] = useState<boolean>(false);
  const clientLoadedVersionRef = useRef<string>('');
  const [brightnessLevel, setBrightnessLevel] = useState<number>(100);
  const [activeTheme, setActiveTheme] = useState<JarvisTheme>(() => themeManager.getActiveTheme());
  const [upgradeCenterTab, setUpgradeCenterTab] = useState<'available' | 'files' | 'health' | 'history' | 'memory' | 'bugs'>('available');
  const [availableUpgradesCount, setAvailableUpgradesCount] = useState<number>(() =>
    upgradeManager.getAvailableUpgrades().filter((u) => u.status === 'available').length
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch live Version Status & Real System Timestamps
  const fetchVersionStatus = useCallback(async () => {
    try {
      const query = clientLoadedVersionRef.current
        ? `?clientVersion=${encodeURIComponent(clientLoadedVersionRef.current)}`
        : '';
      const res = await fetch(`${API_BASE_URL}/api/version/status${query}`);
      const data: VersionStatusPayload = await res.json();
      if (data && data.currentVersion) {
        if (!clientLoadedVersionRef.current) {
          clientLoadedVersionRef.current = data.currentVersion;
        }
        setVersionStatus(data);
      }
    } catch (err) {
      // silent retry on next poll
    }
  }, []);

  useEffect(() => {
    fetchVersionStatus();
    const poll = setInterval(fetchVersionStatus, 12000);
    return () => clearInterval(poll);
  }, [fetchVersionStatus]);

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
          langHint,
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

  // Send message to JARVIS self-hosted AI server
  const handleSendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      // Make sure Jarvis is awake
      if (!isAwake) {
        setIsAwake(true);
        playWakeChime();
      }

      if (isListening) {
        speechEngine.stopListening();
        setIsListening(false);
        setInterimTranscript('');
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

      // Check for autonomous subsystem triggers via voice or text
      const lowerInput = userInput.toLowerCase();
      const parsedDevice = deviceBridge.parseDeviceDirective(userInput);
      if (parsedDevice.isDeviceCommand) {
        if (parsedDevice.action === 'OPEN_APP' && parsedDevice.targetItem) {
          deviceBridge.launchAndroidApp(parsedDevice.targetItem);
        } else if (parsedDevice.action === 'FLASHLIGHT_ON') {
          deviceBridge.toggleFlashlight(true);
        } else if (parsedDevice.action === 'FLASHLIGHT_OFF') {
          deviceBridge.toggleFlashlight(false);
        } else if (parsedDevice.action === 'OPEN_WIN_APP' && parsedDevice.targetItem) {
          deviceBridge.executeWindowsCommand('launch_app', parsedDevice.targetItem);
        }
        if (parsedDevice.action !== 'OPEN_APP') setIsDeviceControlOpen(true);
      } else if (
        lowerInput.includes('security') ||
        lowerInput.includes('authenticate') ||
        lowerInput.includes('owner') ||
        lowerInput.includes('मालिक') ||
        lowerInput.includes('सुरक्षा')
      ) {
        setIsSecurityDashboardOpen(true);
      } else if (
        lowerInput.includes('design') ||
        lowerInput.includes('डिज़ाइन') ||
        lowerInput.includes('theme') ||
        lowerInput.includes('थीम') ||
        lowerInput.includes('नया लुक')
      ) {
        setIsDesignStudioOpen(true);
      } else if (
        lowerInput.includes('device') ||
        lowerInput.includes('डिवाइस') ||
        lowerInput.includes('hardware') ||
        lowerInput.includes('battery') ||
        lowerInput.includes('बैटरी') ||
        lowerInput.includes('कैमरा') ||
        lowerInput.includes('camera') ||
        lowerInput.includes('laptop') ||
        lowerInput.includes('windows') ||
        lowerInput.includes('android') ||
        lowerInput.includes('पूरे डिवाइस')
      ) {
        setIsDeviceControlOpen(true);
      } else if (
        lowerInput.includes('gmail') ||
        lowerInput.includes('email') ||
        lowerInput.includes('inbox') ||
        lowerInput.includes('calendar') ||
        lowerInput.includes('drive') ||
        lowerInput.includes('contacts') ||
        lowerInput.includes('ईमेल') ||
        lowerInput.includes('कैलेंडर')
      ) {
        setIsWorkspaceHubOpen(true);
      } else if (
        lowerInput.includes('minecraft') ||
        lowerInput.includes('bedrock') ||
        lowerInput.includes('geyser') ||
        lowerInput.includes('rcon') ||
        lowerInput.includes('माइनक्राफ्ट') ||
        lowerInput.includes('gaming')
      ) {
        setIsMinecraftOpen(true);
      } else if (
        lowerInput.includes('account') ||
        lowerInput.includes('vault') ||
        lowerInput.includes('खाता') ||
        lowerInput.includes('oauth')
      ) {
        setIsAccountsOpen(true);
      } else if (
        lowerInput.includes('computer') ||
        lowerInput.includes('hardware') ||
        lowerInput.includes('specs') ||
        lowerInput.includes('ram') ||
        lowerInput.includes('cpu') ||
        lowerInput.includes('कंप्यूटर') ||
        lowerInput.includes('हार्डवेयर')
      ) {
        setIsComputerControlOpen(true);
      } else if (
        lowerInput.includes('file') ||
        lowerInput.includes('फ़ाइल') ||
        lowerInput.includes('फाइल') ||
        lowerInput.includes('source code') ||
        lowerInput.includes('editor') ||
        lowerInput.includes('modify app')
      ) {
        setIsFileModifierOpen(true);
      } else if (
        lowerInput.includes('version') ||
        lowerInput.includes('release') ||
        lowerInput.includes('update panel') ||
        lowerInput.includes('वर्ज़न') ||
        lowerInput.includes('अपडेट')
      ) {
        setIsAdminUpdatePanelOpen(true);
      } else if (
        lowerInput.includes('upgrade') ||
        lowerInput.includes('अपग्रेड') ||
        lowerInput.includes('self-upgrade')
      ) {
        setUpgradeCenterTab('available');
        setIsUpgradeCenterOpen(true);
      }

      // App launching is handled on-device, so this command works without the cloud server.
      if (parsedDevice.isDeviceCommand && parsedDevice.action === 'OPEN_APP' && parsedDevice.targetItem) {
        const launchResult = deviceBridge.launchAndroidApp(parsedDevice.targetItem);
        const localReply: ChatMessage = {
          id: 'jarvis-local-' + Date.now(),
          sender: 'jarvis',
          text: launchResult.message,
          speechText: launchResult.message,
          language: languageMode === 'hi' ? 'hi-IN' : 'en-US',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, localReply]);
        if (autoSpeak) handleSpeak(localReply.speechText!, localReply.language, localReply.id);
        return;
      }

      setIsThinking(true);

      try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userInput,
            history: messages.slice(-8),
            languageMode: languageMode,
          }),
        });

        const responseText = await response.text();
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            responseText.trimStart().startsWith('<')
              ? 'JARVIS API server is not connected. This APK has no local API endpoint yet.'
              : 'Server returned an invalid response.'
          );
        }

        if (!response.ok) {
          const diagnostic = typeof data.diagnostic === 'string' ? data.diagnostic : '';
          throw new Error([data.error || 'Server connection error', diagnostic].filter(Boolean).join(' | '));
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
        console.error('JARVIS cloud chat failed:', err);
        const detail = err?.message || 'Network/API connection failed.';
        setErrorMessage(`JARVIS AI उपलब्ध नहीं है: ${detail}`);
        const errorMessage: ChatMessage = {
          id: 'jarvis-error-' + Date.now(),
          sender: 'jarvis',
          text: `सर, JARVIS AI अनुरोध असफल हुआ: ${detail}`,
          language: 'hi-IN',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsThinking(false);
      }
    },
    [isAwake, isListening, messages, languageMode, autoSpeak, handleSpeak, handleStopSpeaking]
  );

  // Toggle Voice Recognition (Never throws Microphone Permission Denied errors)
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

    setErrorMessage(null);
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
      onError: () => {
        // Never display blocking microphone errors; Neural Voice Transceiver stays active
        setErrorMessage(null);
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
        const response = await fetch(`${API_BASE_URL}/api/protocol`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ protocol }),
        });

        const responseText = await response.text();
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            responseText.trimStart().startsWith('<')
              ? 'Protocol API server is unavailable in standalone APK mode.'
              : 'Protocol server returned an invalid response.'
          );
        }
        if (!response.ok) throw new Error(data.error || 'Protocol request failed');
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
      style={{
        backgroundColor: activeTheme.bgTone,
        filter: brightnessLevel !== 100 ? `brightness(${brightnessLevel}%)` : undefined,
      }}
      className={`min-h-screen text-slate-100 flex flex-col relative overflow-x-hidden ${activeTheme.gridStyle} hud-scanlines selection:bg-cyan-500/30 selection:text-cyan-200 transition-all duration-300`}
    >
      {/* Animated multicolor corner HUD — remains visible above the app UI */}
      <div className="jarvis-corner-hud" aria-hidden="true">
        <span className="jarvis-corner-ring jarvis-corner-tl" />
        <span className="jarvis-corner-ring jarvis-corner-tr" />
        <span className="jarvis-corner-ring jarvis-corner-bl" />
        <span className="jarvis-corner-ring jarvis-corner-br" />
      </div>
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
        onEmergencyStop={() => {
          playAlert();
          handleStopSpeaking();
          if (isListening) {
            speechEngine.stopListening();
            setIsListening(false);
          }
          ownerAuthManager.triggerEmergencyStop();
          const stopMsg: ChatMessage = {
            id: 'jarvis-stop-' + Date.now(),
            sender: 'jarvis',
            text: '[EMERGENCY STOP ENGAGED]\nAll active commands, voice streams, and autonomous device actions have been halted immediately by owner override.',
            speechText: 'Emergency stop engaged, sir. All commands halted immediately.',
            timestamp: new Date().toISOString(),
            isProtocol: true,
          };
          setMessages((prev) => [...prev, stopMsg]);
        }}
        onOpenSecurityDashboard={() => {
          playClick();
          setIsSecurityDashboardOpen(true);
        }}
        onOpenDeviceControl={() => {
          playClick();
          setIsDeviceControlOpen(true);
        }}
        onOpenDesignStudio={() => {
          playClick();
          setIsDesignStudioOpen(true);
        }}
        onOpenUpgradeCenter={() => {
          playClick();
          setUpgradeCenterTab('available');
          setIsUpgradeCenterOpen(true);
        }}
        onOpenAdminUpdatePanel={() => {
          playClick();
          setIsAdminUpdatePanelOpen(true);
        }}
        onOpenWorkspaceHub={() => {
          playClick();
          setIsWorkspaceHubOpen(true);
        }}
        onOpenAccounts={() => {
          playClick();
          setIsAccountsOpen(true);
        }}
        onOpenMinecraft={() => {
          playClick();
          setIsMinecraftOpen(true);
        }}
        onOpenComputerControl={() => {
          playClick();
          setIsComputerControlOpen(true);
        }}
        onOpenFileModifier={() => {
          playClick();
          setIsFileModifierOpen(true);
        }}
        currentVersion={versionStatus?.currentVersion || '7.5.0'}
        lastUpdatedText={
          versionStatus?.lastUpdatedIso
            ? formatExactSystemTimestamp(versionStatus.lastUpdatedIso).localFull
            : undefined
        }
        updateAvailable={Boolean(versionStatus?.updateAvailable)}
        availableVersion={versionStatus?.availableVersion || undefined}
        availableUpgradesCount={availableUpgradesCount}
        onOpenSettings={() => {
          playClick();
          setIsSettingsOpen(true);
        }}
      />

      {/* Live Newer Version Available Notification Banner */}
      {versionStatus?.updateAvailable && (
        <div className="w-full bg-gradient-to-r from-amber-950/90 via-cyan-950/90 to-amber-950/90 border-b border-amber-400/50 px-4 py-2.5 z-20 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-300">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-orbitron font-bold text-amber-200 tracking-wider">
                    NEWER VERSION AVAILABLE: v{versionStatus.availableVersion || versionStatus.currentVersion}
                  </span>
                  {versionStatus.stagedUpdate && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300">
                      {versionStatus.stagedUpdate.bumpType} RELEASE READY
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200">
                  {versionStatus.stagedUpdate?.title ||
                    'A newer application release has been detected. Install now to increment version and synchronize.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  playClick();
                  setIsInstallingStagedUpdate(true);
                  try {
                    const res = await fetch('/api/version/release', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        bumpType: versionStatus.stagedUpdate?.bumpType || 'PATCH',
                        title: versionStatus.stagedUpdate?.title || 'Staged System Update Deployment',
                        releaseNotes: versionStatus.stagedUpdate?.releaseNotes || [
                          'Installed staged update from HUD notification banner.',
                        ],
                        releasedBy: 'Owner HUD Notification Approval',
                      }),
                    });
                    const data = await res.json();
                    if (res.ok && data.ok) {
                      clientLoadedVersionRef.current = data.release.version;
                      await fetchVersionStatus();
                      playResponseChime();
                      handleSpeak(
                        `Update complete, sir. Application upgraded to version ${data.release.version}.`,
                        'en-US'
                      );
                    }
                  } finally {
                    setIsInstallingStagedUpdate(false);
                  }
                }}
                disabled={isInstallingStagedUpdate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/60 text-emerald-200 transition-all cursor-pointer"
              >
                <Rocket className="w-3.5 h-3.5" />
                {isInstallingStagedUpdate ? 'INSTALLING...' : 'INSTALL UPDATE NOW'}
              </button>
              <button
                onClick={() => {
                  playClick();
                  setIsAdminUpdatePanelOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-orbitron bg-slate-900/80 hover:bg-slate-800 border border-amber-400/40 text-amber-200 transition-all cursor-pointer"
              >
                RELEASE NOTES & ADMIN PANEL
              </button>
            </div>
          </div>
        </div>
      )}

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
            setIsMinecraftOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold text-emerald-200 bg-emerald-950/80 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)] shrink-0"
        >
          <Gamepad2 className="w-3.5 h-3.5 text-emerald-300" />
          🎮 MINECRAFT GAME
        </button>
        <button
          onClick={() => {
            playClick();
            setIsWorkspaceHubOpen(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-orbitron text-cyan-200 bg-cyan-950/60 border border-cyan-400/50 shrink-0"
        >
          <Mail className="w-3.5 h-3.5 text-cyan-300" />
          WORKSPACE
        </button>
        <button
          onClick={() => {
            playClick();
            setIsFileModifierOpen(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-orbitron text-amber-200 bg-amber-950/60 border border-amber-400/50 shrink-0"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
          FILES
        </button>
        <button
          onClick={() => {
            playClick();
            setIsDeviceControlOpen(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-orbitron text-emerald-200 bg-emerald-950/60 border border-emerald-400/50 shrink-0"
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-300" />
          DEVICE
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
            onOpenSecurityDashboard={() => {
              playClick();
              setIsSecurityDashboardOpen(true);
            }}
            onOpenDeviceControl={() => {
              playClick();
              setIsDeviceControlOpen(true);
            }}
            onOpenFileModifier={() => {
              playClick();
              setUpgradeCenterTab('files');
              setIsUpgradeCenterOpen(true);
            }}
            onOpenUpgradeCenter={() => {
              playClick();
              setUpgradeCenterTab('available');
              setIsUpgradeCenterOpen(true);
            }}
            onOpenDesignStudio={() => {
              playClick();
              setIsDesignStudioOpen(true);
            }}
            onOpenAdminUpdatePanel={() => {
              playClick();
              setIsAdminUpdatePanelOpen(true);
            }}
            currentVersion={versionStatus?.currentVersion || '7.5.0'}
            lastUpdatedText={
              versionStatus?.lastUpdatedIso
                ? formatExactSystemTimestamp(versionStatus.lastUpdatedIso).localFull
                : undefined
            }
            updateAvailable={Boolean(versionStatus?.updateAvailable)}
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
            onSendVoiceCommand={handleSendMessage}
          />

          {/* Prominent Ultimate AI Agent & Gaming Quick Launch Dock */}
          <div className="w-full mt-4 p-3 rounded-2xl bg-slate-950/85 border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.15)] space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-orbitron text-cyan-300 px-1">
              <span>ULTIMATE AI AGENT & GAMING HUB</span>
              <span className="text-emerald-400 font-mono">READY</span>
            </div>
            <button
              onClick={() => {
                playClick();
                setIsMinecraftOpen(true);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-950 via-cyan-950 to-emerald-950 hover:from-emerald-900 hover:to-cyan-900 border border-emerald-400/80 text-emerald-200 font-orbitron font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4 text-emerald-300" />
              <span>🎮 PLAY MINECRAFT AI GAME & SERVER HUB</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  playClick();
                  setIsWorkspaceHubOpen(true);
                }}
                className="py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-cyan-950/70 border border-cyan-500/30 text-cyan-200 font-orbitron text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>GOOGLE WORKSPACE</span>
              </button>
              <button
                onClick={() => {
                  playClick();
                  setIsAccountsOpen(true);
                }}
                className="py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-emerald-950/70 border border-emerald-500/30 text-emerald-200 font-orbitron text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>ACCOUNTS VAULT</span>
              </button>
              <button
                onClick={() => {
                  playClick();
                  setIsComputerControlOpen(true);
                }}
                className="py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-cyan-950/70 border border-cyan-500/30 text-cyan-200 font-orbitron text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span>COMPUTER CONTROL</span>
              </button>
              <button
                onClick={() => {
                  playClick();
                  setIsFileModifierOpen(true);
                }}
                className="py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-amber-950/70 border border-amber-500/30 text-amber-200 font-orbitron text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>CODE & FILE ENGINE</span>
              </button>
            </div>
          </div>
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
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between text-[11px] font-tech text-cyan-400/50 gap-2">
          <div>STARK TELECOMMUNICATIONS // AUTONOMOUS DEVICE & VERSION MANAGEMENT CORE</div>
          <div className="flex flex-wrap items-center gap-3">
            <span>ZERO-BLOCK VOICE LINK</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-300 font-mono">
              <Clock className="w-3 h-3 text-cyan-400" />
              LAST UPDATED:{' '}
              {versionStatus?.lastUpdatedIso
                ? formatExactSystemTimestamp(versionStatus.lastUpdatedIso).localFull
                : 'SYNCING REAL CLOCK...'}
            </span>
            <span>•</span>
            <button
              onClick={() => {
                playClick();
                setIsAdminUpdatePanelOpen(true);
              }}
              className="text-cyan-300 hover:text-cyan-200 font-orbitron font-bold underline decoration-cyan-500/40 cursor-pointer"
            >
              v{versionStatus?.currentVersion || '7.5.0'}
            </button>
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

      {/* Owner Authentication & Security Dashboard Modal */}
      <OwnerSecurityDashboard
        isOpen={isSecurityDashboardOpen}
        onClose={() => setIsSecurityDashboardOpen(false)}
        onSpeak={(text) => handleSpeak(text)}
      />

      {/* Autonomous Device & Hardware Control Center Modal */}
      <DeviceControlCenter
        isOpen={isDeviceControlOpen}
        onClose={() => setIsDeviceControlOpen(false)}
        onSpeak={(text) => handleSpeak(text)}
        brightnessLevel={brightnessLevel}
        onBrightnessChange={(val) => setBrightnessLevel(val)}
        soundMuted={soundMuted}
        onToggleSound={handleToggleSound}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={handleToggleAutoSpeak}
        onOpenSecurityDashboard={() => {
          setIsDeviceControlOpen(false);
          setIsSecurityDashboardOpen(true);
        }}
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
          fetchVersionStatus();
          const msg: ChatMessage = {
            id: 'jarvis-upgrade-' + Date.now(),
            sender: 'jarvis',
            text: `[SYSTEM UPGRADE APPLIED: ${patch.version}]\nPatch: ${patch.title}\nCategory: ${patch.category.toUpperCase()}\nStatus: Active & Verified. Application version automatically incremented with real system timestamp.`,
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
          fetchVersionStatus();
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
          fetchVersionStatus();
          const msg: ChatMessage = {
            id: 'jarvis-filemod-' + Date.now(),
            sender: 'jarvis',
            text: `[AUTONOMOUS FILE MODIFIED: ${fileName}]\nStatus: Successfully updated on disk.\nApplication version automatically incremented & pre-write SHA-256 backup preserved.`,
            speechText: `Sir, I have successfully updated the application file ${fileName} on disk and incremented the build version.`,
            timestamp: new Date().toISOString(),
            isProtocol: true,
          };
          setMessages((prev) => [...prev, msg]);
        }}
        onSpeak={(text) => handleSpeak(text)}
      />

      {/* Admin Update & Automatic Version Management Panel Modal */}
      <AdminUpdatePanel
        isOpen={isAdminUpdatePanelOpen}
        onClose={() => setIsAdminUpdatePanelOpen(false)}
        versionStatus={versionStatus}
        onRefreshVersionStatus={fetchVersionStatus}
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

      {/* Google Workspace Intelligence Hub Modal */}
      <WorkspaceHub
        isOpen={isWorkspaceHubOpen}
        onClose={() => setIsWorkspaceHubOpen(false)}
        onSpeak={(text) => handleSpeak(text)}
        onOpenAccounts={() => setIsAccountsOpen(true)}
      />

      {/* Personal Accounts Vault Modal */}
      <PersonalAccountsDashboard
        isOpen={isAccountsOpen}
        onClose={() => setIsAccountsOpen(false)}
        onSpeak={(text) => handleSpeak(text)}
        onOpenWorkspaceHub={() => setIsWorkspaceHubOpen(true)}
      />

      {/* Minecraft Autonomous Gaming & Server Console Modal */}
      <MinecraftControlCenter
        isOpen={isMinecraftOpen}
        onClose={() => setIsMinecraftOpen(false)}
        onSpeak={(text) => handleSpeak(text)}
      />

      {/* Computer Control & Hardware Core Modal */}
      <ComputerControlCenter
        isOpen={isComputerControlOpen}
        onClose={() => setIsComputerControlOpen(false)}
        onSpeak={(text) => handleSpeak(text)}
        onOpenFileModifier={() => setIsFileModifierOpen(true)}
      />

      {/* Autonomous Source Code & Project File Editor Modal */}
      {isFileModifierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-6xl h-[92vh] max-h-[860px] bg-[#030712] border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-slate-100">
            <div className="flex items-center justify-between px-6 py-3 border-b border-cyan-500/20 bg-slate-950">
              <span className="font-orbitron font-bold text-sm text-cyan-300">
                AUTONOMOUS PROJECT SOURCE CODE & FILE SYSTEM ENGINE
              </span>
              <button
                onClick={() => setIsFileModifierOpen(false)}
                className="p-1 rounded-lg border border-cyan-500/30 text-cyan-300 hover:border-cyan-400"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <FileModifierPanel
                onSpeak={(text) => handleSpeak(text)}
                onFileModified={(fileName) => {
                  fetchVersionStatus();
                  const msg: ChatMessage = {
                    id: 'jarvis-filemod-' + Date.now(),
                    sender: 'jarvis',
                    text: `[AUTONOMOUS FILE MODIFIED: ${fileName}]\nStatus: Successfully updated on disk.\nApplication version automatically incremented & pre-write SHA-256 backup preserved.`,
                    speechText: `Sir, I have updated the application file ${fileName} on disk and verified the compilation.`,
                    timestamp: new Date().toISOString(),
                    isProtocol: true,
                  };
                  setMessages((prev) => [...prev, msg]);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
