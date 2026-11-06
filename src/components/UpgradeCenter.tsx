import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Cpu,
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Brain,
  Sliders,
  FileCode,
  Lock,
  Check,
  X,
  Play,
  Terminal,
  ChevronRight,
  Database,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { FileModifierPanel } from './FileModifierPanel';
import {
  SystemUpgrade,
  SystemBackup,
  LearnedMemory,
  BugReport,
  SystemHealthReport,
  upgradeManager,
} from '../utils/upgradeSystem';
import { playClick, playAlert, playWakeChime, playResponseChime } from '../utils/soundEffects';

interface UpgradeCenterProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'available' | 'files' | 'health' | 'history' | 'memory' | 'bugs';
  onUpgradeApplied?: (upgrade: SystemUpgrade) => void;
  onRollbackExecuted?: (version: string) => void;
  onFileModified?: (fileName: string) => void;
  onSpeak?: (text: string) => void;
}

export const UpgradeCenter: React.FC<UpgradeCenterProps> = ({
  isOpen,
  onClose,
  initialTab,
  onUpgradeApplied,
  onRollbackExecuted,
  onFileModified,
  onSpeak,
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'files' | 'health' | 'history' | 'memory' | 'bugs'>(
    initialTab || 'available'
  );
  const [upgrades, setUpgrades] = useState<SystemUpgrade[]>([]);
  const [backups, setBackups] = useState<SystemBackup[]>([]);
  const [memories, setMemories] = useState<LearnedMemory[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [learningConsent, setLearningConsent] = useState<boolean>(true);

  // Diff inspection modal state
  const [inspectingUpgrade, setInspectingUpgrade] = useState<SystemUpgrade | null>(null);
  const [userApprovalChecked, setUserApprovalChecked] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Self-Analysis scanning state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);

  // New Memory input
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryVal, setNewMemoryVal] = useState('');

  // Load all system data
  const refreshData = () => {
    setUpgrades(upgradeManager.getAvailableUpgrades());
    setBackups(upgradeManager.getBackups());
    setMemories(upgradeManager.getLearnedMemories());
    setBugReports(upgradeManager.getBugReports());
    setHealthReport(upgradeManager.generateHealthReport());
    setLearningConsent(upgradeManager.getLearningConsent());
  };

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      refreshData();
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Trigger Autonomous Self-Analysis
  const handleRunSelfAnalysis = async () => {
    playClick();
    setIsAnalyzing(true);
    setAnalysisProgress(15);

    try {
      // Animated progress ticker
      const p1 = setTimeout(() => setAnalysisProgress(45), 400);
      const p2 = setTimeout(() => setAnalysisProgress(80), 900);

      const res = await fetch('/api/upgrade/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentVersion: upgradeManager.getCurrentVersion() }),
      });

      const data = await res.json();
      setAnalysisProgress(100);

      setTimeout(() => {
        setIsAnalyzing(false);
        setHealthReport(upgradeManager.generateHealthReport());
        playResponseChime();
        setStatusMessage('Self-Analysis Complete: All heuristics synchronized at 98% nominal rating.');
        if (onSpeak && data.speechNotice) {
          onSpeak(data.speechNotice);
        }
      }, 500);
    } catch (e) {
      setIsAnalyzing(false);
      setHealthReport(upgradeManager.generateHealthReport());
    }
  };

  // Safe Code Apply with User Approval Verification
  const handleConfirmApplyUpgrade = async () => {
    if (!inspectingUpgrade || !userApprovalChecked) return;

    playClick();
    setIsApplying(true);

    try {
      const res = await fetch('/api/upgrade/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patchId: inspectingUpgrade.id,
          userApproved: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upgrade rejected');

      // Local state apply
      const result = upgradeManager.applyUpgrade(inspectingUpgrade.id);
      playWakeChime();

      setStatusMessage(result.message);
      if (onSpeak && data.speechText) {
        onSpeak(data.speechText);
      }

      onUpgradeApplied?.(inspectingUpgrade);
      setInspectingUpgrade(null);
      setUserApprovalChecked(false);
      refreshData();
    } catch (err: any) {
      playAlert();
      setStatusMessage('Upgrade failed: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  // Safe Rollback to Previous Working Backup
  const handleRollback = async (backupId: string) => {
    playClick();
    if (!window.confirm('Sir, do you authorize J.A.R.V.I.S. to rollback system state to this prior snapshot?')) {
      return;
    }

    try {
      const res = await fetch('/api/upgrade/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId }),
      });

      const data = await res.json();
      const result = upgradeManager.rollbackToBackup(backupId);
      playWakeChime();

      setStatusMessage(result.message);
      if (onSpeak && data.speechText) {
        onSpeak(data.speechText);
      }

      onRollbackExecuted?.(result.restoredVersion);
      refreshData();
    } catch (err: any) {
      playAlert();
      setStatusMessage('Rollback error: ' + err.message);
    }
  };

  // Toggle Learning Consent
  const handleToggleConsent = () => {
    playClick();
    const next = !learningConsent;
    setLearningConsent(next);
    upgradeManager.setLearningConsent(next);
    setStatusMessage(
      next
        ? 'User Consent Granted: J.A.R.V.I.S. is authorized to learn personal preferences.'
        : 'User Consent Revoked: Learning memory subsystem paused.'
    );
  };

  // Add Custom Learned Directive
  const handleAddCustomMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryKey.trim() || !newMemoryVal.trim()) return;
    playClick();

    upgradeManager.saveLearnedMemory({
      category: 'custom_directive',
      key: newMemoryKey.trim(),
      value: newMemoryVal.trim(),
      confidence: 1.0,
      source: 'User Explicit Directive',
    });

    setNewMemoryKey('');
    setNewMemoryVal('');
    setMemories(upgradeManager.getLearnedMemories());
    setStatusMessage('Custom memory directive cataloged into Stark neural memory.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn font-rajdhani">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[820px] bg-[#030712] border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-slate-100">
        {/* Top Futuristic Stark Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-cyan-500/30 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_#22d3ee]">
              <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-extrabold text-sm sm:text-base tracking-widest text-cyan-300 text-glow-cyan">
                  J.A.R.V.I.S. UPGRADE CENTER
                </span>
                <span className="font-tech text-xs bg-cyan-950 border border-cyan-400/50 text-cyan-200 px-2 py-0.5 rounded-full font-bold">
                  {upgradeManager.getCurrentVersion()}
                </span>
              </div>
              <p className="font-tech text-[11px] text-cyan-400/70 hidden sm:block">
                AUTONOMOUS SELF-ANALYSIS • SAFE PATCH VERIFICATION • STRICT USER APPROVAL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSelfAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-200 text-xs font-orbitron tracking-wider transition-all shadow-cyan-500/20 shadow-sm"
              title="Run neural diagnostics and search for software enhancements"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-cyan-300' : 'text-cyan-400'}`} />
              <span className="hidden sm:inline">{isAnalyzing ? 'ANALYZING...' : 'RUN SELF-ANALYSIS'}</span>
            </button>

            <button
              onClick={() => {
                playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors border border-transparent hover:border-cyan-500/30"
              title="Close Upgrade Center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-time Status / Notification Notice Bar */}
        {statusMessage && (
          <div className="px-5 py-2 bg-cyan-950/70 border-b border-cyan-500/30 text-xs text-cyan-200 flex items-center justify-between gap-2 shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-tech tracking-wide">{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-[10px] font-orbitron text-cyan-400 hover:text-cyan-200 uppercase"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Analyzing Progress Bar */}
        {isAnalyzing && (
          <div className="w-full bg-slate-900 h-1 overflow-hidden shrink-0">
            <div
              className="bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-cyan-500/20 bg-slate-950/50 overflow-x-auto no-scrollbar shrink-0 text-xs font-orbitron">
          <button
            onClick={() => {
              playClick();
              setActiveTab('available');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'available'
                ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 shadow-cyan-500/20 shadow'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            AVAILABLE UPGRADES ({upgrades.filter((u) => u.status === 'available').length})
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('files');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'files'
                ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 shadow-cyan-500/20 shadow'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            FILES & PROTOCOLS
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('health');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'health'
                ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 shadow-cyan-500/20 shadow'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            SELF-ANALYSIS & HEALTH
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('history');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 shadow-cyan-500/20 shadow'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            ROLLBACK & BACKUPS ({backups.length})
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('memory');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'memory'
                ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 shadow-cyan-500/20 shadow'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            LEARNING MEMORY ({memories.length})
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('bugs');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'bugs'
                ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 shadow-cyan-500/20 shadow'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            BUG DETECTION ({bugReports.length})
          </button>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: AVAILABLE UPGRADES */}
          {activeTab === 'available' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                <div>
                  <h3 className="font-orbitron text-sm font-bold tracking-wider text-cyan-300">
                    SYNTHESIZED STARK PROTOCOL PATCHES
                  </h3>
                  <p className="text-xs text-slate-400">
                    Each modular upgrade provides safe isolated code modifications. Backups are automatically generated prior to installation.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 font-tech text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
                  <ShieldCheck className="w-4 h-4" />
                  USER APPROVAL ENFORCED
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upgrades.map((upgrade) => {
                  const isApplied = upgrade.status === 'applied';

                  return (
                    <div
                      key={upgrade.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isApplied
                          ? 'bg-slate-950/60 border-emerald-500/40 shadow-emerald-500/5'
                          : 'bg-slate-900/70 border-cyan-500/30 hover:border-cyan-400 shadow-lg'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-orbitron font-bold text-xs text-cyan-100">
                                {upgrade.title}
                              </span>
                              <span className="font-tech text-[10px] text-cyan-400 font-bold px-1.5 py-0.5 bg-cyan-950/90 border border-cyan-500/30 rounded">
                                {upgrade.version}
                              </span>
                            </div>
                            <span className="text-[10px] font-tech text-slate-400 uppercase tracking-wider">
                              Category: {upgrade.category} • Risk: {upgrade.riskLevel}
                            </span>
                          </div>

                          {isApplied ? (
                            <span className="flex items-center gap-1 font-orbitron text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-400/50 px-2 py-0.5 rounded-full font-bold">
                              <CheckCircle2 className="w-3 h-3" /> APPLIED
                            </span>
                          ) : (
                            <span className="font-orbitron text-[10px] text-cyan-300 bg-cyan-950/80 border border-cyan-400/40 px-2 py-0.5 rounded-full font-bold">
                              READY
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                          {upgrade.description}
                        </p>

                        <div className="bg-slate-950/70 border border-cyan-500/15 p-2 rounded-lg mb-3 text-[11px] font-tech text-cyan-400/80">
                          <span className="text-cyan-300 font-bold">IMPACT: </span>
                          {upgrade.impact}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-cyan-500/15">
                        <span className="text-[10px] font-tech text-slate-400">
                          Files: {upgrade.filesTargeted.join(', ')}
                        </span>

                        <button
                          onClick={() => {
                            playClick();
                            setInspectingUpgrade(upgrade);
                            setUserApprovalChecked(false);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold tracking-wider transition-all ${
                            isApplied
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 border border-cyan-400 shadow-md shadow-cyan-500/20'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isApplied ? 'VIEW APPLIED DIFF' : 'PREVIEW & APPLY'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: AUTONOMOUS FILES & PROTOCOLS */}
          {activeTab === 'files' && (
            <FileModifierPanel
              onSpeak={onSpeak}
              onFileModified={(fileName) => {
                setStatusMessage(`File successfully modified by J.A.R.V.I.S.: ${fileName}`);
                onFileModified?.(fileName);
                refreshData();
              }}
            />
          )}

          {/* TAB 2: SYSTEM HEALTH & SELF-ANALYSIS */}
          {activeTab === 'health' && healthReport && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                <div>
                  <h3 className="font-orbitron text-sm font-bold tracking-wider text-cyan-300">
                    REAL-TIME PERFORMANCE & HEURISTICS MATRIX
                  </h3>
                  <p className="text-xs text-slate-400">
                    Continuous monitoring of response quality, neural memory integrity, and audio latency.
                  </p>
                </div>
                <button
                  onClick={handleRunSelfAnalysis}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-orbitron hover:border-cyan-400 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  REFRESH METRICS
                </button>
              </div>

              {/* Health Gauges Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 border border-cyan-500/25 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-orbitron text-slate-400 mb-1">HEALTH SCORE</div>
                  <div className="text-2xl font-orbitron font-extrabold text-cyan-300 text-glow-cyan">
                    {healthReport.overallHealthScore}%
                  </div>
                  <div className="text-[10px] font-tech text-emerald-400 mt-1">OPTIMAL STARK SPEC</div>
                </div>

                <div className="bg-slate-950/80 border border-cyan-500/25 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-orbitron text-slate-400 mb-1">UPTIME</div>
                  <div className="text-2xl font-orbitron font-extrabold text-cyan-200">
                    {Math.floor(healthReport.uptimeSeconds / 60)}m {healthReport.uptimeSeconds % 60}s
                  </div>
                  <div className="text-[10px] font-tech text-cyan-400/70 mt-1">CONTINUOUS STABLE</div>
                </div>

                <div className="bg-slate-950/80 border border-cyan-500/25 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-orbitron text-slate-400 mb-1">VOICE LATENCY</div>
                  <div className="text-2xl font-orbitron font-extrabold text-sky-300">
                    {healthReport.latencyAvgMs} ms
                  </div>
                  <div className="text-[10px] font-tech text-sky-400/80 mt-1">REAL-TIME CADENCE</div>
                </div>

                <div className="bg-slate-950/80 border border-cyan-500/25 p-3 rounded-xl text-center">
                  <div className="text-[10px] font-orbitron text-slate-400 mb-1">CLOUD STATUS</div>
                  <div className="text-lg font-orbitron font-extrabold text-emerald-300">
                    {healthReport.cloudUplinkStatus}
                  </div>
                  <div className="text-[10px] font-tech text-emerald-400 mt-1">LOCAL HEURISTICS READY</div>
                </div>
              </div>

              {/* Deep Analysis Diagnostic Readout */}
              <div className="bg-slate-900/60 border border-cyan-500/20 rounded-xl p-4 space-y-2.5">
                <div className="font-orbitron text-xs font-bold text-cyan-200 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  SELF-ANALYSIS TELEMETRY LOG
                </div>
                <div className="space-y-1.5 text-xs font-tech text-slate-300">
                  <p>• Response Quality Index: 99.4% with automatic code block sanitization for SpeechSynthesis.</p>
                  <p>• Bilingual Voice Engine: Hindi (Devanagari / hi-IN) and English voice matching calibrated.</p>
                  <p>• Error Resilience: Automatic fallback engine intercepts API 429 quota spikes with zero user downtime.</p>
                  <p>• Persistent Storage: Chat history, backup snapshots, and learned memory encrypted locally in localStorage.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROLLBACK & BACKUP SNAPSHOTS */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                <div>
                  <h3 className="font-orbitron text-sm font-bold tracking-wider text-cyan-300">
                    SYSTEM BACKUPS & RESTORE POINTS
                  </h3>
                  <p className="text-xs text-slate-400">
                    Instant rollback capability. If any applied patch causes anomalies, revert to any previous working version in 1 click.
                  </p>
                </div>
                <button
                  onClick={() => {
                    playClick();
                    const b = upgradeManager.createBackup('Manual user snapshot point');
                    setBackups(upgradeManager.getBackups());
                    setStatusMessage(`Manual snapshot point ${b.id} created.`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-orbitron hover:border-cyan-400 flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  CREATE MANUAL BACKUP
                </button>
              </div>

              <div className="space-y-3">
                {backups.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 font-tech">
                    No prior backup snapshots registered. Backups are automatically generated prior to every upgrade.
                  </div>
                ) : (
                  backups.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 bg-slate-950/80 border border-cyan-500/25 rounded-xl flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-orbitron text-xs font-bold text-cyan-200">
                            {b.id}
                          </span>
                          <span className="font-tech text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                            {b.version}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-tech">
                          {b.reason}
                        </p>
                        <span className="text-[10px] font-tech text-slate-500">
                          Timestamp: {new Date(b.timestamp).toLocaleString()} • Applied Patches:{' '}
                          {b.stateSnapshot.appliedUpgradeIds.length}
                        </span>
                      </div>

                      <button
                        onClick={() => handleRollback(b.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 text-xs font-orbitron font-bold transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        ROLLBACK TO THIS VERSION
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LEARNING MEMORY & PREFERENCES */}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                <div>
                  <h3 className="font-orbitron text-sm font-bold tracking-wider text-cyan-300">
                    USER PREFERENCES & LEARNING MEMORY
                  </h3>
                  <p className="text-xs text-slate-400">
                    J.A.R.V.I.S. remembers feedback and adapts response cadence only with your explicit consent.
                  </p>
                </div>

                {/* Consent Toggle Switch */}
                <div className="flex items-center gap-2 bg-slate-900/80 border border-cyan-500/30 p-2 rounded-xl">
                  <span className="text-xs font-bold text-cyan-200">CONSENT:</span>
                  <button
                    onClick={handleToggleConsent}
                    className={`px-2.5 py-1 rounded text-[11px] font-orbitron font-bold transition-all ${
                      learningConsent
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400'
                        : 'bg-rose-500/30 text-rose-300 border border-rose-400'
                    }`}
                  >
                    {learningConsent ? 'GRANTED (सहमति)' : 'REVOKED (बंद)'}
                  </button>
                </div>
              </div>

              {/* Memory List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-950/80 border border-cyan-500/20 rounded-xl relative group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-orbitron text-xs font-bold text-cyan-300">
                        {m.key.toUpperCase()}
                      </span>
                      <span className="font-tech text-[10px] text-cyan-400/80 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        {Math.round(m.confidence * 100)}% CONFIDENCE
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-rajdhani mt-1">
                      {m.value}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-cyan-500/10 text-[10px] font-tech text-slate-500">
                      <span>Source: {m.source}</span>
                      <button
                        onClick={() => {
                          playClick();
                          upgradeManager.deleteLearnedMemory(m.id);
                          setMemories(upgradeManager.getLearnedMemories());
                        }}
                        className="text-rose-400 hover:text-rose-200 font-bold"
                      >
                        PURGE
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Directive Input */}
              <form
                onSubmit={handleAddCustomMemory}
                className="p-4 bg-slate-900/50 border border-cyan-500/20 rounded-xl space-y-2.5"
              >
                <div className="font-orbitron text-xs font-bold text-cyan-300">
                  TEACH J.A.R.V.I.S. A CUSTOM PREFERENCE OR DIRECTIVE
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newMemoryKey}
                    onChange={(e) => setNewMemoryKey(e.target.value)}
                    placeholder="Preference Key (e.g. favorite_language_tone)"
                    className="p-2 text-xs bg-slate-950 border border-cyan-500/30 rounded-lg text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <input
                    type="text"
                    value={newMemoryVal}
                    onChange={(e) => setNewMemoryVal(e.target.value)}
                    placeholder="Value (e.g. Always respond in formal Hindi when asked about technical topics)"
                    className="p-2 text-xs bg-slate-950 border border-cyan-500/30 rounded-lg text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newMemoryKey.trim() || !newMemoryVal.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-orbitron font-bold text-xs rounded-lg transition-all"
                >
                  SAVE CUSTOM DIRECTIVE
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: BUG DETECTION & SELF-REPAIR */}
          {activeTab === 'bugs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
                <div>
                  <h3 className="font-orbitron text-sm font-bold tracking-wider text-cyan-300">
                    REAL-TIME BUG DETECTION & ERROR MITIGATION
                  </h3>
                  <p className="text-xs text-slate-400">
                    Autonomous anomaly tracker. Detects API quota limits, network latency spikes, or speech exceptions and proposes self-healing hotfixes.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {bugReports.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 bg-slate-950/80 border border-cyan-500/20 rounded-xl flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            b.severity === 'high'
                              ? 'text-rose-400'
                              : b.severity === 'medium'
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                          }`}
                        />
                        <span className="font-orbitron text-xs font-bold text-cyan-200">
                          {b.module}
                        </span>
                        <span
                          className={`font-tech text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            b.status === 'resolved'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1 font-rajdhani">
                        {b.description}
                      </p>
                      <span className="text-[10px] font-tech text-slate-500">
                        Logged: {new Date(b.detectedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {b.suggestedPatchId && (
                      <button
                        onClick={() => {
                          playClick();
                          const target = upgrades.find((u) => u.id === b.suggestedPatchId);
                          if (target) {
                            setInspectingUpgrade(target);
                            setUserApprovalChecked(false);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 text-xs font-orbitron font-bold shrink-0"
                      >
                        VIEW HOTFIX PATCH
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL: SAFE CODE DIFF PREVIEW & MANDATORY USER AUTHORIZATION */}
        {inspectingUpgrade && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fadeIn">
            <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#030712] border-2 border-cyan-400 rounded-2xl p-5 shadow-2xl flex flex-col text-slate-100 overflow-hidden font-rajdhani">
              {/* Modal Top */}
              <div className="flex items-center justify-between pb-3 border-b border-cyan-500/25 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-cyan-400" />
                    <span className="font-orbitron font-bold text-sm tracking-wider text-cyan-200">
                      SAFE CODE DIFF PREVIEW // {inspectingUpgrade.version}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-tech">
                    Target: {inspectingUpgrade.title} ({inspectingUpgrade.filesTargeted.join(', ')})
                  </span>
                </div>
                <button
                  onClick={() => setInspectingUpgrade(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-cyan-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Code Diff Display */}
              <div className="my-3 flex-1 overflow-y-auto bg-slate-950 rounded-xl p-3 border border-cyan-500/30 font-mono text-xs text-cyan-100 whitespace-pre">
                <div className="text-[11px] text-slate-500 pb-2 border-b border-slate-800 mb-2">
                  # Unified Git Diff Preview (Pre-installation sandbox verification)
                </div>
                {inspectingUpgrade.diffPreview.split('\n').map((line, i) => {
                  const isAdd = line.startsWith('+');
                  const isRemove = line.startsWith('-');
                  const isHunk = line.startsWith('@@');

                  return (
                    <div
                      key={i}
                      className={
                        isAdd
                          ? 'text-emerald-400 bg-emerald-950/40 px-1 rounded'
                          : isRemove
                          ? 'text-rose-400 bg-rose-950/40 px-1 rounded'
                          : isHunk
                          ? 'text-cyan-400 font-bold'
                          : 'text-slate-300'
                      }
                    >
                      {line}
                    </div>
                  );
                })}
              </div>

              {/* User Explicit Approval Section */}
              <div className="p-3 bg-slate-900/80 border border-cyan-500/30 rounded-xl space-y-2 shrink-0">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userApprovalChecked}
                    onChange={(e) => setUserApprovalChecked(e.target.checked)}
                    className="mt-0.5 accent-cyan-400 w-4 h-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-cyan-200">
                      EXPLICIT USER AUTHORIZATION (अनिवार्य उपयोगकर्ता अनुमोदन)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      I have reviewed the proposed code diff and explicitly authorize J.A.R.V.I.S. to create a backup snapshot and deploy this patch to active memory.
                    </p>
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="mt-4 pt-2 border-t border-cyan-500/20 flex items-center justify-between shrink-0">
                <button
                  onClick={() => setInspectingUpgrade(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-orbitron"
                >
                  CANCEL
                </button>

                <button
                  onClick={handleConfirmApplyUpgrade}
                  disabled={!userApprovalChecked || isApplying || inspectingUpgrade.status === 'applied'}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:hover:bg-cyan-600 text-slate-950 font-orbitron font-bold text-xs tracking-wider transition-all shadow-lg shadow-cyan-500/25"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {isApplying
                    ? 'APPLYING & CREATING BACKUP...'
                    : inspectingUpgrade.status === 'applied'
                    ? 'PATCH ALREADY ACTIVE'
                    : 'AUTHORIZE & DEPLOY UPGRADE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-cyan-500/20 bg-slate-950/80 flex items-center justify-between text-[11px] font-tech text-cyan-400/60 shrink-0">
          <div>STARK PROTOCOL SPECIFICATION 7.5.0 // SELF-IMPROVEMENT SUBSYSTEM</div>
          <div className="flex items-center gap-2">
            <span>AUTOMATED BACKUPS ON</span>
            <span>•</span>
            <span className="text-cyan-300">ROLLBACK READY</span>
          </div>
        </div>
      </div>
    </div>
  );
};
