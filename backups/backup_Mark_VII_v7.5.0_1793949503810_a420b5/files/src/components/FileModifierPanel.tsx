import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileCode,
  FolderTree,
  Sparkles,
  Lock,
  RotateCcw,
  Play,
  CheckCircle2,
  RefreshCw,
  Eye,
  ShieldCheck,
  Check,
  X,
  Edit3,
  Cpu,
} from 'lucide-react';
import { playClick, playAlert, playWakeChime, playResponseChime } from '../utils/soundEffects';

export interface FileItem {
  name: string;
  relativePath: string;
  category: string;
  sizeBytes: number;
  lines?: number;
  sha256?: string;
  lastModified: string;
  hasBackup: boolean;
}

interface FileModifierPanelProps {
  onSpeak?: (text: string) => void;
  onFileModified?: (fileName: string) => void;
}

export const FileModifierPanel: React.FC<FileModifierPanelProps> = ({ onSpeak, onFileModified }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'frontend' | 'backend' | 'protocols' | 'config'>('all');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [editableContent, setEditableContent] = useState<string>('');
  const [editorMode, setEditorMode] = useState<'ai' | 'direct'>('ai');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Proposal & Diff State
  const [directiveInput, setDirectiveInput] = useState<string>('');
  const [isProposing, setIsProposing] = useState<boolean>(false);
  const [proposalData, setProposalData] = useState<{
    filePath: string;
    fileName: string;
    isNewFile: boolean;
    currentContent: string;
    proposedContent: string;
    diffPreview: string;
    summary: string;
    speechText: string;
  } | null>(null);

  // Authorization & Apply State
  const [userConfirmed, setUserConfirmed] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Protocol Execution State
  const [executingProtocol, setExecutingProtocol] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  // Fetch list of all working application files
  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/files/list');
      const data = await res.json();
      if (data.files && Array.isArray(data.files)) {
        setFiles(data.files);
        if (!selectedFile && data.files.length > 0) {
          handleSelectFile(data.files[0].relativePath);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch files:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Fetch file content
  const handleSelectFile = async (relPath: string) => {
    playClick();
    setSelectedFile(relPath);
    setProposalData(null);
    setUserConfirmed(false);
    setExecutionResult(null);

    try {
      const res = await fetch(`/api/files/content?file=${encodeURIComponent(relPath)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setFileContent(data.content);
        setEditableContent(data.content);
      }
    } catch (e) {
      console.warn('Failed to load file content:', e);
    }
  };

  // Ask JARVIS to propose modification (either via AI directive or Direct Editor content)
  const handleProposeChange = async (overrideDirective?: string, useDirectContent?: boolean) => {
    const directive = overrideDirective || directiveInput || 'Direct source code modification';
    if (!useDirectContent && !directive.trim()) return;
    if (isProposing) return;

    playClick();
    setIsProposing(true);
    setActionNotice(null);
    setProposalData(null);
    setUserConfirmed(false);

    try {
      const res = await fetch('/api/files/propose-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: selectedFile || 'src/utils/autonomousModules.ts',
          directive: directive.trim(),
          customNewContent: useDirectContent ? editableContent : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to propose change');

      setProposalData(data);
      playResponseChime();

      if (onSpeak && data.speechText) {
        onSpeak(data.speechText);
      }
    } catch (err: any) {
      playAlert();
      setActionNotice('Error proposing change: ' + err.message);
    } finally {
      setIsProposing(false);
    }
  };

  // Authorize & Write changes directly to disk with automatic full-application backup + tsc check
  const handleApplyChange = async () => {
    if (!proposalData || !userConfirmed) return;

    playClick();
    setIsApplying(true);

    try {
      const res = await fetch('/api/files/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: proposalData.filePath,
          newContent: proposalData.proposedContent,
          userApproved: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Write authorization failed');

      playWakeChime();
      setActionNotice(data.message);
      if (onSpeak && data.speechText) {
        onSpeak(data.speechText);
      }

      onFileModified?.(data.filePath || data.fileName);
      setProposalData(null);
      setUserConfirmed(false);
      setDirectiveInput('');

      // Refresh file content and list
      await fetchFiles();
      if (selectedFile) {
        handleSelectFile(selectedFile);
      }
    } catch (err: any) {
      playAlert();
      setActionNotice('Write aborted: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  // Rollback file to latest backup
  const handleRollbackFile = async () => {
    if (!selectedFile) return;

    playClick();
    try {
      const res = await fetch('/api/files/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedFile }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rollback failed');

      playWakeChime();
      setActionNotice(data.message);
      if (onSpeak && data.speechText) {
        onSpeak(data.speechText);
      }

      await fetchFiles();
      handleSelectFile(selectedFile);
    } catch (err: any) {
      playAlert();
      setActionNotice('Rollback failed: ' + err.message);
    }
  };

  // Execute protocol dynamically
  const handleExecuteProtocol = async () => {
    if (!selectedFile) return;
    playClick();
    setExecutingProtocol(true);

    try {
      const res = await fetch('/api/files/execute-protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedFile }),
      });

      const data = await res.json();
      playResponseChime();
      setExecutionResult(data);

      if (onSpeak && data.speechText) {
        onSpeak(data.speechText);
      }
    } catch (err: any) {
      playAlert();
      setActionNotice('Execution error: ' + err.message);
    } finally {
      setExecutingProtocol(false);
    }
  };

  const filteredFiles = files.filter((f) => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'protocols') return f.category === 'protocols' || f.category === 'plugins';
    return f.category === categoryFilter;
  });

  const isSourceCodeFile =
    selectedFile?.endsWith('.ts') || selectedFile?.endsWith('.tsx') || selectedFile?.endsWith('.html');

  const quickDirectives = isSourceCodeFile
    ? [
        {
          label: 'Add Quantum Cache Module',
          directive: 'Register Quantum Telemetry Cache module with +38% response efficiency',
        },
        {
          label: 'Add Hindi Voice Optimizer',
          directive: 'Add Devanagari Neural Cadence Optimizer module to autonomous registry',
        },
        {
          label: 'Add Self-Healing Guard',
          directive: 'Add Autonomous Self-Healing Watchdog module to active system',
        },
        {
          label: 'नया AI मॉड्यूल जोड़ो',
          directive: 'जार्विस में नया ऑटोनॉमस सेल्फ-अपग्रेड बूस्टर मॉड्यूल जोड़ो',
        },
      ]
    : [
        { label: 'Power to 4.4 GW', directive: 'Set arc reactor output to 4.4 Gigawatts and boost shields' },
        { label: 'Armed Sentry High Alert', directive: 'Arm night sentry platforms and set status to HIGH_ALERT_ARMED' },
        { label: 'Stealth & Infrared', directive: 'Enable stealth mode and infrared telemetry' },
        { label: 'Noise Filter -28dB', directive: 'Increase noise suppression to -28 dB and optimize Hinglish vocal shift' },
      ];

  return (
    <div className="space-y-4 font-rajdhani text-slate-100">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-cyan-500/20">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-cyan-400" />
            <h3 className="font-orbitron text-sm font-bold tracking-wider text-cyan-300">
              APPLICATION SOURCE CODE, PROTOCOL & CONFIG FILE EDITOR
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            J.A.R.V.I.S. can inspect and modify its own frontend (`src/`), backend (`server.ts`), and protocol/config files with mandatory pre-write full backup and TypeScript compiler verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-tech text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            AUTO FULL-BACKUP + TSC GUARD ACTIVE
          </div>
          <button
            onClick={fetchFiles}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-orbitron rounded-lg transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            RELOAD FILES
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `ALL APP FILES (${files.length})` },
            { id: 'frontend', label: `FRONTEND SRC (${files.filter((f) => f.category === 'frontend').length})` },
            { id: 'backend', label: `BACKEND (${files.filter((f) => f.category === 'backend').length})` },
            {
              id: 'protocols',
              label: `PROTOCOLS & PLUGINS (${files.filter((f) => f.category === 'protocols' || f.category === 'plugins').length})`,
            },
            { id: 'config', label: `CONFIG (${files.filter((f) => f.category === 'config').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                playClick();
                setCategoryFilter(tab.id as any);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-orbitron transition-all shrink-0 ${
                categoryFilter === tab.id
                  ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-bold'
                  : 'bg-slate-900/70 border border-cyan-500/20 text-slate-400 hover:text-cyan-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toggle between AI Propose Mode and Direct Code Editor Mode */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-cyan-500/30 p-1 rounded-lg text-[11px] font-orbitron">
          <button
            onClick={() => {
              playClick();
              setEditorMode('ai');
            }}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
              editorMode === 'ai'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-cyan-300'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            AI MODIFY
          </button>
          <button
            onClick={() => {
              playClick();
              setEditorMode('direct');
            }}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
              editorMode === 'direct'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-cyan-300'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            DIRECT CODE EDITOR
          </button>
        </div>
      </div>

      {/* Action Notice Bar */}
      {actionNotice && (
        <div className="p-3 bg-cyan-950/80 border border-cyan-400/50 rounded-xl text-xs text-cyan-200 flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-tech tracking-wide">{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-[10px] font-orbitron text-cyan-400 hover:text-cyan-200 uppercase"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Main Grid: File List (Left) + File Viewer/Editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Application File Explorer */}
        <div className="lg:col-span-4 space-y-2">
          <div className="font-orbitron text-xs font-bold text-cyan-200 flex items-center justify-between">
            <span>WORKSPACE FILES ({filteredFiles.length})</span>
            <span className="text-[10px] font-tech text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
              LIVE PROJECT DISK
            </span>
          </div>

          <div className="space-y-1.5 max-h-[410px] overflow-y-auto pr-1">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile === file.relativePath;

              return (
                <div
                  key={file.relativePath}
                  onClick={() => handleSelectFile(file.relativePath)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/70 border-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/60 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-orbitron text-xs font-bold text-cyan-100 flex items-center gap-1.5 truncate">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <span className="font-tech text-[10px] text-cyan-300 uppercase px-1 bg-cyan-950/80 rounded border border-cyan-500/20 shrink-0">
                      {file.category}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 truncate mb-1">
                    {file.relativePath}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-tech text-slate-400">
                    <span>
                      {(file.sizeBytes / 1024).toFixed(1)} KB {file.lines ? `• ${file.lines} LOC` : ''}
                    </span>
                    {file.hasBackup && (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Backup Verified
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Rollback Button for selected file */}
          {selectedFile && (
            <button
              onClick={handleRollbackFile}
              className="w-full py-2 px-3 rounded-xl border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 text-xs font-orbitron font-bold flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              RESTORE FILE FROM BACKUP
            </button>
          )}
        </div>

        {/* Right Column: AI Modification Bar / Direct Code Editor & Diff Preview */}
        <div className="lg:col-span-8 space-y-3">
          {/* AI Directive Bar */}
          {editorMode === 'ai' ? (
            <div className="p-3 bg-slate-900/80 border border-cyan-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-orbitron font-bold text-cyan-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  ASK J.A.R.V.I.S. TO MODIFY SELECTED APPLICATION FILE
                </span>
                <span className="font-tech text-[10px] text-cyan-300">
                  Target: {selectedFile || 'None'}
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
                      handleProposeChange();
                    }
                  }}
                  placeholder="Tell JARVIS what change or module to add to this file (Hindi/English)..."
                  className="flex-1 bg-slate-950 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs font-rajdhani text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => handleProposeChange()}
                  disabled={!directiveInput.trim() || isProposing}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-orbitron font-bold text-xs flex items-center gap-1.5 transition-all shadow"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isProposing ? 'SYNTHESIZING...' : 'GENERATE CHANGE'}
                </button>
              </div>

              {/* Quick Directive Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {quickDirectives.map((qd, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDirectiveInput(qd.directive);
                      handleProposeChange(qd.directive);
                    }}
                    className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-rajdhani bg-slate-950 border border-cyan-500/25 hover:border-cyan-400 text-cyan-300 transition-colors"
                  >
                    {qd.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-900/80 border border-cyan-500/30 rounded-xl flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-orbitron font-bold text-cyan-200 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                  DIRECT APPLICATION CODE EDITOR // {selectedFile}
                </div>
                <p className="text-[11px] text-slate-400">
                  Edit the source code below, then click "PREVIEW DIFF & VERIFY" to generate a unified diff and run safe backup & compiler checks.
                </p>
              </div>
              <button
                onClick={() => handleProposeChange('Direct source code modification', true)}
                disabled={isProposing || editableContent === fileContent}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-orbitron font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                {isProposing ? 'PREPARING DIFF...' : 'PREVIEW DIFF & VERIFY'}
              </button>
            </div>
          )}

          {/* PROPOSED DIFF PREVIEW & USER CONFIRMATION BAR */}
          {proposalData ? (
            <div className="p-4 bg-slate-950 border-2 border-cyan-400 rounded-xl space-y-3 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/30">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span className="font-orbitron font-bold text-xs text-cyan-200">
                    UNIFIED DIFF PREVIEW // {proposalData.filePath}
                  </span>
                </div>
                <button
                  onClick={() => setProposalData(null)}
                  className="text-slate-400 hover:text-cyan-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-cyan-100 font-tech">{proposalData.summary}</p>

              {/* Diff Code Box */}
              <div className="max-h-[230px] overflow-y-auto bg-black rounded-lg p-3 border border-cyan-500/25 font-mono text-xs whitespace-pre">
                {proposalData.diffPreview.split('\n').map((line, idx) => {
                  const isAdd = line.startsWith('+');
                  const isRem = line.startsWith('-');
                  const isHunk = line.startsWith('@@');

                  return (
                    <div
                      key={idx}
                      className={
                        isAdd
                          ? 'text-emerald-400 bg-emerald-950/40 px-1 rounded'
                          : isRem
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

              {/* Explicit User Authorization Checkbox */}
              <div className="p-3 bg-slate-900/90 border border-cyan-500/40 rounded-xl space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userConfirmed}
                    onChange={(e) => setUserConfirmed(e.target.checked)}
                    className="mt-0.5 accent-cyan-400 w-4 h-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-cyan-200">
                      I AUTHORIZE J.A.R.V.I.S. TO BACKUP & WRITE TO THIS APP FILE (अनुमोदन करें)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      A complete SHA-256 verified backup of the entire application will be created before writing, followed by an automatic TypeScript compiler check (`tsc --noEmit`).
                    </p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setProposalData(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-orbitron"
                >
                  CANCEL
                </button>

                <button
                  onClick={handleApplyChange}
                  disabled={!userConfirmed || isApplying}
                  className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 text-slate-950 font-orbitron font-bold text-xs rounded-lg transition-all shadow-lg shadow-cyan-500/25"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {isApplying ? 'BACKING UP, WRITING & VERIFYING...' : 'AUTHORIZE, BACKUP & WRITE FILE'}
                </button>
              </div>
            </div>
          ) : (
            /* Current File Content Viewer / Direct Editor */
            <div className="p-3.5 bg-slate-950/90 border border-cyan-500/25 rounded-xl space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20 text-xs font-orbitron">
                <span className="text-cyan-200 font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  {editorMode === 'direct' ? 'EDITING APP FILE:' : 'ACTIVE APP FILE:'} {selectedFile || 'Select a file'}
                </span>

                <div className="flex items-center gap-2">
                  {selectedFile?.includes('protocols') && (
                    <button
                      onClick={handleExecuteProtocol}
                      disabled={executingProtocol}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-950/60 border border-emerald-500/50 hover:bg-emerald-900/60 text-emerald-300 rounded-lg text-[11px] font-orbitron transition-all"
                    >
                      <Play className="w-3 h-3 text-emerald-400" />
                      {executingProtocol ? 'RUNNING...' : 'EXECUTE PROTOCOL'}
                    </button>
                  )}
                </div>
              </div>

              {editorMode === 'direct' ? (
                <textarea
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  rows={14}
                  spellCheck={false}
                  className="w-full bg-black/80 rounded-lg p-3 border border-cyan-500/40 font-mono text-xs text-cyan-100 focus:outline-none focus:border-cyan-400 resize-y"
                />
              ) : (
                <div className="max-h-[320px] overflow-y-auto bg-black/60 rounded-lg p-3 border border-cyan-500/15 font-mono text-xs text-cyan-100 whitespace-pre">
                  {fileContent || '// Select a file from the list on the left.'}
                </div>
              )}

              {/* Execution Result Display */}
              {executionResult && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-orbitron text-emerald-300 font-bold">
                    <span>PROTOCOL EXECUTION RESULT: {executionResult.protocolName}</span>
                    <span className="text-[10px] font-tech text-emerald-400 bg-emerald-950 px-1.5 rounded">
                      STATUS: {executionResult.status}
                    </span>
                  </div>
                  <div className="bg-black/80 p-2 rounded text-[11px] font-mono text-emerald-200 whitespace-pre overflow-x-auto">
                    {JSON.stringify(executionResult.telemetry, null, 2)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
