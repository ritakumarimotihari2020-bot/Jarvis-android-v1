import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Settings,
  ShieldCheck,
  Zap,
  Sparkles,
  Palette,
  Smartphone,
  Tag,
  BellRing,
  Mail,
  KeyRound,
  Gamepad2,
  Monitor,
  FolderOpen,
} from 'lucide-react';

interface HudHeaderProps {
  isAwake: boolean;
  languageMode: 'auto' | 'en' | 'hi';
  onLanguageChange: (mode: 'auto' | 'en' | 'hi') => void;
  soundMuted: boolean;
  onToggleSound: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onOpenSettings: () => void;
  onTestVoice?: () => void;
  onOpenUpgradeCenter?: () => void;
  availableUpgradesCount?: number;
  onOpenDesignStudio?: () => void;
  onOpenDeviceControl?: () => void;
  onOpenSecurityDashboard?: () => void;
  onEmergencyStop?: () => void;
  currentVersion?: string;
  lastUpdatedText?: string;
  updateAvailable?: boolean;
  availableVersion?: string | null;
  onOpenAdminUpdatePanel?: () => void;
  onOpenWorkspaceHub?: () => void;
  onOpenAccounts?: () => void;
  onOpenMinecraft?: () => void;
  onOpenComputerControl?: () => void;
  onOpenFileModifier?: () => void;
}

