import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Globe, Settings, Cpu, ShieldCheck, Zap, Sparkles, Palette } from 'lucide-react';

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
  onTestVoice,
  onOpenUpgradeCenter,
  availableUpgradesCount = 0,
  onOpenDesignStudio,
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
        {/* Brand & System Readout */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-cyan-400/50 bg-cyan-950/40">
            <Zap className={`w-4 h-4 text-cyan-300 ${isAwake ? 'animate-pulse' : 'text-slate-500'}`} />
            <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-ping opacity-30" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-extrabold text-sm tracking-widest text-cyan-300 text-glow-cyan">
                J.A.R.V.I.S.
              </span>
              <span className="text-[10px] font-tech text-cyan-500/80 border border-cyan-500/30 px-1 rounded uppercase">
                MK VII
              </span>
              <span className="text-[10px] font-tech text-slate-400 hidden sm:inline">
                STARK INDUSTRIES OS
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-tech text-cyan-400/70">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isAwake ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {isAwake ? 'ONLINE' : 'STANDBY'}
              </span>
              <span>|</span>
              <span className="hidden md:inline">NEURAL CORE 100%</span>
              <span className="hidden md:inline">|</span>
              <span>SEC: LVL 5</span>
            </div>
          </div>
        </div>

        {/* Center Clock HUD */}
        <div className="hidden lg:flex flex-col items-center border-x border-cyan-500/20 px-6 py-0.5">
          <span className="font-orbitron text-sm font-semibold tracking-widest text-cyan-200">
            {time || '00:00:00'}
          </span>
          <span className="font-tech text-[10px] text-cyan-400/60 tracking-wider">
            {utcTime || 'UTC 00:00:00'}
          </span>
        </div>

        {/* Controls: Language, Audio, Settings */}
        <div className="flex items-center gap-2">
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
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-orbitron transition-all hidden sm:flex items-center gap-1.5 ${
              autoSpeak
                ? 'border-cyan-500/40 bg-cyan-950/50 text-cyan-300'
                : 'border-slate-800 bg-slate-900/70 text-slate-500'
            }`}
            title="Automatically speak AI replies"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoSpeak ? 'bg-cyan-400' : 'bg-slate-600'}`} />
            VOICE {autoSpeak ? 'ON' : 'OFF'}
          </button>

          {/* Quick Voice & Sound Test Button in Header */}
          {onTestVoice && (
            <button
              onClick={onTestVoice}
              className="px-2 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-200 hover:border-cyan-400 hover:bg-cyan-900/40 transition-all hidden md:flex items-center gap-1 text-[11px] font-orbitron"
              title="Test Voice & Cyber Chime"
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>TEST SOUND</span>
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
              <span className="hidden sm:inline">DESIGN STUDIO</span>
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
