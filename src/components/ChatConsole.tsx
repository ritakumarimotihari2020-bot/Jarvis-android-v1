import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Trash2,
  Download,
  Search,
  Sparkles,
  Bot,
  User,
  RotateCcw,
} from 'lucide-react';
import { playClick } from '../utils/soundEffects';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  speechText?: string;
  language?: 'en-US' | 'hi-IN';
  timestamp: string;
  isProtocol?: boolean;
}

interface ChatConsoleProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isThinking: boolean;
  isListening: boolean;
  onToggleMic: () => void;
  interimTranscript: string;
  onSpeakMessage: (text: string, lang?: string) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  onClearHistory: () => void;
  activeSpeakingId: string | null;
  errorMessage?: string | null;
  onDismissError?: () => void;
  languageMode: 'auto' | 'en' | 'hi';
  onLanguageChange: (mode: 'auto' | 'en' | 'hi') => void;
  onTestVoice?: () => void;
}

export const ChatConsole: React.FC<ChatConsoleProps> = ({
  messages,
  onSendMessage,
  isThinking,
  isListening,
  onToggleMic,
  interimTranscript,
  onSpeakMessage,
  isSpeaking,
  onStopSpeaking,
  onClearHistory,
  activeSpeakingId,
  errorMessage,
  onDismissError,
  languageMode,
  onLanguageChange,
  onTestVoice,
}) => {
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isThinking) return;
    playClick();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = () => {
    playClick();
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `jarvis-logs-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredMessages = searchQuery
    ? messages.filter((m) =>
        m.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const quickPrompts = [
    { label: 'नमस्ते जार्विस', prompt: 'नमस्ते जार्विस, आपकी स्थिति क्या है?' },
    { label: 'Full Device Control', prompt: 'Jarvis, open full autonomous device control center and calibrate hardware.' },
    { label: 'Modify App Files', prompt: 'Jarvis, open app source files editor so I can modify application code.' },
    { label: 'System Self-Upgrade', prompt: 'Jarvis, execute self-analysis and report available upgrade patches.' },
    { label: 'System Diagnostic', prompt: 'Jarvis, execute full system diagnostics and check arc reactor status.' },
    { label: 'मौसम बताओ', prompt: 'जार्विस, वर्तमान वायुमंडलीय स्थिति और मौसम का विश्लेषण बताएं।' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950/75 border border-cyan-500/25 rounded-xl backdrop-blur-md shadow-2xl overflow-hidden">
      {/* Console Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-cyan-500/20 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-orbitron text-xs font-bold tracking-wider text-cyan-200">
            HOLOGRAPHIC LOGS // TERMINAL
          </span>
          <span className="font-tech text-[10px] text-cyan-400/60 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
            {messages.length} ENTRIES
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Voice & Sound Test Button */}
          {onTestVoice && (
            <button
              onClick={onTestVoice}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-orbitron rounded-md border border-cyan-500/30 bg-cyan-950/40 text-cyan-200 hover:border-cyan-400 hover:bg-cyan-900/40 transition-all"
              title="Test Voice Synthesis & Chimes"
            >
              <Volume2 className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">TEST VOICE</span>
            </button>
          )}

          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search className="w-3 h-3 text-cyan-400/60 absolute left-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memory..."
              className="pl-6 pr-2 py-1 text-[11px] font-tech bg-slate-950/80 border border-cyan-500/20 rounded-md text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 w-28 sm:w-36 transition-all"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="p-1.5 rounded-md border border-cyan-500/25 bg-cyan-950/30 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/40 transition-all"
            title="Export conversation history"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear Button */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-1.5 rounded-md border border-rose-500/30 bg-rose-950/20 text-rose-300 hover:border-rose-400 hover:bg-rose-900/30 transition-all"
            title="Clear all logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="p-3 bg-rose-950/80 border-b border-rose-500/40 text-xs text-rose-200 flex items-center justify-between gap-3 animate-fadeIn">
          <span>Are you sure you want to purge all conversation logs from memory, sir?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClearHistory();
                setShowClearConfirm(false);
              }}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-orbitron text-[10px] tracking-wider"
            >
              PURGE
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-orbitron text-[10px]"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-2.5 bg-rose-950/60 border-b border-rose-500/30 text-xs text-rose-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="font-tech">{errorMessage}</span>
          </div>
          {onDismissError && (
            <button
              onClick={onDismissError}
              className="text-[10px] font-orbitron text-rose-400 hover:text-rose-200"
            >
              DISMISS
            </button>
          )}
        </div>
      )}

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[280px] max-h-[500px]">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <Bot className="w-10 h-10 text-cyan-500/30 animate-pulse-slow" />
            <div className="font-orbitron text-xs text-cyan-400/80 tracking-wider">
              J.A.R.V.I.S. READY FOR DIRECTIVES
            </div>
            <p className="text-xs font-rajdhani text-slate-400 max-w-xs">
              Say &ldquo;Hello Jarvis&rdquo; or &ldquo;नमस्ते जार्विस&rdquo;, speak via microphone or select a prompt below.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isJarvis = msg.sender === 'jarvis';
            const isCurrentlyPlaying = isSpeaking && activeSpeakingId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isJarvis ? 'items-start' : 'items-end'
                } group`}
              >
                {/* Message Meta Info */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-tech text-slate-400">
                  {isJarvis ? (
                    <>
                      <span className="text-cyan-400 font-bold flex items-center gap-1">
                        <Bot className="w-3 h-3 text-cyan-400" />
                        J.A.R.V.I.S.
                      </span>
                      {msg.language && (
                        <span className="text-[9px] px-1 bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 rounded uppercase">
                          {msg.language === 'hi-IN' ? 'HINDI' : 'ENGLISH'}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-300 font-semibold flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      SIR
                    </span>
                  )}
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>

                {/* Message Content Bubble */}
                <div
                  className={`relative max-w-[88%] rounded-xl p-3 text-xs leading-relaxed transition-all shadow-md ${
                    isJarvis
                      ? msg.isProtocol
                        ? 'bg-cyan-950/40 border border-cyan-400/40 text-cyan-100 shadow-cyan-500/10'
                        : 'bg-slate-900/90 border border-cyan-500/25 text-slate-100 shadow-cyan-500/5'
                      : 'bg-cyan-900/30 border border-cyan-400/40 text-cyan-50 ml-auto'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-rajdhani text-[13px] tracking-wide select-text">
                    {msg.text}
                  </div>

                  {/* Actions for JARVIS reply */}
                  {isJarvis && (
                    <div className="mt-2 pt-1.5 border-t border-cyan-500/15 flex items-center justify-between text-[11px] text-cyan-400/70">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (isCurrentlyPlaying) {
                              onStopSpeaking();
                            } else {
                              onSpeakMessage(msg.speechText || msg.text, msg.language);
                            }
                          }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors ${
                            isCurrentlyPlaying
                              ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 animate-pulse'
                              : 'bg-slate-800/60 border-cyan-500/20 hover:border-cyan-400 hover:text-cyan-200'
                          }`}
                          title={isCurrentlyPlaying ? 'Stop speaking' : 'Read aloud'}
                        >
                          {isCurrentlyPlaying ? (
                            <>
                              <VolumeX className="w-3 h-3" />
                              <span className="font-tech text-[9px]">STOP</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              <span className="font-tech text-[9px]">PLAY</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-cyan-500/20 bg-slate-800/60 hover:border-cyan-400 hover:text-cyan-200 transition-colors"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="font-tech text-[9px] text-emerald-400">COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="font-tech text-[9px]">COPY</span>
                            </>
                          )}
                        </button>
                      </div>

                      {msg.isProtocol && (
                        <span className="font-tech text-[9px] text-cyan-400/60 uppercase">
                          PROTOCOL LOGGED
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Real-time Voice Recognition & Neural Transceiver Banner */}
        {isListening && (
          <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-400/70 text-cyan-200 space-y-2.5 animate-fadeIn">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 flex-1">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping mt-1" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-orbitron font-bold text-cyan-300 tracking-wider">
                      NEURAL VOICE TRANSCEIVER ACTIVE ({languageMode === 'hi' ? 'HINDI / हिंदी' : 'ENGLISH'})
                    </span>
                    <span className="text-[9px] font-tech text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                      ZERO-BLOCK VOICE LINK
                    </span>
                  </div>
                  <p className="font-tech text-xs text-cyan-100 mt-1 italic select-text">
                    {interimTranscript || 'Speak now, or tap a live voice command below...'}
                  </p>
                </div>
              </div>

              {interimTranscript && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleMic();
                    onSendMessage(interimTranscript);
                  }}
                  className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-orbitron font-bold text-[10px] rounded tracking-wider shrink-0 transition-all shadow"
                >
                  SEND NOW
                </button>
              )}
            </div>

            {/* Instant Voice Command Transceiver Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-cyan-500/20">
              {[
                { label: '🎙️ नमस्ते जार्विस', cmd: 'नमस्ते जार्विस, सभी सिस्टम की स्थिति बताओ' },
                { label: '🎙️ डिवाइस कंट्रोल खोलो', cmd: 'Jarvis, open full autonomous device control center' },
                { label: '🎙️ ऐप फ़ाइल बदलो', cmd: 'Jarvis, open app source files editor to modify code' },
                { label: '🎙️ सेल्फ अपग्रेड', cmd: 'Jarvis, prepare autonomous self-upgrade system' },
              ].map((vc) => (
                <button
                  key={vc.label}
                  type="button"
                  onClick={() => {
                    onToggleMic();
                    onSendMessage(vc.cmd);
                  }}
                  className="px-2 py-0.5 rounded-full bg-slate-950/90 border border-cyan-400/40 hover:border-cyan-300 text-[10px] font-rajdhani text-cyan-200 transition-all"
                >
                  {vc.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/70 border border-blue-500/30 text-blue-200">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0.3s]" />
            </div>
            <span className="font-tech text-xs tracking-wider text-blue-300">
              JARVIS neural core synthesizing response...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="px-3 py-1.5 border-t border-cyan-500/15 bg-slate-900/40 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
        <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
        {quickPrompts.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              playClick();
              onSendMessage(item.prompt);
            }}
            disabled={isThinking}
            className="shrink-0 px-2.5 py-1 text-[11px] font-rajdhani bg-slate-950/70 border border-cyan-500/25 hover:border-cyan-400 text-cyan-300 rounded-full hover:bg-cyan-950/40 transition-all disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Input Form Bar */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-cyan-500/20 bg-slate-950/90 flex items-center gap-2"
      >
        {/* Microphone Toggle Button */}
        <button
          type="button"
          onClick={onToggleMic}
          className={`p-2.5 rounded-lg border transition-all ${
            isListening
              ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-rose-500/30 shadow-lg animate-pulse'
              : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/40'
          }`}
          title={isListening ? 'Stop listening' : `Start microphone input (${languageMode === 'hi' ? 'Hindi' : 'English'})`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Mic Language Selector Toggle Button */}
        <button
          type="button"
          onClick={() => {
            playClick();
            onLanguageChange(languageMode === 'hi' ? 'en' : 'hi');
          }}
          className={`px-2 py-2 rounded-lg border text-[11px] font-rajdhani font-bold transition-all ${
            languageMode === 'hi'
              ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
              : 'bg-slate-900 border-cyan-500/20 text-slate-400 hover:text-cyan-300'
          }`}
          title="Click to toggle Mic language between English and Hindi"
        >
          {languageMode === 'hi' ? '🇮🇳 हिंदी' : '🇬🇧 EN'}
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              languageMode === 'hi'
                ? "जार्विस से कुछ भी पूछें (उदा. 'नमस्ते जार्विस')..."
                : "Type directive in English or Hindi (e.g. 'Hello Jarvis')..."
            }
            disabled={isThinking}
            className="w-full bg-slate-900/90 border border-cyan-500/30 rounded-lg px-3.5 py-2.5 text-xs font-rajdhani text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition-all disabled:opacity-60"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isThinking}
          className="p-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-semibold border border-cyan-400 transition-all disabled:opacity-40 disabled:hover:bg-cyan-600 shadow-cyan-500/30 shadow-md"
          title="Send command"
        >
          <Send className="w-4 h-4 text-slate-950" />
        </button>
      </form>
    </div>
  );
};