export const HudHeader: React.FC<HudHeaderProps> = ({
  isAwake,
  languageMode,
  onLanguageChange,
  soundMuted,
  onToggleSound,
  autoSpeak,
  onToggleAutoSpeak,
  onOpenSettings,
  onOpenUpgradeCenter,
  availableUpgradesCount = 0,
  onOpenDesignStudio,
  onOpenDeviceControl,
  onOpenSecurityDashboard,
  onEmergencyStop,
  currentVersion = '7.5.0',
  lastUpdatedText = 'Synchronizing...',
  updateAvailable = false,
  availableVersion = null,
  onOpenAdminUpdatePanel,
  onOpenWorkspaceHub,
  onOpenAccounts,
  onOpenMinecraft,
  onOpenComputerControl,
  onOpenFileModifier,
}) => {
  const [time, setTime] = useState<string>('');
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setUtcTime(
        now.toISOString().slice(11, 19) + ' UTC'
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-[#030712]/90 border-b border-cyan-500/20 backdrop-blur-md px-4 py-2.5 z-30 sticky top-0">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand, Live Version & Exact Last Updated Readout */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-cyan-400/50 bg-cyan-950/40">
            <Zap className={`w-4 h-4 text-cyan-300 ${isAwake ? 'animate-pulse' : 'text-slate-500'}`} />
            <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-ping opacity-30" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-orbitron font-extrabold text-sm tracking-widest text-cyan-300 text-glow-cyan">
                J.A.R.V.I.S.
              </span>
              <button
                onClick={onOpenAdminUpdatePanel}
                className="text-[10px] font-orbitron font-bold text-cyan-200 bg-cyan-950/80 border border-cyan-400/60 px-1.5 py-0.5 rounded hover:bg-cyan-900 transition-colors"
                title="Click to open Admin Update & Version Management Panel"
              >
                v{currentVersion}
              </button>
              <span className="text-[10px] font-tech text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.5 rounded hidden sm:inline">
                UPDATED: {lastUpdatedText}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-tech text-cyan-400/70">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isAwake ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {isAwake ? 'ONLINE' : 'STANDBY'}
              </span>
              <span>|</span>
              <span className="hidden md:inline">ANDROID & WINDOWS READY</span>
              <span className="hidden md:inline">|</span>
              <span className="text-emerald-300">OWNER SEC: LVL 5</span>
            </div>
          </div>
        </div>

        {/* Center Clock HUD */}
        <div className="hidden xl:flex flex-col items-center border-x border-cyan-500/20 px-5 py-0.5">
          <span className="font-orbitron text-sm font-semibold tracking-widest text-cyan-200">
            {time || '00:00:00'}
          </span>
          <span className="font-tech text-[10px] text-cyan-400/60 tracking-wider">
            {utcTime || 'UTC 00:00:00'}
          </span>
        </div>

        {/* Controls: Language, Audio, Version Admin, Device, Security, Upgrade, Emergency Stop */}
        <div className="flex items-center gap-2">
          {/* Emergency STOP ALL COMMANDS Button */}
          {onEmergencyStop && (
            <button
              onClick={onEmergencyStop}
              className="px-2.5 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 border border-red-300 text-white text-[10px] font-orbitron font-extrabold tracking-wider transition-all shadow-[0_0_12px_rgba(239,68,68,0.5)]"
              title="Emergency STOP ALL COMMANDS"
            >
              STOP ALL
            </button>
          )}

          {/* Language Selector */}
          <div className="flex items-center bg-slate-900/90 border border-cyan-500/30 rounded-lg p-0.5 text-xs font-rajdhani">
            <button
              onClick={() => onLanguageChange('auto')}
              className={`px-2 py-1 rounded transition-colors ${
                languageMode === 'auto'
                  ? 'bg-cyan-500/30 text-cyan-200 font-semibold border border-cyan-400/40'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
              title="Automatic Language Detection"
            >
              AUTO
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-1 rounded transition-colors ${
                languageMode === 'en'
                  ? 'bg-cyan-500/30 text-cyan-200 font-semibold border border-cyan-400/40'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
              title="English Voice & Dialogue"
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange('hi')}
              className={`px-2 py-1 rounded transition-colors ${
                languageMode === 'hi'
                  ? 'bg-cyan-500/30 text-cyan-200 font-semibold border border-cyan-400/40'
                  : 'text-slate-400 hover:text-cyan-300'
              }`}
              title="हिंदी संवाद (Hindi)"
            >
              हिंदी
            </button>
          </div>

          {/* Sound FX Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-lg border transition-all ${
              soundMuted
                ? 'border-slate-800 bg-slate-900/70 text-slate-500'
                : 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:border-cyan-400'
            }`}
            title={soundMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Auto-Speak AI Toggle */}
          <button
            onClick={onToggleAutoSpeak}
            className={`px-2 py-1.5 rounded-lg border text-[11px] font-orbitron transition-all hidden md:flex items-center gap-1.5 ${
              autoSpeak
                ? 'border-cyan-500/40 bg-cyan-950/50 text-cyan-300'
                : 'border-slate-800 bg-slate-900/70 text-slate-500'
            }`}
            title="Automatically speak AI replies"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoSpeak ? 'bg-cyan-400' : 'bg-slate-600'}`} />
            VOICE {autoSpeak ? 'ON' : 'OFF'}
          </button>

          {/* Admin Update & Version Management Trigger Button */}
          {onOpenAdminUpdatePanel && (
            <button
              onClick={onOpenAdminUpdatePanel}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-orbitron font-bold transition-all shadow-sm ${
                updateAvailable
                  ? 'border-amber-400 bg-amber-950/70 text-amber-200 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                  : 'border-cyan-400/60 bg-cyan-950/50 hover:bg-cyan-900/70 text-cyan-200'
              }`}
              title="Open Admin Update & Version Management Panel"
            >
              {updateAvailable ? (
                <BellRing className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Tag className="w-3.5 h-3.5 text-cyan-300" />
              )}
              <span>
                {updateAvailable && availableVersion
                  ? `UPDATE v${availableVersion}`
                  : `v${currentVersion}`}
              </span>
            </button>
          )}

          {/* Owner Security Dashboard Button */}
          {onOpenSecurityDashboard && (
            <button
              onClick={onOpenSecurityDashboard}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-400/60 bg-amber-950/50 hover:bg-amber-900/70 text-amber-200 text-xs font-orbitron font-bold transition-all shadow-sm"
              title="Owner Authentication & Security Dashboard (PIN, Biometric, Voice)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden lg:inline">SECURITY</span>
            </button>
          )}

          {/* Google Workspace Hub Button */}
          {onOpenWorkspaceHub && (
            <button
              onClick={onOpenWorkspaceHub}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-200 text-xs font-orbitron font-bold transition-all shadow-sm"
              title="Open Google Workspace Hub (Gmail, Calendar, Drive, Contacts)"
            >
              <Mail className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden xl:inline">WORKSPACE</span>
            </button>
          )}

          {/* Personal Accounts Vault Button */}
          {onOpenAccounts && (
            <button
              onClick={onOpenAccounts}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-400/60 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-200 text-xs font-orbitron font-bold transition-all shadow-sm"
              title="Open Personal Accounts Vault & Manager (Google, Minecraft, Microsoft)"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden xl:inline">ACCOUNTS</span>
            </button>
          )}

          {/* Minecraft AI Gaming & Server Manager Button */}
          {onOpenMinecraft && (
            <button
              onClick={onOpenMinecraft}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 text-xs font-orbitron font-extrabold transition-all shadow-[0_0_12px_rgba(16,185,129,0.4)] cursor-pointer shrink-0"
              title="Open Minecraft AI Gaming Assistant & Live Sandbox World (Java, Bedrock, Geyser)"
            >
              <Gamepad2 className="w-4 h-4 text-emerald-300" />
              <span>MINECRAFT GAME</span>
            </button>
          )}

          {/* Computer Control & Hardware Button */}
          {onOpenComputerControl && (
            <button
              onClick={onOpenComputerControl}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-950/50 hover:bg-cyan-900/70 text-cyan-200 text-xs font-orbitron font-bold transition-all shadow-sm"
              title="Open Autonomous Computer Control & Hardware Core"
            >
              <Monitor className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden lg:inline">COMPUTER</span>
            </button>
          )}

          {/* Autonomous Project File Editor Button */}
          {onOpenFileModifier && (
            <button
              onClick={onOpenFileModifier}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-400/60 bg-amber-950/50 hover:bg-amber-900/70 text-amber-200 text-xs font-orbitron font-bold transition-all shadow-sm"
              title="Open Autonomous Source Code & Project File Editor"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden lg:inline">FILES</span>
            </button>
          )}

          {/* Autonomous Device Control Button */}
          {onOpenDeviceControl && (
            <button
              onClick={onOpenDeviceControl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400/60 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-200 text-xs font-orbitron font-bold transition-all shadow-sm"
              title="Open Autonomous Device & Hardware Control Center"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">DEVICE</span>
            </button>
          )}

          {/* Autonomous Design Studio Trigger Button */}
          {onOpenDesignStudio && (
            <button
              onClick={onOpenDesignStudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/50 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-200 text-xs font-orbitron transition-all"
              title="Open Autonomous Design Studio & Synthesizer"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden xl:inline">DESIGN</span>
            </button>
          )}

          {/* Upgrade Center Trigger Button */}
          {onOpenUpgradeCenter && (
            <button
              onClick={onOpenUpgradeCenter}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/80 bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-200 text-xs font-orbitron font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.35)] animate-pulse-slow"
              title="Open Self-Upgrade Center & Diagnostics"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>UPGRADE</span>
              {availableUpgradesCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black flex items-center justify-center font-tech shadow">
                  {availableUpgradesCount}
                </span>
              )}
            </button>
          )}

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/40 transition-all"
            title="JARVIS Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
