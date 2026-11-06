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
  Search,
  Plus,
  Trash2,
  FolderPlus,
  Download,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { playClick, playAlert, playWakeChime, playResponseChime, playSuccess, playError } from '../utils/soundEffects';

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
  initialFile?: string | null;
  onSpeak?: (text: string) => void;
  onFileModified?: (fileName: string) => void;
}

export const FileModifierPanel: React.FC<FileModifierPanelProps> = ({
  initialFile,
  onSpeak,
  onFileModified,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'frontend' | 'backend' | 'protocols' | 'config'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ file: string; line: number; text: string }> | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(initialFile || null);
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

  // File Creation Modal State
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [newFilePath, setNewFilePath] = useState('src/components/CustomModule.tsx');
  const [newFileContent, setNewFileContent] = useState('// Autonomous JARVIS Module\nexport const CustomModule = () => null;\n');
  const [newFileApproved, setNewFileApproved] = useState(false);

  // File Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Fetch list of all working application files
  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/files/list');
      const data = await res.json();
      if (data.files && Array.isArray(data.files)) {
        setFiles(data.files);
        const targetToSelect = initialFile || selectedFile || data.files[0]?.relativePath;
        if (targetToSelect) {
          handleSelectFile(targetToSelect);
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
  }, [initialFile]);

  // Fetch file content
  const handleSelectFile = async (relPath: string) => {
    playClick();
    setSelectedFile(relPath);
    setProposalData(null);
    setUserConfirmed(false);
    setActionNotice(null);
    try {
      const res = await fetch(`/api/files/content?file=${encodeURIComponent(relPath)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setFileContent(data.content);
        setEditableContent(data.content);
      }
    } catch (e) {
      console.warn('Failed to fetch file content:', e);
    }
  };

  // Search across project files
  const handleSearchProject = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    playClick();
    try {
      const res = await fetch('/api/files/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), maxResults: 30 }),
      });
      const data = await res.json();
      if (data.matches) {
        setSearchResults(data.matches);
      }
    } catch (e) {
      console.warn('Search failed:', e);
    }
  };

  // AI Proposal Request
  const handleGenerateProposal = async () => {
    if (!selectedFile) return;
    playClick();
    setIsProposing(true);
    setActionNotice(null);
    try {
      const payload: any = {
        filePath: selectedFile,
      };

      if (editorMode === 'ai') {
        if (!directiveInput.trim()) {
          setActionNotice('Please enter an AI modification directive.');
          setIsProposing(false);
          return;
        }
        payload.directive = directiveInput.trim();
      } else {
        payload.customNewContent = editableContent;
      }

      const res = await fetch('/api/files/propose-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate change proposal');
      }

      setProposalData(data);
      playSuccess();
      if (onSpeak && data.speechText) {
        onSpeak(data.speechText);
      }
    } catch (err: any) {
      playError();
      setActionNotice(`Proposal Error: ${err.message}`);
    } finally {
      setIsProposing(false);
    }
  };

  // Apply Changes to Real Project Files on Disk
  const handleApplyChanges = async () => {
    if (!proposalData || !userConfirmed) return;
    playAlert();
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to write modification to disk.');
      }

      playResponseChime();
      setActionNotice(`SUCCESS: ${data.message}`);
      setFileContent(proposalData.proposedContent);
      setEditableContent(proposalData.proposedContent);
      setProposalData(null);
      setUserConfirmed(false);

      if (onFileModified) {
        onFileModified(proposalData.fileName);
      }
      if (onSpeak && data.speechText) {
        onSpeak(data.speechText);
      }
      fetchFiles();
    } catch (err: any) {
      playError();
      setActionNotice(`Write Failed: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Create New File
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim() || !newFileApproved) return;
    playClick();
    try {
      const res = await fetch('/api/files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: newFilePath.trim(),
          content: newFileContent,
          userApproved: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Creation failed');
      playSuccess();
      setIsNewFileModalOpen(false);
      setActionNotice(`Created: ${data.message}`);
      if (onFileModified) onFileModified(newFilePath);
      fetchFiles();
      handleSelectFile(newFilePath);
    } catch (err: any) {
      playError();
      setActionNotice(`Create Error: ${err.message}`);
    }
  };

  // Delete File
  const handleDeleteFile = async () => {
    if (!selectedFile || deleteConfirmText !== 'DELETE') return;
    playAlert();
    try {
      const res = await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: selectedFile,
          userApproved: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deletion failed');
      playSuccess();
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');
      setActionNotice(`Deleted: ${data.message}`);
      if (onFileModified) onFileModified(selectedFile);
      setSelectedFile(null);
      fetchFiles();
    } catch (err: any) {
      playError();
      setActionNotice(`Delete Error: ${err.message}`);
    }
  };

  const filteredFiles = files.filter((f) => {
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    if (searchQuery.trim() && !searchResults) {
      return (
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.relativePath.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#030712] text-slate-100 font-rajdhani overflow-hidden">
      {/* Top Bar with Project Search & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-cyan-500/20 bg-slate-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <div className="font-orbitron font-bold text-sm text-cyan-300">
              AUTONOMOUS PROJECT FILE & SOURCE CODE ENGINE
            </div>
            <div className="font-tech text-xs text-slate-400">
              GENUINE DISK ACCESS • MANDATORY PRE-WRITE BACKUP • SHA-256 INTEGRITY CHECK • ONE-CLICK ROLLBACK
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Companion Agent Button */}
          <a
            href="/api/companion/script"
            download="jarvis-local-agent.mjs"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 text-purple-200 text-xs font-orbitron transition-all"
            title="Download Node.js Companion Agent to run on local laptop/workstation"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LOCAL COMPANION AGENT</span>
          </a>

          <button
            onClick={() => {
              playClick();
              setIsNewFileModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW FILE</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Layout: File Tree & Code Editor */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: File Tree & Project Search */}
        <div className="w-full md:w-80 border-r border-cyan-500/20 bg-slate-950/70 flex flex-col shrink-0 overflow-hidden">
          {/* Search Box */}
          <div className="p-3 border-b border-cyan-500/15 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-cyan-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchProject()}
                placeholder="Search files or code..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono">
              {(['all', 'frontend', 'backend', 'protocols', 'config'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    playClick();
                    setCategoryFilter(cat);
                  }}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-cyan-900/60 border border-cyan-400 text-cyan-200'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results Drawer */}
          {searchResults && (
            <div className="p-2 bg-cyan-950/30 border-b border-cyan-500/20 max-h-40 overflow-y-auto text-xs space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-cyan-300">
                <span>MATCHES ({searchResults.length})</span>
                <button
                  onClick={() => setSearchResults(null)}
                  className="text-cyan-400 hover:text-cyan-200"
                >
                  ✕
                </button>
              </div>
              {searchResults.map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectFile(m.file)}
                  className="p-1.5 rounded bg-slate-900 hover:bg-cyan-950/50 cursor-pointer truncate font-mono text-[11px]"
                >
                  <span className="text-cyan-400">{m.file}</span>:
                  <span className="text-amber-400">{m.line}</span> {m.text}
                </div>
              ))}
            </div>
          )}

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredFiles.map((file) => (
              <div
                key={file.relativePath}
                onClick={() => handleSelectFile(file.relativePath)}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                  selectedFile === file.relativePath
                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-sm'
                    : 'border-transparent text-slate-300 hover:bg-slate-900/70 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{file.relativePath}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-1">
                  {file.lines}L
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Code Editor, AI Directive Console & Diff Preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#020617]">
          {/* Active File Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-cyan-500/20 bg-slate-950 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-xs text-cyan-200 font-bold truncate">
                {selectedFile || 'Select a file to inspect'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Mode Toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-xs font-orbitron">
                <button
                  onClick={() => {
                    playClick();
                    setEditorMode('ai');
                  }}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    editorMode === 'ai' ? 'bg-cyan-950 text-cyan-200 font-bold' : 'text-slate-400'
                  }`}
                >
                  AI DIRECTIVE
                </button>
                <button
                  onClick={() => {
                    playClick();
                    setEditorMode('direct');
                  }}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    editorMode === 'direct' ? 'bg-cyan-950 text-cyan-200 font-bold' : 'text-slate-400'
                  }`}
                >
                  DIRECT SOURCE
                </button>
              </div>

              {selectedFile && (
                <button
                  onClick={() => {
                    playClick();
                    setIsDeleteModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-950/50 transition-all cursor-pointer"
                  title="Delete File (requires explicit approval)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Notice Banner */}
          {actionNotice && (
            <div className="px-4 py-2 bg-cyan-950/60 border-b border-cyan-500/20 text-xs font-mono text-cyan-300 flex items-center justify-between">
              <span className="truncate">{actionNotice}</span>
              <button onClick={() => setActionNotice(null)} className="text-cyan-400 ml-2">
                ✕
              </button>
            </div>
          )}

          {/* Code Viewer / Direct Editor */}
          <div className="flex-1 overflow-hidden relative">
            {editorMode === 'direct' ? (
              <textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                className="w-full h-full p-4 font-mono text-xs bg-[#030712] text-cyan-100 resize-none focus:outline-none border-none selection:bg-cyan-500/30"
                spellCheck={false}
              />
            ) : (
              <pre className="w-full h-full p-4 font-mono text-xs text-slate-300 overflow-auto bg-[#030712] selection:bg-cyan-500/30">
                <code>{fileContent}</code>
              </pre>
            )}
          </div>

          {/* Bottom Directive & Apply Bar */}
          <div className="p-4 border-t border-cyan-500/20 bg-slate-950/95 space-y-3 shrink-0">
            {editorMode === 'ai' ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={directiveInput}
                  onChange={(e) => setDirectiveInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateProposal()}
                  placeholder="Tell JARVIS how to develop or modify this source file..."
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleGenerateProposal}
                  disabled={isProposing}
                  className="px-4 py-2 rounded-xl border border-cyan-400 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Sparkles className={`w-4 h-4 ${isProposing ? 'animate-spin' : ''}`} />
                  <span>{isProposing ? 'ANALYZING...' : 'GENERATE DIFF'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Editing source code directly on disk. Review diff before saving.
                </div>
                <button
                  onClick={handleGenerateProposal}
                  disabled={isProposing}
                  className="px-4 py-2 rounded-xl border border-cyan-400 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Eye className="w-4 h-4" />
                  <span>PREVIEW CHANGES</span>
                </button>
              </div>
            )}

            {/* DIFF PREVIEW & MANDATORY APPROVAL BANNER */}
            {proposalData && (
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-orbitron text-amber-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>PRE-WRITE CHANGE PREVIEW // BACKUP READY</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {proposalData.fileName}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{proposalData.summary}</p>

                <div className="p-2.5 rounded-lg bg-black/70 border border-slate-800 font-mono text-[11px] max-h-36 overflow-y-auto text-slate-200">
                  <pre>{proposalData.diffPreview}</pre>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userConfirmed}
                      onChange={(e) => setUserConfirmed(e.target.checked)}
                      className="rounded border-cyan-500/50 bg-slate-900 text-cyan-400"
                    />
                    <span>I approve this modification to the actual project file on disk.</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProposalData(null)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs font-orbitron"
                    >
                      DISCARD
                    </button>
                    <button
                      onClick={handleApplyChanges}
                      disabled={!userConfirmed || isApplying}
                      className="px-4 py-1.5 rounded-lg border border-emerald-400 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 text-xs font-orbitron font-bold disabled:opacity-50 cursor-pointer shadow-md"
                    >
                      {isApplying ? 'WRITING & TESTING...' : 'CONFIRM & WRITE TO DISK'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW FILE MODAL */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <form
            onSubmit={handleCreateFile}
            className="w-full max-w-lg bg-[#030712] border-2 border-cyan-500/50 rounded-2xl p-6 space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.3)]"
          >
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
              <div className="font-orbitron font-bold text-sm text-cyan-300">
                CREATE NEW PROJECT FILE
              </div>
              <button
                type="button"
                onClick={() => setIsNewFileModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">RELATIVE FILE PATH:</label>
                <input
                  type="text"
                  required
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  placeholder="e.g. src/services/CustomEngine.ts"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">INITIAL FILE CONTENT:</label>
                <textarea
                  rows={6}
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-100 focus:outline-none focus:border-cyan-400 font-mono resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  required
                  checked={newFileApproved}
                  onChange={(e) => setNewFileApproved(e.target.checked)}
                  className="rounded border-cyan-500/50 bg-slate-900 text-cyan-400"
                />
                <span>I authorize JARVIS to create this file on the local filesystem.</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewFileModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs font-orbitron"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!newFileApproved}
                className="px-4 py-1.5 rounded-lg border border-cyan-400 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron font-bold disabled:opacity-50"
              >
                CREATE FILE
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE FILE SAFETY MODAL */}
      {isDeleteModalOpen && selectedFile && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#030712] border-2 border-red-500/60 rounded-2xl p-6 space-y-4 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <div className="flex items-center gap-3 text-red-400 border-b border-red-500/30 pb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div className="font-orbitron font-bold text-sm text-red-300">
                AUTHORIZE FILE DELETION
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                Are you sure you want to permanently delete{' '}
                <span className="font-mono text-red-300 font-bold">{selectedFile}</span>?
              </p>
              <p className="text-slate-400">
                A verified full-project backup will be created before deletion. Type{' '}
                <span className="font-mono text-red-400 font-bold">DELETE</span> to confirm.
              </p>

              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-red-500/40 text-slate-100 font-mono text-center focus:outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs font-orbitron"
              >
                CANCEL
              </button>
              <button
                onClick={handleDeleteFile}
                disabled={deleteConfirmText !== 'DELETE'}
                className="px-4 py-1.5 rounded-lg border border-red-400 bg-red-950 hover:bg-red-900 text-red-100 text-xs font-orbitron font-bold disabled:opacity-50"
              >
                CONFIRM DELETION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
