import React, { useEffect, useState } from 'react';
import { X, Volume2, Mic, Settings, Sliders, RefreshCw, Trash2, ShieldCheck } from 'lucide-react';
import { VoiceOption, speechEngine } from '../utils/speech';
import { playClick, playAlert } from '../utils/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  voicePitch: number;
  onPitchChange: (val: number) => void;
  voiceRate: number;
  onRateChange: (val: number) => void;
  preferredVoiceURI: string;
  onVoiceChange: (uri: string) => void;
  soundMuted: boolean;
  onToggleSound: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onClearAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  voicePitch,
  onPitchChange,
  voiceRate,
  onRateChange,
  preferredVoiceURI,
  onVoiceChange,
  soundMuted,
  onToggleSound,
  autoSpeak,
  onToggleAutoSpeak,
  onClearAllData,
}) => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [testSpeaking, setTestSpeaking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      speechEngine.getVoices().then((list) => {
        setVoices(list);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestVoice = () => {
    playClick();
    setTestSpeaking(true);
    speechEngine
      .speak({
        text: 'All systems operational, sir. Speech synthesis configured to your parameters.',
        preferredVoiceURI,
        pitch: voicePitch,
        rate: voiceRate,
        onEnd: () => setTestSpeaking(false),
        onError: () => setTestSpeaking(false),
      })
      .catch(() => setTestSpeaking(false));
  };

  const handleTestHindi = () => {
    playClick();
    setTestSpeaking(true);
    speechEngine
      .speak({
        text: 'नमस्ते सर। जार्विस की वाणी प्रणाली आपकी सेवा के लिए पूर्ण रूप से तैयार है।',
        pitch: voicePitch,
        rate: voiceRate,
        onEnd: () => setTestSpeaking(false),
        onError: () => setTestSpeaking(false),
      })
      .catch(() => setTestSpeaking(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#030712] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl shadow-cyan-500/20 text-slate-100 font-rajdhani">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span className="font-orbitron font-bold text-sm tracking-wider text-cyan-200">
              JARVIS PROTOCOL & VOICE CONFIG
            </span>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Voice Engine Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              PREFERRED SPEECH SYNTHESIS VOICE
            </label>
            <select
              value={preferredVoiceURI}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg p-2 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400"
            >
              <option value="">Auto Detect (Best English & Hindi default)</option>
              {voices.map((v) => (
                <option key={v.voice.voiceURI} value={v.voice.voiceURI}>
                  {v.name} ({v.lang}) {v.isHindi ? '🇮🇳 [Hindi]' : v.isEnglish ? '🇬🇧 [English]' : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              JARVIS automatically switches to a Hindi voice when Hindi text is generated.
            </p>
          </div>

          {/* Sliders: Rate & Pitch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Speed Rate */}
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-cyan-500/15">
              <div className="flex justify-between items-center text-xs">
                <span className="text-cyan-300">SPEECH SPEED</span>
                <span className="font-tech text-cyan-400 font-bold">{voiceRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.05"
                value={voiceRate}
                onChange={(e) => onRateChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Pitch */}
            <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-cyan-500/15">
              <div className="flex justify-between items-center text-xs">
                <span className="text-cyan-300">VOCAL PITCH</span>
                <span className="font-tech text-cyan-400 font-bold">{voicePitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.3"
                step="0.05"
                value={voicePitch}
                onChange={(e) => onPitchChange(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Voice Test Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleTestVoice}
              disabled={testSpeaking}
              className="flex-1 py-2 px-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-xs font-semibold hover:bg-cyan-900/40 transition-all flex items-center justify-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" />
              TEST ENGLISH VOICE
            </button>
            <button
              onClick={handleTestHindi}
              disabled={testSpeaking}
              className="flex-1 py-2 px-3 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-xs font-semibold hover:bg-cyan-900/40 transition-all flex items-center justify-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" />
              हिंदी वाणी टेस्ट करें
            </button>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-2 pt-2 border-t border-cyan-500/15">
            {/* Auto-Speak Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-cyan-500/15">
              <div>
                <div className="text-xs font-semibold text-cyan-200">AUTO-SPEAK AI REPLIES</div>
                <div className="text-[11px] text-slate-400">Read assistant answers aloud automatically</div>
              </div>
              <button
                onClick={onToggleAutoSpeak}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  autoSpeak ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    autoSpeak ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Sound FX Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-cyan-500/15">
              <div>
                <div className="text-xs font-semibold text-cyan-200">HUD SOUND EFFECTS</div>
                <div className="text-[11px] text-slate-400">Cybernetic beeps, chimes, and tactical alerts</div>
              </div>
              <button
                onClick={onToggleSound}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  !soundMuted ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    !soundMuted ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Memory Purge */}
          <div className="pt-2 border-t border-cyan-500/15">
            <button
              onClick={() => {
                playAlert();
                if (window.confirm('Reset all JARVIS preferences and clear all chat logs?')) {
                  onClearAllData();
                  onClose();
                }
              }}
              className="w-full py-2 px-3 rounded-lg border border-rose-500/30 bg-rose-950/20 text-rose-300 hover:bg-rose-900/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              PURGE ALL PERSISTENT LOGS & SETTINGS
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-cyan-500/20 flex justify-end">
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs tracking-wider transition-all"
          >
            CONFIRM & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
