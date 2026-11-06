import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Cpu,
  HardDrive,
  Activity,
  Play,
  AlertTriangle,
  FolderOpen,
  Eye,
  ShieldCheck,
  CheckCircle2,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';
import {
  fetchSystemHardwareSpecs,
  fetchInstalledApps,
  launchApplication,
  analyzeGameScreenVision,
  SystemHardwareSpecs,
  InstalledApplication,
  ScreenVisionAnalysisResult,
} from '../utils/systemControlBridge';
import { playClick, playAlert, playSuccess, playError } from '../utils/soundEffects';

interface ComputerControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeak?: (text: string) => void;
  onOpenFileModifier?: () => void;
}

export const ComputerControlCenter: React.FC<ComputerControlCenterProps> = ({
  isOpen,
  onClose,
  onSpeak,
  onOpenFileModifier,
}) => {
  const [specs, setSpecs] = useState<SystemHardwareSpecs | null>(null);
  const [apps, setApps] = useState<InstalledApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [launchingApp, setLaunchingApp] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([fetchSystemHardwareSpecs(), fetchInstalledApps()])
        .then(([s, a]) => {
          setSpecs(s);
          setApps(a);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLaunch = async (app: InstalledApplication) => {
    playClick();
    setLaunchingApp(app.id);
    setStatusMessage(`Requesting launch authorization for ${app.name}...`);
    try {
      const res = await launchApplication(app.id);
      playSuccess();
      setStatusMessage(`SUCCESS: ${res.message}`);
      if (onSpeak && res.speechResponse) {
        onSpeak(res.speechResponse);
      }
    } catch (err: any) {
      playError();
      setStatusMessage(`Launch failed: ${err.message}`);
    } finally {
      setLaunchingApp(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn font-rajdhani">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#030712] border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/30 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl border border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_#22d3ee]">
              <Monitor className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-extrabold text-base tracking-widest text-cyan-300 text-glow-cyan">
                  COMPUTER CONTROL & HARDWARE CORE
                </span>
                <span className="font-tech text-xs bg-cyan-950 border border-cyan-400/60 text-cyan-200 px-2.5 py-0.5 rounded-full font-bold">
                  AUTONOMOUS OS BRIDGE
                </span>
              </div>
              <p className="font-tech text-xs text-cyan-400/70">
                HARDWARE TELEMETRY • APPLICATION LAUNCHER • FILE ACCESS CONTROLS • EMERGENCY HALT
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        {statusMessage && (
          <div className="px-6 py-2 bg-cyan-950/40 border-b border-cyan-500/20 text-xs font-mono text-cyan-300 flex items-center justify-between">
            <span className="truncate">{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-cyan-400 ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hardware Telemetry Strip */}
          {specs && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-slate-900/60 space-y-1">
                <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" /> PROCESSOR
                </div>
                <div className="font-bold text-slate-100 truncate">{specs.cpuModel}</div>
                <div className="font-mono text-cyan-400 text-[11px]">{specs.cpuCores} Physical Cores</div>
              </div>

              <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-slate-900/60 space-y-1">
                <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> RAM UTILIZATION
                </div>
                <div className="font-bold text-slate-100">{specs.memoryUsagePercent}% Active</div>
                <div className="font-mono text-emerald-400 text-[11px]">
                  {(specs.freeMemoryBytes / (1024 * 1024 * 1024)).toFixed(1)} GB Free
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-slate-900/60 space-y-1">
                <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-purple-400" /> OPERATING SYSTEM
                </div>
                <div className="font-bold text-slate-100 truncate">{specs.platform}</div>
                <div className="font-mono text-purple-300 text-[11px]">{specs.architecture} Architecture</div>
              </div>

              <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-slate-900/60 space-y-1">
                <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> UPTIME
                </div>
                <div className="font-bold text-slate-100">
                  {Math.floor(specs.uptimeSeconds / 3600)}h {Math.floor((specs.uptimeSeconds % 3600) / 60)}m
                </div>
                <div className="font-mono text-amber-300 text-[11px]">Continuous Link</div>
              </div>
            </div>
          )}

          {/* Installed Applications & Game Launchers */}
          <div className="space-y-3">
            <div className="text-xs font-orbitron font-bold text-cyan-300 flex items-center justify-between">
              <span>AUTHORIZED DESKTOP APPLICATIONS & GAMES</span>
              <span className="font-mono text-slate-400 text-[11px]">
                {apps.length} APPS DETECTED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="p-3.5 rounded-xl border border-cyan-500/20 bg-slate-900/60 flex items-center justify-between gap-3 hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-2xl">{app.icon}</span>
                    <div className="truncate">
                      <div className="font-bold text-xs text-slate-200 truncate">{app.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">
                        Category: {app.category.toUpperCase()} • {app.status.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLaunch(app)}
                    disabled={launchingApp === app.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron font-bold shrink-0 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>{launchingApp === app.id ? 'LAUNCHING...' : 'LAUNCH'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Direct File System Link */}
          {onOpenFileModifier && (
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-950/80 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold text-xs text-cyan-300 font-orbitron">
                  AUTONOMOUS PROJECT FILE EXPLORER & EDITOR
                </div>
                <div className="text-[11px] text-slate-400">
                  Inspect, create, edit, rename, and delete authorized project source files directly on disk.
                </div>
              </div>

              <button
                onClick={() => {
                  playClick();
                  onClose();
                  onOpenFileModifier();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-cyan-400 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 font-orbitron text-xs font-bold cursor-pointer shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>OPEN FILE EDITOR</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
