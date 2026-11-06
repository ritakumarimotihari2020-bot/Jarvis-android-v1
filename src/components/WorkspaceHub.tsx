import React, { useState, useEffect } from 'react';
import {
  Mail,
  Calendar as CalendarIcon,
  HardDrive,
  Users,
  Search,
  Plus,
  Send,
  RefreshCw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  FileText,
  X,
  FileEdit,
} from 'lucide-react';
import {
  listGmailMessages,
  sendGmailMessage,
  createGmailDraft,
  listCalendarEvents,
  createCalendarEvent,
  listDriveFiles,
  listGoogleContacts,
  GmailMessageSummary,
  CalendarEventItem,
  DriveFileItem,
  ContactItem,
  isGoogleConnected,
  googleSignIn,
} from '../utils/workspaceAuth';
import { playClick, playSuccess, playError } from '../utils/soundEffects';

interface WorkspaceHubProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeak?: (text: string) => void;
  onOpenAccounts?: () => void;
}

export const WorkspaceHub: React.FC<WorkspaceHubProps> = ({
  isOpen,
  onClose,
  onSpeak,
  onOpenAccounts,
}) => {
  const [activeTab, setActiveTab] = useState<'gmail' | 'calendar' | 'drive' | 'contacts'>('gmail');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Gmail State
  const [emails, setEmails] = useState<GmailMessageSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<GmailMessageSummary | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);

  // Calendar State
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [newSummary, setNewSummary] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Drive State
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveSearch, setDriveSearch] = useState('');

  // Contacts State
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  const connected = isGoogleConnected();

  // Load active tab data
  const loadData = async () => {
    if (!connected) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      if (activeTab === 'gmail') {
        const list = await listGmailMessages(10, searchQuery);
        setEmails(list);
      } else if (activeTab === 'calendar') {
        const list = await listCalendarEvents(10);
        setEvents(list);
      } else if (activeTab === 'drive') {
        const list = await listDriveFiles(15, driveSearch);
        setDriveFiles(list);
      } else if (activeTab === 'contacts') {
        const list = await listGoogleContacts(25);
        setContacts(list);
      }
    } catch (err: any) {
      console.error('[WorkspaceHub Error]', err);
      setStatusMessage(`Error loading ${activeTab}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && connected) {
      loadData();
    }
  }, [isOpen, activeTab, connected]);

  if (!isOpen) return null;

  // Handle Send Email with explicit user confirmation
  const handleConfirmSendEmail = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) {
      alert('Recipient and Subject are required.');
      return;
    }
    playClick();
    setLoading(true);
    try {
      await sendGmailMessage(composeTo.trim(), composeSubject.trim(), composeBody.trim());
      playSuccess();
      setShowSendConfirmation(false);
      setIsComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setStatusMessage(`Email successfully dispatched to ${composeTo}`);
      if (onSpeak) {
        onSpeak(`Sir, email has been dispatched to ${composeTo}.`);
      }
      loadData();
    } catch (err: any) {
      playError();
      setStatusMessage(`Failed to send email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Draft
  const handleSaveDraft = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) {
      alert('Recipient and Subject are required.');
      return;
    }
    playClick();
    setLoading(true);
    try {
      await createGmailDraft(composeTo.trim(), composeSubject.trim(), composeBody.trim());
      playSuccess();
      setIsComposeOpen(false);
      setStatusMessage('Draft saved to your Gmail account.');
      if (onSpeak) {
        onSpeak('Sir, I have saved the draft to your Gmail account.');
      }
    } catch (err: any) {
      playError();
      setStatusMessage(`Failed to save draft: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Calendar Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSummary.trim() || !newStart || !newEnd) {
      alert('Please provide Title, Start Time, and End Time.');
      return;
    }
    playClick();
    setLoading(true);
    try {
      const created = await createCalendarEvent(
        newSummary.trim(),
        new Date(newStart).toISOString(),
        new Date(newEnd).toISOString(),
        newDesc.trim()
      );
      playSuccess();
      setIsNewEventOpen(false);
      setNewSummary('');
      setNewStart('');
      setNewEnd('');
      setNewDesc('');
      setStatusMessage(`Calendar event created: ${created.summary}`);
      if (onSpeak) {
        onSpeak(`Sir, appointment ${created.summary} has been added to your Google Calendar.`);
      }
      loadData();
    } catch (err: any) {
      playError();
      setStatusMessage(`Failed to create event: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // AI Summarize Inbox
  const handleAiSummarizeInbox = () => {
    playClick();
    if (emails.length === 0) {
      setStatusMessage('No recent emails in view to summarize.');
      return;
    }
    const unreadCount = emails.filter((e) => e.unread).length;
    const senders = Array.from(new Set(emails.map((e) => e.from.split('<')[0].trim()))).slice(0, 3);
    const summary = `Inbox Intel: ${emails.length} recent messages loaded (${unreadCount} unread). Key correspondents include ${senders.join(
      ', '
    )}. Priority items involve upcoming schedules, system alerts, and correspondence.`;
    setStatusMessage(summary);
    if (onSpeak) {
      onSpeak(
        `Sir, you have ${unreadCount} unread emails out of ${emails.length} recent messages from ${senders.join(
          ', '
        )}.`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn font-rajdhani">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-[#030712] border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-cyan-500/30 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl border border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_#22d3ee]">
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-extrabold text-base tracking-widest text-cyan-300 text-glow-cyan">
                  GOOGLE WORKSPACE INTELLIGENCE HUB
                </span>
                <span className="font-tech text-xs bg-cyan-950 border border-cyan-400/60 text-cyan-200 px-2.5 py-0.5 rounded-full font-bold">
                  GMAIL • CALENDAR • DRIVE • CONTACTS
                </span>
              </div>
              <p className="font-tech text-xs text-cyan-400/70">
                PERSONAL AI WORKSPACE AGENT • ZERO-PASSWORD OAUTH 2.0 • MANDATORY APPROVAL FOR SENDS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading || !connected}
              className="p-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
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
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-950/90 border-b border-cyan-500/20 shrink-0 overflow-x-auto">
          <button
            onClick={() => {
              playClick();
              setActiveTab('gmail');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-orbitron transition-all cursor-pointer ${
              activeTab === 'gmail'
                ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'text-slate-400 hover:text-cyan-300 border border-transparent'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>GMAIL INBOX</span>
            {emails.length > 0 && (
              <span className="font-mono text-[10px] bg-cyan-900/60 px-1.5 py-0.5 rounded">
                {emails.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('calendar');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-orbitron transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'text-slate-400 hover:text-cyan-300 border border-transparent'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>CALENDAR AGENDA</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('drive');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-orbitron transition-all cursor-pointer ${
              activeTab === 'drive'
                ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'text-slate-400 hover:text-cyan-300 border border-transparent'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>GOOGLE DRIVE</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('contacts');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-orbitron transition-all cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'text-slate-400 hover:text-cyan-300 border border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>CONTACTS DIRECTORY</span>
          </button>
        </div>

        {/* Status Bar */}
        {statusMessage && (
          <div className="px-6 py-2 bg-cyan-950/40 border-b border-cyan-500/20 text-xs font-mono text-cyan-300 flex items-center justify-between">
            <span className="truncate">{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-cyan-400 hover:text-cyan-200 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Not Connected State */}
        {!connected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center">
              <Mail className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="font-orbitron font-bold text-lg text-cyan-300">
                GOOGLE WORKSPACE DISCONNECTED
              </h3>
              <p className="text-xs text-slate-400">
                Connect your personal Google account via secure Google OAuth 2.0 to give JARVIS
                access to summarize emails, schedule appointments, and organize files.
              </p>
            </div>
            <button
              onClick={async () => {
                playClick();
                try {
                  await googleSignIn();
                  playSuccess();
                  loadData();
                } catch (e: any) {
                  playError();
                  setStatusMessage(`Sign-in aborted: ${e.message}`);
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-sans font-bold text-xs hover:bg-slate-100 transition-all shadow-lg cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">
            {/* TAB 1: GMAIL */}
            {activeTab === 'gmail' && (
              <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                {/* Search & Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-cyan-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadData()}
                        placeholder="Search emails by sender or keyword..."
                        className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <button
                      onClick={loadData}
                      className="px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron"
                    >
                      SEARCH
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAiSummarizeInbox}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-950/50 hover:bg-purple-900/60 text-purple-200 text-xs font-orbitron"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                      <span>AI INBOX BRIEFING</span>
                    </button>
                    <button
                      onClick={() => {
                        playClick();
                        setIsComposeOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>COMPOSE</span>
                    </button>
                  </div>
                </div>

                {/* Email List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {emails.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      {loading ? 'Retrieving messages from Gmail API...' : 'No emails found matching your query.'}
                    </div>
                  ) : (
                    emails.map((msg) => (
                      <div
                        key={msg.id}
                        onClick={() => setSelectedEmail(msg)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          selectedEmail?.id === msg.id
                            ? 'border-cyan-400 bg-cyan-950/60'
                            : msg.unread
                            ? 'border-cyan-500/40 bg-slate-900/90 hover:border-cyan-400/60'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 truncate">
                            {msg.unread && (
                              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                            )}
                            <span className="font-bold text-cyan-200 truncate">{msg.from}</span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-400 shrink-0">
                            {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="font-medium text-slate-200 text-xs mt-1 truncate">
                          {msg.subject}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {msg.snippet}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CALENDAR */}
            {activeTab === 'calendar' && (
              <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="flex items-center justify-between gap-3 shrink-0">
                  <div className="text-xs text-cyan-300 font-orbitron">
                    UPCOMING EVENTS & APPOINTMENTS
                  </div>
                  <button
                    onClick={() => {
                      playClick();
                      setIsNewEventOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>SCHEDULE EVENT</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {events.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      {loading ? 'Syncing Google Calendar events...' : 'No upcoming events found on your primary calendar.'}
                    </div>
                  ) : (
                    events.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-xl border border-cyan-500/25 bg-slate-900/60 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-cyan-200 text-xs">{ev.summary}</div>
                          {ev.description && (
                            <div className="text-[11px] text-slate-300">{ev.description}</div>
                          )}
                          <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400/80">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(ev.start).toLocaleString()} -{' '}
                              {new Date(ev.end).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>

                        {ev.htmlLink && (
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/60"
                            title="Open in Google Calendar"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: DRIVE */}
            {activeTab === 'drive' && (
              <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="flex items-center justify-between gap-3 shrink-0">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-cyan-400" />
                    <input
                      type="text"
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadData()}
                      placeholder="Search files in Google Drive..."
                      className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/30 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <button
                    onClick={loadData}
                    className="px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron"
                  >
                    SEARCH DRIVE
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {driveFiles.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      {loading ? 'Retrieving Drive documents...' : 'No files found.'}
                    </div>
                  ) : (
                    driveFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 rounded-xl border border-cyan-500/20 bg-slate-900/60 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div className="truncate">
                            <div className="font-bold text-xs text-slate-200 truncate">
                              {file.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {file.size || 'Document'} • Modified:{' '}
                              {new Date(file.modifiedTime).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/60"
                            title="Open Document"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: CONTACTS */}
            {activeTab === 'contacts' && (
              <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                <div className="text-xs text-cyan-300 font-orbitron">
                  GOOGLE CONTACTS DIRECTORY
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1">
                  {contacts.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-slate-400 text-xs">
                      {loading ? 'Loading contacts from Google People API...' : 'No contacts found.'}
                    </div>
                  ) : (
                    contacts.map((c) => (
                      <div
                        key={c.resourceName}
                        className="p-3 rounded-xl border border-cyan-500/25 bg-slate-900/60 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-300 shrink-0">
                            {c.displayName[0] || 'C'}
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-xs text-slate-200 truncate">
                              {c.displayName}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{c.email}</div>
                          </div>
                        </div>

                        {c.email && (
                          <button
                            onClick={() => {
                              playClick();
                              setComposeTo(c.email);
                              setActiveTab('gmail');
                              setIsComposeOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/60"
                            title="Draft Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* COMPOSE EMAIL MODAL */}
        {isComposeOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-lg bg-[#030712] border-2 border-cyan-500/50 rounded-2xl p-6 space-y-4 shadow-[0_0_40px_rgba(6,182,212,0.3)]">
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
                <div className="font-orbitron font-bold text-sm text-cyan-300">
                  COMPOSE GMAIL CORRESPONDENCE
                </div>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">RECIPIENT (TO):</label>
                  <input
                    type="email"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">SUBJECT:</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Enter email subject"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">MESSAGE BODY:</label>
                  <textarea
                    rows={5}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Compose message..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-100 focus:outline-none focus:border-cyan-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleSaveDraft}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-xs font-orbitron"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>SAVE DRAFT</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsComposeOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs font-orbitron"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => setShowSendConfirmation(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-cyan-400 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron font-bold"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>SEND EMAIL</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MANDATORY USER CONFIRMATION MODAL BEFORE SENDING EMAIL */}
        {showSendConfirmation && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#030712] border-2 border-red-500/60 rounded-2xl p-6 space-y-4 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
              <div className="flex items-center gap-3 text-red-400 border-b border-red-500/30 pb-3">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <div className="font-orbitron font-bold text-sm text-red-300">
                  AUTHORIZE EMAIL DISPATCH
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <p>
                  Are you sure you want to dispatch this email from your personal Gmail account?
                </p>
                <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/20 font-mono text-[11px] space-y-1">
                  <div>
                    <span className="text-slate-400">TO: </span>
                    <span className="text-cyan-300">{composeTo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">SUBJECT: </span>
                    <span className="text-slate-200">{composeSubject}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowSendConfirmation(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-orbitron text-slate-300"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmSendEmail}
                  className="px-4 py-2 rounded-lg border border-red-400 bg-red-950 hover:bg-red-900 text-red-100 text-xs font-orbitron font-bold shadow-lg"
                >
                  YES, DISPATCH EMAIL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCHEDULE CALENDAR EVENT MODAL */}
        {isNewEventOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <form
              onSubmit={handleCreateEvent}
              className="w-full max-w-md bg-[#030712] border-2 border-cyan-500/50 rounded-2xl p-6 space-y-4 shadow-[0_0_40px_rgba(6,182,212,0.3)]"
            >
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
                <div className="font-orbitron font-bold text-sm text-cyan-300">
                  SCHEDULE GOOGLE CALENDAR EVENT
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewEventOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">EVENT TITLE:</label>
                  <input
                    type="text"
                    required
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    placeholder="e.g. Tactical Sync / Minecraft Build Session"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">START DATE & TIME:</label>
                  <input
                    type="datetime-local"
                    required
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">END DATE & TIME:</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">DESCRIPTION (OPTIONAL):</label>
                  <textarea
                    rows={2}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Event agenda or notes..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-slate-100 focus:outline-none focus:border-cyan-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewEventOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs font-orbitron"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg border border-cyan-400 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron font-bold"
                >
                  CONFIRM EVENT
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
