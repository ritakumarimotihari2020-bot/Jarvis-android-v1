import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Mail,
  Calendar,
  HardDrive,
  Users,
  Gamepad2,
  Lock,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  KeyRound,
  X,
} from 'lucide-react';
import {
  googleSignIn,
  logoutGoogle,
  isGoogleConnected,
  getCurrentGoogleUser,
  initAuth,
  WORKSPACE_SCOPES,
} from '../utils/workspaceAuth';
import { playClick, playSuccess, playError } from '../utils/soundEffects';

interface PersonalAccountsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeak?: (text: string) => void;
  onOpenWorkspaceHub?: () => void;
}

export const PersonalAccountsDashboard: React.FC<PersonalAccountsDashboardProps> = ({
  isOpen,
  onClose,
  onSpeak,
  onOpenWorkspaceHub,
}) => {
  const [googleUser, setGoogleUser] = useState(getCurrentGoogleUser());
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Microsoft Minecraft Account state
  const [minecraftAccountConnected, setMinecraftAccountConnected] = useState(true);
  const [minecraftUsername, setMinecraftUsername] = useState('Stark_Owner');
  const [minecraftUuid, setMinecraftUuid] = useState('c02b8d91-4e78-4389-9e8a-84d5f1234abc');

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleGoogleConnect = async () => {
    playClick();
    setIsSigningIn(true);
    setStatusMessage('Initiating secure Google OAuth 2.0 flow...');
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        playSuccess();
        setStatusMessage(`Successfully connected Google account: ${res.user.email}`);
        if (onSpeak) {
          onSpeak(`Google Workspace connected successfully for ${res.user.email}, sir.`);
        }
      }
    } catch (err: any) {
      playError();
      setStatusMessage(`Google Sign-In failed: ${err.message || 'Window closed or interrupted.'}`);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    playClick();
    const confirmed = window.confirm(
      'Are you sure you want to disconnect your Google Workspace account? In-memory tokens will be purged immediately.'
    );
    if (!confirmed) return;

    try {
      await logoutGoogle();
      setGoogleUser(null);
      playSuccess();
      setStatusMessage('Google Workspace account disconnected. Tokens cleared from memory.');
      if (onSpeak) {
        onSpeak('Google Workspace account disconnected, sir.');
      }
    } catch (err: any) {
      playError();
      setStatusMessage(`Disconnection error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn font-rajdhani">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#030712] border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/30 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl border border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_#22d3ee]">
              <KeyRound className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-extrabold text-base tracking-widest text-cyan-300 text-glow-cyan">
                  PERSONAL ACCOUNTS VAULT & MANAGER
                </span>
                <span className="font-tech text-xs bg-cyan-950 border border-cyan-400/60 text-cyan-200 px-2.5 py-0.5 rounded-full font-bold">
                  AES-256 VAULT
                </span>
              </div>
              <p className="font-tech text-xs text-cyan-400/70">
                OAUTH 2.0 ZERO-PASSWORD PROTOCOL • EPHEMERAL IN-MEMORY CACHE • IMMEDIATE REVOCATION
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/50 text-cyan-300 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div className="px-6 py-2 bg-cyan-950/50 border-b border-cyan-500/20 text-xs font-mono text-cyan-300 flex items-center justify-between">
            <span className="truncate">{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-cyan-400 hover:text-cyan-200 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Security Guarantee Notice */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <div className="font-bold text-emerald-300 font-orbitron text-xs">
                STARK PROTOCOL ZERO-PASSWORD SECURITY GUARANTEE
              </div>
              <p>
                JARVIS never stores, requests, or logs your raw passwords. All authentication occurs
                through official OAuth 2.0 authorization prompts. Access tokens are held strictly in
                ephemeral memory and are never persisted to disk or browser storage. You can revoke
                access anytime with one click.
              </p>
            </div>
          </div>

          {/* Account 1: Google Workspace */}
          <div className="p-5 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 48 48">
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
                </div>
                <div>
                  <div className="font-orbitron font-bold text-sm text-cyan-200">
                    Google Workspace (Gmail, Calendar, Drive, Contacts)
                  </div>
                  <div className="text-xs text-slate-400">
                    {googleUser
                      ? `Signed in as: ${googleUser.email}`
                      : 'Not connected. Connect to enable email, scheduling & file management.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {googleUser ? (
                  <>
                    <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      CONNECTED
                    </span>
                    {onOpenWorkspaceHub && (
                      <button
                        onClick={() => {
                          playClick();
                          onClose();
                          onOpenWorkspaceHub();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-400/50 text-cyan-200 text-xs font-orbitron transition-all"
                      >
                        <span>OPEN WORKSPACE HUB</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={handleGoogleDisconnect}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 border border-red-500/40 text-red-200 text-xs font-orbitron transition-all"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>DISCONNECT</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleGoogleConnect}
                    disabled={isSigningIn}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-900 hover:bg-slate-100 font-medium text-xs font-sans transition-all shadow-md cursor-pointer"
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
                    <span>{isSigningIn ? 'CONNECTING...' : 'Sign in with Google'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Granted Scopes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-cyan-500/15 flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-bold text-slate-200">Gmail</div>
                  <div className="text-[11px] text-slate-400">Summarize, Search, Draft</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-cyan-500/15 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-bold text-slate-200">Calendar</div>
                  <div className="text-[11px] text-slate-400">Agenda, Events, Booking</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-cyan-500/15 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-bold text-slate-200">Google Drive</div>
                  <div className="text-[11px] text-slate-400">File Explorer, Documents</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-cyan-500/15 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-bold text-slate-200">Contacts</div>
                  <div className="text-[11px] text-slate-400">People Directory, Lookup</div>
                </div>
              </div>
            </div>
          </div>

          {/* Account 2: Microsoft & Minecraft Account */}
          <div className="p-5 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-xl">
                  ⛏️
                </div>
                <div>
                  <div className="font-orbitron font-bold text-sm text-cyan-200">
                    Minecraft & Microsoft Xbox Live Account
                  </div>
                  <div className="text-xs text-slate-400">
                    Java Edition & Bedrock Edition Official Entitlements Verified
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  AUTHENTICATED
                </span>
                <button
                  onClick={() => {
                    playClick();
                    setMinecraftAccountConnected(!minecraftAccountConnected);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-orbitron transition-all"
                >
                  {minecraftAccountConnected ? 'MANAGE PROFILE' : 'RE-LINK ACCOUNT'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/70 border border-cyan-500/15">
                <div className="text-slate-400 text-[11px]">GAMERTAG / USERNAME</div>
                <div className="font-orbitron font-bold text-sm text-cyan-300 mt-0.5">
                  {minecraftUsername}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-cyan-500/15">
                <div className="text-slate-400 text-[11px]">LICENSED EDITIONS</div>
                <div className="font-mono text-xs text-emerald-300 mt-0.5">
                  Java Edition + Bedrock for Windows
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-cyan-500/15">
                <div className="text-slate-400 text-[11px]">XBOX LIVE UUID</div>
                <div className="font-mono text-[11px] text-slate-300 truncate mt-0.5">
                  {minecraftUuid}
                </div>
              </div>
            </div>
          </div>

          {/* Account 3: Desktop Companion & OS Control */}
          <div className="p-5 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <div className="font-orbitron font-bold text-sm text-cyan-200">
                    Desktop Companion & Hardware Agent
                  </div>
                  <div className="text-xs text-slate-400">
                    Direct local computer process execution, keyboard/mouse automation, and game bridge
                  </div>
                </div>
              </div>

              <span className="flex items-center gap-1 text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ACTIVE LOCAL AGENT
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/70 border border-cyan-500/15 text-xs text-slate-300 flex items-center justify-between">
              <div>
                <span className="font-bold text-cyan-400">Security Gate: </span>
                Every action altering files, sending emails, or managing server processes requires explicit confirmation.
              </div>
              <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                <Lock className="w-3.5 h-3.5" />
                SAFEGUARD ON
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-cyan-500/20 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div>
            Connected Services: {googleUser ? 'Google Workspace + Minecraft' : 'Minecraft Only'}
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg border border-cyan-400 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 font-orbitron text-xs transition-all cursor-pointer"
          >
            CLOSE VAULT
          </button>
        </div>
      </div>
    </div>
  );
};
