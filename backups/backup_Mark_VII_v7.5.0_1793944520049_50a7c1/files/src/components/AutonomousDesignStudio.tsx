/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Palette,
  RotateCcw,
  CheckCircle2,
  Lock,
  Eye,
  RefreshCw,
  X,
  Sliders,
  Layers,
  Check,
  Cpu,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { JarvisTheme, themeManager, FACTORY_THEMES, CoreGeometry, GridStyle } from '../utils/themeSystem';
import { JarvisCore } from './JarvisCore';
import { playClick, playAlert, playWakeChime, playResponseChime } from '../utils/soundEffects';

interface AutonomousDesignStudioProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: JarvisTheme;
  onThemeApplied: (theme: JarvisTheme) => void;
  onRollbackExecuted: (restoredTheme: JarvisTheme) => void;
  onSpeak?: (text: string) => void;
}

export const AutonomousDesignStudio: React.FC<AutonomousDesignStudioProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeApplied,
  onRollbackExecuted,
  onSpeak,
}) => {
  const [themes, setThemes] = useState<JarvisTheme[]>([]);
  const [candidateTheme, setCandidateTheme] = useState<JarvisTheme | null>(null);
  const [userPermissionGranted, setUserPermissionGranted] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [directiveInput, setDirectiveInput] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const refreshThemes = () => {
    setThemes(themeManager.getAllAvailableThemes());
  };

  useEffect(() => {
    if (isOpen) {
      refreshThemes();
      // If no candidate chosen yet, start previewing current theme or first synthesized
      if (!candidateTheme) {
        setCandidateTheme(currentTheme);
      }
    }
  }, [isOpen, currentTheme]);

  if (!isOpen) return null;

  // Ask JARVIS to procedurally synthesize a novel design
  const handleSynthesizeDesign = async (overrideDirective?: string) => {
    const directive = overrideDirective !== undefined ? overrideDirective : directiveInput;
    playClick();
    setIsSynthesizing(true);
    setStatusNotice(null);
    setUserPermissionGranted(false);

    try {
      // First attempt server-side synthesis
      const res = await fetch('/api/design/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directive: directive.trim() }),
      });

      let synthesized: JarvisTheme;
      if (res.ok) {
        const data = await res.json();
        synthesized = data.theme;
      } else {
        synthesized = themeManager.synthesizeNovelTheme(directive.trim() || undefined);
      }

      themeManager.saveCustomTheme(synthesized);
      refreshThemes();
      setCandidateTheme(synthesized);
      playResponseChime();

      const isHindi = /[\u0900-\u097F]/.test(directive);
      const speech = isHindi
        ? `सर, मैंने '${synthesized.name}' नाम से नया इंटरफ़ेस डिज़ाइन तैयार किया है। कृपया पूर्वावलोकन देखकर अनुमति दें।`
        : `Sir, I have synthesized a novel design: ${synthesized.name}. Awaiting your permission to deploy.`;

      setStatusNotice(`Synthesized: ${synthesized.name} (${synthesized.coreGeometry.toUpperCase()} geometry).`);
      if (onSpeak) {
        onSpeak(speech);
      }
    } catch {
      // Robust client fallback
      const fallback = themeManager.synthesizeNovelTheme(directive.trim() || undefined);
      themeManager.saveCustomTheme(fallback);
      refreshThemes();
      setCandidateTheme(fallback);
      playResponseChime();
      setStatusNotice(`Synthesized: ${fallback.name} via local Stark design engine.`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // User authorizes and applies the candidate theme
  const handleAuthorizeAndApply = () => {
    if (!candidateTheme || !userPermissionGranted) return;
    playClick();

    const res = themeManager.applyTheme(candidateTheme, true);
    playWakeChime();

    setStatusNotice(res.message);
    onThemeApplied(candidateTheme);

    const speech = `Visual architecture reconfigured to ${candidateTheme.name}, sir. All holographic parameters synced.`;
    if (onSpeak) {
      onSpeak(speech);
    }

    setUserPermissionGranted(false);
  };

  // Rollback to prior theme
  const handleRollback = () => {
    playClick();
    if (!themeManager.canRollback()) {
      setStatusNotice('No prior theme snapshot registered in the rollback stack.');
      return;
    }

    const res = themeManager.rollback();
    if (res.success && res.restoredTheme) {
      playWakeChime();
      setStatusNotice(res.message);
      setCandidateTheme(res.restoredTheme);
      onRollbackExecuted(res.restoredTheme);
      if (onSpeak) {
        onSpeak(`Rollback complete. Restored to ${res.restoredTheme.name}, sir.`);
      }
    }
  };

  const quickSynthesizeChips = [
    { label: 'Mark 85 Titanium Gold', directive: 'Stark Mark 85 nanotech titanium gold and solar crimson' },
    { label: 'Stealth Obsidian Ops', directive: 'Deep stealth obsidian black with ultraviolet tachyon glow' },
    { label: 'Tachyon Bio-Emerald', directive: 'Medical tachyon emerald with biological diagnostics telemetry' },
    { label: 'Quantum Ice Cobalt', directive: 'Sub-zero cryo ice blue with deep space satellite telemetry' },
    { label: 'Plasma Rose Cyber', directive: 'High-energy plasma rose neon with cyberpunk harmonics' },
    { label: 'नया साइबर डिज़ाइन', directive: 'जार्विस, एक नया और चमकदार साइबर डिज़ाइन बनाओ' },
  ];

  const candidate = candidateTheme || currentTheme;
  const canRollback = themeManager.canRollback();
  const previousTheme = themeManager.getPreviousTheme();

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-2xl animate-fadeIn font-rajdhani text-slate-100">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[840px] bg-[#030712] border-2 border-cyan-400/50 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-cyan-500/30 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg"
              style={{
                borderColor: currentTheme.accentColor,
                backgroundColor: currentTheme.surfaceColor,
                boxShadow: `0 0 15px ${currentTheme.accentGlow}`,
              }}
            >
              <Palette className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-extrabold text-sm sm:text-base tracking-widest text-cyan-200">
                  J.A.R.V.I.S. AUTONOMOUS DESIGN STUDIO
                </span>
                <span className="font-tech text-xs bg-cyan-950 border border-cyan-400/40 text-cyan-300 px-2 py-0.5 rounded-full font-bold">
                  ACTIVE: {currentTheme.name}
                </span>
              </div>
              <p className="font-tech text-[11px] text-cyan-400/70 hidden sm:block">
                PROCEDURAL AESTHETIC SYNTHESIS • INTERACTIVE LIVE PREVIEW • STRICT USER AUTHORIZATION
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canRollback && (
              <button
                onClick={handleRollback}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-orbitron font-bold transition-all"
                title={`Revert to ${previousTheme?.name}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">RESTORE PREVIOUS LOOK</span>
              </button>
            )}

            <button
              onClick={() => {
                playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Notification Notice */}
        {statusNotice && (
          <div className="px-5 py-2 bg-cyan-950/70 border-b border-cyan-500/30 text-xs text-cyan-200 flex items-center justify-between gap-2 shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-tech tracking-wide">{statusNotice}</span>
            </div>
            <button
              onClick={() => setStatusNotice(null)}
              className="text-[10px] font-orbitron text-cyan-400 hover:text-cyan-200 uppercase"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. Synthesis Control Bar */}
          <div className="p-3.5 bg-slate-900/80 border border-cyan-500/30 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs font-orbitron font-bold text-cyan-200">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                ASK J.A.R.V.I.S. TO SYNTHESIZE A NOVEL INTERFACE DESIGN
              </span>
              <span className="font-tech text-[10px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                PERMISSION-GATED
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={directiveInput}
                onChange={(e) => setDirectiveInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSynthesizeDesign();
                  }
                }}
                placeholder="Describe desired look (e.g. 'Mark 85 Titanium Gold' or 'जार्विस, नया डिज़ाइन बनाओ')..."
                className="flex-1 bg-slate-950 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs font-rajdhani text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={() => handleSynthesizeDesign()}
                disabled={isSynthesizing}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-orbitron font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 shrink-0"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
                {isSynthesizing ? 'SYNTHESIZING...' : 'SYNTHESIZE DESIGN'}
              </button>
            </div>

            {/* Quick Directive Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {quickSynthesizeChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirectiveInput(chip.directive);
                    handleSynthesizeDesign(chip.directive);
                  }}
                  className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-rajdhani bg-slate-950 border border-cyan-500/25 hover:border-cyan-400 text-cyan-300 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Interactive Live Preview Drawer (Split Card) */}
          <div className="p-4 bg-slate-950/90 border-2 border-cyan-400 rounded-xl space-y-4 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-cyan-500/25">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="font-orbitron font-bold text-sm text-cyan-100 tracking-wider">
                  LIVE INTERFACE PREVIEW // {candidate.name}
                </span>
                <span
                  className="font-tech text-[10px] px-2 py-0.5 rounded font-bold uppercase border"
                  style={{
                    color: candidate.accentColor,
                    borderColor: candidate.borderColor,
                    backgroundColor: candidate.surfaceColor,
                  }}
                >
                  {candidate.codename}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-tech text-slate-400">
                <span>Core: <strong className="text-cyan-300 uppercase">{candidate.coreGeometry}</strong></span>
                <span>•</span>
                <span>Grid: <strong className="text-cyan-300 uppercase">{candidate.gridStyle}</strong></span>
              </div>
            </div>

            {/* Split layout: Live Miniature Core + Color & Geometry Controls */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Left: Mini Live Core Visualizer */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-black/60 border border-cyan-500/20 relative overflow-hidden min-h-[220px]">
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    background: `radial-gradient(circle at center, ${candidate.accentGlow} 0%, transparent 70%)`,
                  }}
                />
                <div className="scale-75 origin-center -my-10">
                  <JarvisCore
                    state="idle"
                    audioLevel={0.4}
                    isAwake={true}
                    onToggleWake={() => {}}
                    onToggleMic={() => {}}
                    isListening={false}
                    isSpeaking={false}
                    languageMode="auto"
                    theme={candidate}
                  />
                </div>
                <span className="text-[10px] font-tech text-slate-400 uppercase tracking-widest mt-1">
                  HOLOGRAPHIC CORE SIMULATOR
                </span>
              </div>

              {/* Right: Color Swatches & Geometry Selector */}
              <div className="md:col-span-7 space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed font-rajdhani">
                  {candidate.description}
                </p>

                {/* Color Palette Swatches */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-orbitron font-bold text-slate-400">
                    CHROMATIC PALETTE SPECIFICATION:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-sm"
                        style={{ backgroundColor: candidate.accentColor }}
                      />
                      <div>
                        <div className="text-[10px] font-tech text-slate-400">ACCENT</div>
                        <div className="text-[11px] font-mono text-slate-200">{candidate.accentColor}</div>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-sm"
                        style={{ backgroundColor: candidate.secondaryColor }}
                      />
                      <div>
                        <div className="text-[10px] font-tech text-slate-400">SECONDARY</div>
                        <div className="text-[11px] font-mono text-slate-200">{candidate.secondaryColor}</div>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-sm"
                        style={{ backgroundColor: candidate.bgTone }}
                      />
                      <div>
                        <div className="text-[10px] font-tech text-slate-400">CANVAS</div>
                        <div className="text-[11px] font-mono text-slate-200">{candidate.bgTone}</div>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0 shadow-sm"
                        style={{ backgroundColor: candidate.borderColor }}
                      />
                      <div>
                        <div className="text-[10px] font-tech text-slate-400">BORDER</div>
                        <div className="text-[10px] font-mono text-slate-200 truncate">1px HAIRLINE</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Core Geometry Options */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-orbitron font-bold text-slate-400">
                    ARC REACTOR CORE GEOMETRY:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(['concentric', 'gyro', 'lattice', 'soundwave'] as CoreGeometry[]).map((geom) => (
                      <button
                        key={geom}
                        onClick={() => {
                          playClick();
                          setCandidateTheme({ ...candidate, coreGeometry: geom });
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-orbitron uppercase transition-all ${
                          candidate.coreGeometry === geom
                            ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {geom}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Mandatory User Authorization Gate */}
            <div className="p-3 bg-slate-900/90 border border-cyan-500/40 rounded-xl space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={userPermissionGranted}
                  onChange={(e) => setUserPermissionGranted(e.target.checked)}
                  className="mt-0.5 accent-cyan-400 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-cyan-200">
                    EXPLICIT USER AUTHORIZATION (अनिवार्य अनुमति)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    I authorize J.A.R.V.I.S. to reconfigure HUD theme tokens, reactor core geometry, and luminous accents to this design. A prior snapshot will be preserved in the rollback stack.
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-cyan-500/20">
              <button
                onClick={() => handleSynthesizeDesign()}
                className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-orbitron flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                SYNTHESIZE ANOTHER VARIANT
              </button>

              <button
                onClick={handleAuthorizeAndApply}
                disabled={!userPermissionGranted || currentTheme.id === candidate.id}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:hover:bg-cyan-600 text-slate-950 font-orbitron font-bold text-xs tracking-wider transition-all shadow-lg shadow-cyan-500/25"
              >
                <Lock className="w-3.5 h-3.5" />
                {currentTheme.id === candidate.id ? 'THEME CURRENTLY ACTIVE' : 'AUTHORIZE & DEPLOY DESIGN'}
              </button>
            </div>
          </div>

          {/* 3. Preset & Synthesized Themes Vault */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-orbitron font-bold text-cyan-200 pb-1 border-b border-cyan-500/20">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                THEME VAULT & AVAILABLE DESIGNS ({themes.length})
              </span>
              <span className="font-tech text-[10px] text-slate-400">
                CLICK TO AUDIT & PREVIEW
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {themes.map((th) => {
                const isActive = currentTheme.id === th.id;
                const isSelected = candidate.id === th.id;

                return (
                  <div
                    key={th.id}
                    onClick={() => {
                      playClick();
                      setCandidateTheme(th);
                      setUserPermissionGranted(false);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 shadow-lg'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: th.accentColor }}
                          />
                          <span className="font-orbitron font-bold text-xs text-slate-100">
                            {th.name}
                          </span>
                        </div>
                        {isActive && (
                          <span className="font-orbitron text-[9px] text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40 font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {th.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-tech text-slate-500 mt-2.5 pt-1.5 border-t border-slate-900">
                      <span className="uppercase">Core: {th.coreGeometry}</span>
                      <span className="text-cyan-400 hover:text-cyan-200 font-orbitron">
                        {isSelected ? 'PREVIEWING' : 'SELECT'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-cyan-500/20 bg-slate-950/80 flex items-center justify-between text-[11px] font-tech text-cyan-400/60 shrink-0">
          <div>STARK AUTONOMOUS DESIGN COMPILER // HOLOGRAPHIC TOKENS</div>
          <div className="flex items-center gap-2">
            <span>PERMISSIONS GUARD ACTIVE</span>
            <span>•</span>
            <span className="text-cyan-300">ROLLBACK READY</span>
          </div>
        </div>
      </div>
    </div>
  );
};
