import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Fingerprint,
  Mic,
  Lock,
  Unlock,
  AlertTriangle,
  History,
  X,
  UserCheck,
  Ban,
  CheckCircle2,
  Clock,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import { ownerAuthManager, OwnerProfile, SecurityEventLog } from '../utils/ownerAuth';
import { playClick, playAlert, playResponseChime, playWakeChime } from '../utils/soundEffects';

interface OwnerSecurityDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeak?: (text: string) => void;
}

export const OwnerSecurityDashboard: React.FC<OwnerSecurityDashboardProps> = ({
  isOpen,
  onClose,
  onSpeak,
}) => {
  const [profile, setProfile] = useState<OwnerProfile>(() => ownerAuthManager.getProfile());
  const [activeTab, setActiveTab] = useState<'auth' | 'settings' | 'logs'>('auth');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => ownerAuthManager.isAuthenticated());
  const [securityLogs, setSecurityLogs] = useState<SecurityEventLog[]>(() => ownerAuthManager.getSecurityLogs());
  const [isEmergencyActive, setIsEmergencyActive] = useState<boolean>(() => ownerAuthManager.isEmergencyKillActive());

  // Input states
  const [pinInput, setPinInput] = useState<string>('');
  const [voiceInput, setVoiceInput] = useState<string>('');
  const [feedbackNotice, setFeedbackNotice] = useState<{ text: string; error?: boolean } | null>(null);

  // Settings form states
  const [newOwnerName, setNewOwnerName] = useState<string>(profile.ownerName);
  const [newCallsign, setNewCallsign] = useState<string>(profile.ownerCallsign);
  const [newEmail, setNewEmail] = useState<string>(profile.registeredEmail);
  const [newPin, setNewPin] = useState<string>('');
  const [newVoicePassphrase, setNewVoicePassphrase] = useState<string>(profile.voicePassphrase);

  // Refresh status
  const refreshStatus = () => {
    setProfile(ownerAuthManager.getProfile());
    setIsAuthenticated(ownerAuthManager.isAuthenticated());
    setIsEmergencyActive(ownerAuthManager.isEmergencyKillActive());
    setSecurityLogs(ownerAuthManager.getSecurityLogs());
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
      setFeedbackNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle PIN Submission
  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) return;

    playClick();
    const res = await ownerAuthManager.verifyPin(pinInput);
    setPinInput('');
    refreshStatus();

    if (res.success) {
      playResponseChime();
      setFeedbackNotice({ text: res.message });
      if (onSpeak) onSpeak(res.message);
    } else {
      playAlert();
      setFeedbackNotice({ text: res.message, error: true });
      if (onSpeak) onSpeak('Access Denied. Invalid master security PIN.');
    }
  };

  // Handle Biometric Verification
  const handleVerifyBiometric = async () => {
    playClick();
    const res = await ownerAuthManager.verifyBiometric();
    refreshStatus();

    if (res.success) {
      playResponseChime();
      setFeedbackNotice({ text: res.message });
      if (onSpeak) onSpeak(res.message);
    } else {
      playAlert();
      setFeedbackNotice({ text: res.message, error: true });
    }
  };

  // Handle Voice Verification
  const handleVerifyVoice = (phrase: string) => {
    playClick();
    const res = ownerAuthManager.verifyVoicePhrase(phrase);
    setVoiceInput('');
    refreshStatus();

    if (res.success) {
      playResponseChime();
      setFeedbackNotice({ text: res.message });
      if (onSpeak) onSpeak(res.message);
    } else {
      playAlert();
      setFeedbackNotice({ text: res.message, error: true });
    }
  };

  // Emergency STOP ALL COMMANDS
  const handleEmergencyStop = () => {
    playAlert();
    ownerAuthManager.triggerEmergencyStop();
    refreshStatus();
    setFeedbackNotice({
      text: 'EMERGENCY STOP ENGAGED: All autonomous commands, remote links, and device execution immediately severed.',
      error: true,
    });
    if (onSpeak) onSpeak('Emergency stop engaged, sir. All autonomous controls have been severed.');
  };

  const handleClearEmergency = () => {
    playWakeChime();
    ownerAuthManager.clearEmergencyStop();
    refreshStatus();
    setFeedbackNotice({ text: 'Emergency stop cleared. Re-authenticate to regain control.' });
  };

  // Revoke Access
  const handleToggleRevoke = () => {
    playClick();
    if (profile.accessRevoked) {
      ownerAuthManager.reinstateAccess();
      setFeedbackNotice({ text: 'Owner device control access reinstated.' });
      if (onSpeak) onSpeak('Owner access reinstated, sir.');
    } else {
      ownerAuthManager.revokeAccess();
      setFeedbackNotice({ text: 'Device control access revoked for all sessions.', error: true });
      if (onSpeak) onSpeak('Owner access revoked, sir.');
    }
    refreshStatus();
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    await ownerAuthManager.updateProfile({
      ownerName: newOwnerName,
      ownerCallsign: newCallsign,
      registeredEmail: newEmail,
      voicePassphrase: newVoicePassphrase,
      newPin: newPin.trim() || undefined,
    });
    setNewPin('');
    refreshStatus();
    setFeedbackNotice({ text: 'Owner security credentials updated and encrypted on device.' });
    if (onSpeak) onSpeak('Owner security settings updated successfully, sir.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-[#030914] border border-cyan-500/40 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-[0_0_40px_rgba(6,182,212,0.25)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/80 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-400/50 shadow-inner">
              <ShieldCheck className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-orbitron font-bold text-base text-cyan-200 tracking-wider">
                  OWNER AUTHENTICATION & SECURITY DASHBOARD
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-tech font-bold uppercase tracking-widest bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                  LEVEL 5
                </span>
              </div>
              <p className="text-xs text-slate-400 font-rajdhani">
                Registered Device Owner: <span className="text-cyan-300 font-semibold">{profile.ownerName}</span> ({profile.ownerCallsign})
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg border border-cyan-500/30 text-slate-400 hover:text-cyan-200 hover:bg-cyan-950/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emergency Kill-Switch Banner */}
        <div className="px-5 py-2.5 bg-red-950/30 border-b border-red-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-rajdhani text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
            <span>
              {isEmergencyActive
                ? 'EMERGENCY STOP ENGAGED: Device controls and autonomous commands are strictly locked.'
                : 'Emergency Security Sentinel: Instantly sever all autonomous actions and device controls.'}
            </span>
          </div>
          {isEmergencyActive ? (
            <button
              onClick={handleClearEmergency}
              className="px-3 py-1 rounded bg-emerald-950 border border-emerald-400/60 text-emerald-300 font-orbitron text-xs hover:bg-emerald-900 transition-colors"
            >
              CLEAR STOP
            </button>
          ) : (
            <button
              onClick={handleEmergencyStop}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-950/80 border border-red-400 text-red-200 font-orbitron text-xs hover:bg-red-900 transition-all shadow-sm shadow-red-500/30 shrink-0 font-bold"
            >
              <StopCircle className="w-3.5 h-3.5" />
              STOP ALL COMMANDS
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-cyan-500/20 bg-slate-950/60 px-5 pt-2 gap-2 text-xs font-orbitron">
          <button
            onClick={() => {
              playClick();
              setActiveTab('auth');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all ${
              activeTab === 'auth'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40'
                : 'border-transparent text-slate-400 hover:text-cyan-300'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            AUTHENTICATION ({isAuthenticated ? 'ACTIVE' : 'LOCKED'})
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveTab('settings');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            CREDENTIALS & REVOCATION
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveTab('logs');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all ${
              activeTab === 'logs'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            SECURITY AUDIT LOGS ({securityLogs.length})
          </button>
        </div>

        {/* Feedback notice */}
        {feedbackNotice && (
          <div
            className={`mx-5 mt-3 p-2.5 rounded-lg border text-xs font-rajdhani flex items-center justify-between ${
              feedbackNotice.error
                ? 'bg-red-950/50 border-red-500/40 text-red-200'
                : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackNotice.error ? (
                <ShieldAlert className="w-4 h-4 text-red-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>{feedbackNotice.text}</span>
            </div>
            <button
              onClick={() => setFeedbackNotice(null)}
              className="text-slate-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab 1: Multi-Factor Authentication */}
        {activeTab === 'auth' && (
          <div className="p-5 overflow-y-auto space-y-4">
            {/* Session status banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                isAuthenticated
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {isAuthenticated ? (
                  <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-400/50 text-emerald-300">
                    <Unlock className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-400/50 text-amber-300">
                    <Lock className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="font-orbitron font-bold text-sm">
                    {isAuthenticated ? 'OWNER ACCESS ACTIVE & VERIFIED' : 'DEVICE CONTROL LOCKED — AUTHENTICATION REQUIRED'}
                  </div>
                  <div className="text-xs font-rajdhani text-slate-300">
                    {isAuthenticated
                      ? `Verified via ${ownerAuthManager.getActiveFactor()} factor • ${ownerAuthManager.getRemainingSessionMinutes()} minutes remaining in secure session.`
                      : 'Please authenticate with PIN, Biometrics or Voice to control Android & Windows device features.'}
                  </div>
                </div>
              </div>
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    playClick();
                    ownerAuthManager.logout();
                    refreshStatus();
                    setFeedbackNotice({ text: 'Owner session locked.' });
                  }}
                  className="px-3 py-1 rounded bg-slate-900 border border-cyan-500/40 text-xs font-orbitron text-cyan-200 hover:bg-slate-800 transition-colors"
                >
                  LOCK SESSION
                </button>
              ) : (
                <span className="text-[10px] font-orbitron font-bold px-2 py-1 rounded bg-amber-950 border border-amber-400/50 text-amber-300">
                  UNAUTHORIZED
                </span>
              )}
            </div>

            {/* 3 Verification Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Factor 1: PIN */}
              <div className="bg-slate-900/60 border border-cyan-500/25 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-cyan-300 font-orbitron text-xs font-semibold">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    <span>FACTOR 1: MASTER PIN</span>
                  </div>
                  <p className="text-xs text-slate-400 font-rajdhani mb-3">
                    Enter your 4-digit security PIN. (Default: <code>1001</code>)
                  </p>
                  <form onSubmit={handleVerifyPin} className="space-y-2">
                    <input
                      type="password"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="Enter Master PIN"
                      maxLength={12}
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg px-3 py-2 text-center text-sm font-tech text-cyan-200 tracking-widest focus:outline-none focus:border-cyan-300"
                    />
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-400/60 text-cyan-200 font-orbitron text-xs hover:bg-cyan-900/70 transition-all font-semibold"
                    >
                      VERIFY PIN
                    </button>
                  </form>
                </div>
              </div>

              {/* Factor 2: Biometrics */}
              <div className="bg-slate-900/60 border border-cyan-500/25 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-emerald-300 font-orbitron text-xs font-semibold">
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    <span>FACTOR 2: BIOMETRICS</span>
                  </div>
                  <p className="text-xs text-slate-400 font-rajdhani mb-3">
                    Hardware biometric verification via Fingerprint, TouchID or FaceID sensor.
                  </p>
                </div>
                <button
                  onClick={handleVerifyBiometric}
                  className="w-full py-2.5 rounded-lg bg-emerald-950/60 border border-emerald-400/60 text-emerald-200 font-orbitron text-xs hover:bg-emerald-900/70 transition-all flex items-center justify-center gap-2 font-semibold"
                >
                  <Fingerprint className="w-4 h-4 text-emerald-300" />
                  SCAN BIOMETRIC
                </button>
              </div>

              {/* Factor 3: Voice Phrase */}
              <div className="bg-slate-900/60 border border-cyan-500/25 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-purple-300 font-orbitron text-xs font-semibold">
                    <Mic className="w-4 h-4 text-purple-400" />
                    <span>FACTOR 3: VOICEPRINT</span>
                  </div>
                  <p className="text-xs text-slate-400 font-rajdhani mb-2">
                    Acoustic phrase: <span className="text-purple-300 font-tech">"{profile.voicePassphrase}"</span>
                  </p>
                  <input
                    type="text"
                    value={voiceInput}
                    onChange={(e) => setVoiceInput(e.target.value)}
                    placeholder="Speak or type phrase"
                    className="w-full bg-slate-950 border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-xs font-tech text-purple-200 mb-2 focus:outline-none focus:border-purple-300"
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleVerifyVoice(voiceInput || profile.voicePassphrase)}
                    className="flex-1 py-1.5 rounded-lg bg-purple-950/70 border border-purple-400/60 text-purple-200 font-orbitron text-xs hover:bg-purple-900/70 transition-all font-semibold"
                  >
                    VERIFY VOICE
                  </button>
                  <button
                    onClick={() => handleVerifyVoice(profile.voicePassphrase)}
                    className="px-2 py-1.5 rounded-lg bg-slate-900 border border-purple-500/30 text-[10px] font-tech text-purple-300 hover:text-white"
                    title="1-Tap Instant Voice Authorization"
                  >
                    1-TAP
                  </button>
                </div>
              </div>
            </div>

            {/* Stark Security Safeguards Card */}
            <div className="bg-slate-900/40 border border-cyan-500/20 rounded-xl p-3.5 text-xs font-rajdhani text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 text-cyan-300 font-orbitron text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>STARK AUTONOMOUS SECURITY PROTOCOLS ENFORCED</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Sensitive actions (file deletion, formatting, financial transfers) always require explicit confirmation prompt.</li>
                <li>Device remote access cannot bypass operating system permission sandboxes.</li>
                <li>Microphone, cameras and geolocation require active browser/host authorization indicator.</li>
                <li>Emergency STOP ALL COMMANDS instantly terminates execution and revokes auth session.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Owner Credentials & Revocation */}
        {activeTab === 'settings' && (
          <div className="p-5 overflow-y-auto space-y-5">
            {/* Revoke Control Box */}
            <div className="p-4 rounded-xl border border-red-500/40 bg-red-950/20 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-orbitron font-bold text-red-200">
                  <Ban className="w-4 h-4 text-red-400" />
                  REVOKE DEVICE ACCESS ANYTIME
                </div>
                <p className="text-xs text-slate-300 font-rajdhani mt-1">
                  Owner can revoke all device control privileges instantly. When revoked, JARVIS will refuse all hardware, Android and Windows actions.
                </p>
                <div className="mt-2 text-[11px] font-tech text-red-300">
                  Current Status: <span className="font-bold">{profile.accessRevoked ? 'REVOKED (LOCKED)' : 'ACTIVE (AUTHORIZED)'}</span>
                </div>
              </div>
              <button
                onClick={handleToggleRevoke}
                className={`px-4 py-2 rounded-lg font-orbitron text-xs font-bold transition-all shrink-0 ${
                  profile.accessRevoked
                    ? 'bg-emerald-950 border border-emerald-400 text-emerald-200 hover:bg-emerald-900'
                    : 'bg-red-950 border border-red-400 text-red-200 hover:bg-red-900 shadow-sm shadow-red-500/30'
                }`}
              >
                {profile.accessRevoked ? 'REINSTATE ACCESS' : 'REVOKE ACCESS NOW'}
              </button>
            </div>

            {/* Profile update form */}
            <form onSubmit={handleSaveSettings} className="bg-slate-900/50 border border-cyan-500/25 rounded-xl p-4 space-y-3">
              <div className="text-xs font-orbitron text-cyan-300 font-semibold border-b border-cyan-500/20 pb-2">
                MODIFY OWNER CREDENTIALS
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-rajdhani">
                <div>
                  <label className="text-slate-400 block mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded px-2.5 py-1.5 text-slate-100 font-tech focus:outline-none focus:border-cyan-300"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Callsign / Identity Tag</label>
                  <input
                    type="text"
                    value={newCallsign}
                    onChange={(e) => setNewCallsign(e.target.value)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded px-2.5 py-1.5 text-slate-100 font-tech focus:outline-none focus:border-cyan-300"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Registered Security Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded px-2.5 py-1.5 text-slate-100 font-tech focus:outline-none focus:border-cyan-300"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Update Master PIN (leave blank to keep)</label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="New 4-digit PIN"
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded px-2.5 py-1.5 text-slate-100 font-tech focus:outline-none focus:border-cyan-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-slate-400 block mb-1">Voice Acoustic Verification Passphrase</label>
                  <input
                    type="text"
                    value={newVoicePassphrase}
                    onChange={(e) => setNewVoicePassphrase(e.target.value)}
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded px-2.5 py-1.5 text-slate-100 font-tech focus:outline-none focus:border-cyan-300"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-950 border border-cyan-400 text-cyan-200 font-orbitron text-xs hover:bg-cyan-900 transition-all font-semibold shadow-sm"
                >
                  SAVE SECURITY SETTINGS
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Security Audit Logs */}
        {activeTab === 'logs' && (
          <div className="p-5 overflow-y-auto space-y-3">
            <div className="text-xs font-orbitron text-cyan-300 font-semibold flex items-center justify-between">
              <span>SECURITY & ACCESS AUDIT TRAIL</span>
              <span className="text-[10px] text-slate-400 font-tech">IMMUTABLE LOG RECORD</span>
            </div>
            {securityLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs font-rajdhani">
                No security alerts recorded. All access nominal.
              </div>
            ) : (
              <div className="space-y-2">
                {securityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-slate-900/60 border border-cyan-500/20 flex items-center justify-between text-xs font-rajdhani"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-orbitron font-bold ${
                          log.eventType === 'AUTH_SUCCESS'
                            ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                            : log.eventType === 'EMERGENCY_KILL'
                            ? 'bg-red-950 border border-red-500 text-red-300'
                            : 'bg-amber-950 border border-amber-500 text-amber-300'
                        }`}
                      >
                        {log.eventType}
                      </span>
                      <span className="text-slate-300">{log.detail}</span>
                    </div>
                    <span className="text-[10px] text-cyan-400/60 font-tech shrink-0 ml-2">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-cyan-500/30 flex items-center justify-between text-xs font-tech text-cyan-400/60">
          <div>ENCRYPTION: AES-256 GCM • SHA-256 SIGNED • STARK LEVEL-5 SHIELD</div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="px-3 py-1 rounded bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
