import React from 'react';
import { Activity, Shield, Cpu, Flame, Satellite, Terminal, MessageSquareQuote, FileCode, Palette } from 'lucide-react';
import { playClick } from '../utils/soundEffects';

interface TelemetryPanelProps {
  onRunProtocol: (protocol: string, title: string) => void;
  onOpenFileModifier?: () => void;
  onOpenDesignStudio?: () => void;
  disabled?: boolean;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  onRunProtocol,
  onOpenFileModifier,
  onOpenDesignStudio,
  disabled = false,
}) => {
  const handleProtocolClick = (protocol: string, title: string) => {
    playClick();
    onRunProtocol(protocol, title);
  };

  return (
    <div className="flex flex-col gap-4 w-full text-xs font-rajdhani">
      {/* Diagnostics Readout Block */}
      <div className="bg-slate-950/70 border border-cyan-500/25 rounded-xl p-3.5 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-orbitron text-[11px] font-bold tracking-wider text-cyan-300">
              STARK TELEMETRY
            </span>
          </div>
          <span className="font-tech text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded">
            SYNCED
          </span>
        </div>

        {/* Metric Gauges */}
        <div className="grid grid-cols-2 gap-2.5 text-slate-300">
          {/* Reactor Power */}
          <div className="bg-slate-900/60 border border-cyan-500/15 p-2 rounded-lg">
            <div className="flex justify-between items-center text-[10px] text-cyan-400/80 mb-1">
              <span>ARC REACTOR</span>
              <span className="font-tech text-cyan-300 font-bold">3.8 GW</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full w-[96%]" />
            </div>
          </div>

          {/* Core Temp */}
          <div className="bg-slate-900/60 border border-cyan-500/15 p-2 rounded-lg">
            <div className="flex justify-between items-center text-[10px] text-cyan-400/80 mb-1">
              <span>CORE TEMP</span>
              <span className="font-tech text-emerald-300 font-bold">42.4°C</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full w-[42%]" />
            </div>
          </div>

          {/* Neural Link Latency */}
          <div className="bg-slate-900/60 border border-cyan-500/15 p-2 rounded-lg">
            <div className="flex justify-between items-center text-[10px] text-cyan-400/80 mb-1">
              <span>NEURAL LATENCY</span>
              <span className="font-tech text-sky-300 font-bold">14 MS</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-sky-400 h-full w-[18%]" />
            </div>
          </div>

          {/* Quantum Buffer */}
          <div className="bg-slate-900/60 border border-cyan-500/15 p-2 rounded-lg">
            <div className="flex justify-between items-center text-[10px] text-cyan-400/80 mb-1">
              <span>BUFFER MEM</span>
              <span className="font-tech text-cyan-300 font-bold">99.8%</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full w-[99%]" />
            </div>
          </div>
        </div>

        {/* Mini Radar Visualizer */}
        <div className="mt-3 bg-slate-900/80 border border-cyan-500/20 rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full border border-cyan-500/40 bg-slate-950 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 border border-cyan-400/20 rounded-full" />
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]" />
              {/* Radar needle sweep */}
              <div className="absolute inset-0 origin-center animate-radar">
                <div className="w-1/2 h-[1px] bg-gradient-to-r from-transparent to-cyan-400" />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-orbitron font-semibold text-cyan-200">
                ORBITAL SWEEP
              </div>
              <div className="font-tech text-[10px] text-cyan-400/70">
                0 THREATS DETECTED
              </div>
            </div>
          </div>
          <span className="font-tech text-[9px] text-slate-400">
            SECTOR 7-G
          </span>
        </div>
      </div>

      {/* Quick Protocol Triggers */}
      <div className="bg-slate-950/70 border border-cyan-500/25 rounded-xl p-3.5 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2 pb-2 mb-2.5 border-b border-cyan-500/20">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-orbitron text-[11px] font-bold tracking-wider text-cyan-300">
            QUICK PROTOCOLS
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {/* Protocol 1: System Diagnostic */}
          <button
            onClick={() => handleProtocolClick('diagnostic', 'System Diagnostic')}
            disabled={disabled}
            className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/25 border border-cyan-500/25 hover:border-cyan-400 hover:bg-cyan-900/30 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold text-cyan-200 group-hover:text-cyan-100">
                  SYSTEM DIAGNOSTIC
                </div>
                <div className="text-[10px] text-cyan-400/60 font-tech">
                  Check all core telemetry
                </div>
              </div>
            </div>
            <span className="text-[10px] font-orbitron text-cyan-400/80 group-hover:text-cyan-300">
              EXECUTE
            </span>
          </button>

          {/* Protocol 2: House Party Protocol */}
          <button
            onClick={() => handleProtocolClick('house_party', 'Protocol House Party')}
            disabled={disabled}
            className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/25 border border-cyan-500/25 hover:border-cyan-400 hover:bg-cyan-900/30 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold text-cyan-200 group-hover:text-cyan-100">
                  PROTOCOL: HOUSE PARTY
                </div>
                <div className="text-[10px] text-cyan-400/60 font-tech">
                  Deploy Iron Legion perimeter
                </div>
              </div>
            </div>
            <span className="text-[10px] font-orbitron text-cyan-400/80 group-hover:text-cyan-300">
              EXECUTE
            </span>
          </button>

          {/* Protocol 3: Arc Reactor Calibrate */}
          <button
            onClick={() => handleProtocolClick('arc_reactor', 'Arc Reactor Calibrate')}
            disabled={disabled}
            className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/25 border border-cyan-500/25 hover:border-cyan-400 hover:bg-cyan-900/30 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold text-cyan-200 group-hover:text-cyan-100">
                  ARC REACTOR CALIBRATION
                </div>
                <div className="text-[10px] text-cyan-400/60 font-tech">
                  Harmonics frequency tune
                </div>
              </div>
            </div>
            <span className="text-[10px] font-orbitron text-cyan-400/80 group-hover:text-cyan-300">
              EXECUTE
            </span>
          </button>

          {/* Protocol 4: Tactical Threat Scan */}
          <button
            onClick={() => handleProtocolClick('threat_scan', 'Tactical Threat Scan')}
            disabled={disabled}
            className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/25 border border-cyan-500/25 hover:border-cyan-400 hover:bg-cyan-900/30 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold text-cyan-200 group-hover:text-cyan-100">
                  SECTOR THREAT SCAN
                </div>
                <div className="text-[10px] text-cyan-400/60 font-tech">
                  Orbital satellite sweep
                </div>
              </div>
            </div>
            <span className="text-[10px] font-orbitron text-cyan-400/80 group-hover:text-cyan-300">
              EXECUTE
            </span>
          </button>

          {/* Protocol 5: Hindi Guide / नमस्ते जार्विस */}
          <button
            onClick={() => handleProtocolClick('hindi_intro', 'नमस्ते जार्विस')}
            disabled={disabled}
            className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/30 border border-cyan-400/40 hover:border-cyan-300 hover:bg-cyan-900/40 transition-all text-left group shadow-sm shadow-cyan-500/20"
          >
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold text-cyan-100 font-rajdhani">
                  नमस्ते जार्विस (HINDI INTRO)
                </div>
                <div className="text-[10px] text-cyan-300/80 font-tech">
                  हिंदी संवाद प्रणाली प्रारंभ करें
                </div>
              </div>
            </div>
            <span className="text-[10px] font-orbitron text-cyan-300">
              संवाद
            </span>
          </button>

          {/* Protocol 6: Autonomous Files & Protocols (फाइल संशोधन) */}
          {onOpenFileModifier && (
            <button
              onClick={() => {
                playClick();
                onOpenFileModifier();
              }}
              disabled={disabled}
              className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/40 border border-cyan-400/50 hover:border-cyan-300 hover:bg-cyan-900/50 transition-all text-left group shadow-sm shadow-cyan-500/20"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-semibold text-cyan-100 font-rajdhani">
                    AUTONOMOUS FILES (फाइल संशोधन)
                  </div>
                  <div className="text-[10px] text-cyan-300/80 font-tech">
                    Direct custom protocols & plugins on disk
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-orbitron text-cyan-300 bg-cyan-950 border border-cyan-400/40 px-1.5 py-0.5 rounded">
                MODIFY
              </span>
            </button>
          )}

          {/* Protocol 7: Autonomous Design Studio (डिज़ाइन संश्लेषण) */}
          {onOpenDesignStudio && (
            <button
              onClick={() => {
                playClick();
                onOpenDesignStudio();
              }}
              disabled={disabled}
              className="flex items-center justify-between p-2 rounded-lg bg-cyan-950/40 border border-cyan-400/50 hover:border-cyan-300 hover:bg-cyan-900/50 transition-all text-left group shadow-sm shadow-cyan-500/20"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-semibold text-cyan-100 font-rajdhani">
                    DESIGN STUDIO (डिज़ाइन स्टूडियो)
                  </div>
                  <div className="text-[10px] text-cyan-300/80 font-tech">
                    Procedural themes, hologram styles & colors
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-orbitron text-cyan-300 bg-cyan-950 border border-cyan-400/40 px-1.5 py-0.5 rounded">
                SYNTH
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
