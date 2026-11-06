import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Power, Send } from 'lucide-react';
import { JarvisTheme, themeManager } from '../utils/themeSystem';

export type CoreState = 'standby' | 'idle' | 'listening' | 'thinking' | 'speaking';

interface JarvisCoreProps {
  state: CoreState;
  audioLevel?: number; // 0 to 1
  isAwake: boolean;
  onToggleWake: () => void;
  onToggleMic: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  languageMode: 'auto' | 'en' | 'hi';
  theme?: JarvisTheme;
  onSendVoiceCommand?: (text: string) => void;
}

export const JarvisCore: React.FC<JarvisCoreProps> = ({
  state,
  audioLevel = 0,
  isAwake,
  onToggleWake,
  onToggleMic,
  isListening,
  isSpeaking,
  languageMode,
  theme,
  onSendVoiceCommand,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [voiceDraft, setVoiceDraft] = useState<string>('');
  const activeTheme = theme || themeManager.getActiveTheme();

  // Canvas particle and wave simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;
    let pulseAngle = 0;

    // Orbital particles
    const particleCount = 28;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      orbitRadius: 105 + (i % 4) * 22,
      baseSpeed: (i % 2 === 0 ? 0.008 : -0.012) * (1 + (i % 3) * 0.3),
      angle: (i * Math.PI * 2) / particleCount,
      size: 1.5 + (i % 3) * 0.8,
      opacity: 0.3 + (i % 5) * 0.12,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Determine speed and intensity based on state
      const themeAccent = activeTheme.accentColor;
      const themeSecondary = activeTheme.secondaryColor;
      const themeGeom = activeTheme.coreGeometry || 'concentric';

      let speedMult = 1;
      let coreColor = themeAccent;
      let secondaryColor = themeSecondary;
      let glowIntensity = 15;

      if (!isAwake) {
        speedMult = 0.2;
        coreColor = '#334155'; // slate-700
        secondaryColor = '#1e293b';
        glowIntensity = 5;
      } else if (state === 'listening') {
        speedMult = 1.8;
        glowIntensity = 28 + audioLevel * 25;
      } else if (state === 'thinking') {
        speedMult = 3.2;
        glowIntensity = 30;
      } else if (state === 'speaking') {
        speedMult = 1.5;
        glowIntensity = 24 + Math.sin(pulseAngle * 3) * 10;
      }

      angle += 0.01 * speedMult;
      pulseAngle += 0.03 * speedMult;

      ctx.save();
      ctx.translate(centerX, centerY);

      // GEOMETRY VARIANT RENDERING:
      if (themeGeom === 'gyro') {
        // Gyroscope 3D Gimbal Rings
        const gimbalRadii = [160, 140, 120];
        gimbalRadii.forEach((rad, idx) => {
          const rot = angle * (idx % 2 === 0 ? 1 : -1) * (1 + idx * 0.4) + (idx * Math.PI) / 3;
          ctx.save();
          ctx.rotate(rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, rad, rad * 0.45, 0, 0, Math.PI * 2);
          ctx.strokeStyle = isAwake ? (idx === 0 ? coreColor : secondaryColor) : 'rgba(51, 65, 85, 0.4)';
          ctx.lineWidth = idx === 0 ? 2.5 : 1.5;
          ctx.stroke();

          // Gyro pivot nodes
          if (isAwake) {
            [-rad, rad].forEach((px) => {
              ctx.beginPath();
              ctx.arc(px, 0, 3, 0, Math.PI * 2);
              ctx.fillStyle = coreColor;
              ctx.fill();
            });
          }
          ctx.restore();
        });
      } else if (themeGeom === 'lattice') {
        // Hexagonal Tachyon Lattice
        const hexRadius = 155;
        for (let tier = 3; tier >= 1; tier--) {
          const r = (hexRadius * tier) / 3;
          const hexRot = angle * 0.5 * (tier % 2 === 0 ? 1 : -1);
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const hAng = hexRot + (h * Math.PI) / 3;
            const hx = Math.cos(hAng) * r;
            const hy = Math.sin(hAng) * r;
            if (h === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.strokeStyle = isAwake ? (tier === 3 ? coreColor : secondaryColor) : 'rgba(51, 65, 85, 0.3)';
          ctx.lineWidth = tier === 3 ? 2 : 1;
          ctx.stroke();
        }
      } else if (themeGeom === 'soundwave') {
        // Concentric Harmonic Audio Waves
        const waveCount = 5;
        for (let w = 0; w < waveCount; w++) {
          const waveR = 90 + w * 16 + (isAwake && isListening ? audioLevel * 18 : Math.sin(pulseAngle + w) * 4);
          ctx.beginPath();
          ctx.arc(0, 0, waveR, 0, Math.PI * 2);
          ctx.strokeStyle = isAwake ? (w % 2 === 0 ? coreColor : secondaryColor) : 'rgba(51, 65, 85, 0.25)';
          ctx.lineWidth = Math.max(1, 3 - w * 0.4);
          ctx.setLineDash([6 + w * 2, 4 + w]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        // Classic Concentric Segments (Default)
        // Outer dashed ring
        ctx.beginPath();
        ctx.arc(0, 0, 165, 0, Math.PI * 2);
        ctx.strokeStyle = isAwake ? `${coreColor}33` : 'rgba(51, 65, 85, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();

        // Outer rotating segmented arcs
        ctx.beginPath();
        ctx.arc(0, 0, 155, angle * 0.7, angle * 0.7 + Math.PI * 0.6);
        ctx.strokeStyle = isAwake ? secondaryColor : 'rgba(51, 65, 85, 0.3)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 155, angle * 0.7 + Math.PI, angle * 0.7 + Math.PI * 1.6);
        ctx.strokeStyle = isAwake ? secondaryColor : 'rgba(51, 65, 85, 0.3)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Ticks ring
        const tickCount = 48;
        for (let i = 0; i < tickCount; i++) {
          const tickAngle = (i * Math.PI * 2) / tickCount;
          const isMajor = i % 6 === 0;
          const r1 = 142;
          const r2 = isMajor ? 134 : 138;

          const x1 = Math.cos(tickAngle) * r1;
          const y1 = Math.sin(tickAngle) * r1;
          const x2 = Math.cos(tickAngle) * r2;
          const y2 = Math.sin(tickAngle) * r2;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = isAwake
            ? isMajor
              ? `${coreColor}aa`
              : `${coreColor}44`
            : 'rgba(51, 65, 85, 0.25)';
          ctx.lineWidth = isMajor ? 2 : 1;
          ctx.stroke();
        }

        // Middle Counter-rotating segmented rings
        ctx.beginPath();
        ctx.arc(0, 0, 126, -angle * 1.2, -angle * 1.2 + Math.PI * 0.8);
        ctx.strokeStyle = isAwake ? `${secondaryColor}88` : 'rgba(51, 65, 85, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 126, -angle * 1.2 + Math.PI, -angle * 1.2 + Math.PI * 1.8);
        ctx.strokeStyle = isAwake ? `${secondaryColor}88` : 'rgba(51, 65, 85, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Audio Frequency Reactive Waveform
      if (isAwake && (state === 'listening' || state === 'speaking' || audioLevel > 0.05)) {
        const waveBars = 36;
        for (let b = 0; b < waveBars; b++) {
          const barAngle = (b * Math.PI * 2) / waveBars + angle * 0.5;
          const amp =
            state === 'listening'
              ? audioLevel * 25 + Math.sin(pulseAngle * 4 + b) * 8 + 4
              : Math.sin(pulseAngle * 5 + b * 2) * 12 + 8;
          const bR1 = 112;
          const bR2 = bR1 + Math.max(3, amp);

          const bx1 = Math.cos(barAngle) * bR1;
          const by1 = Math.sin(barAngle) * bR1;
          const bx2 = Math.cos(barAngle) * bR2;
          const by2 = Math.sin(barAngle) * bR2;

          ctx.beginPath();
          ctx.moveTo(bx1, by1);
          ctx.lineTo(bx2, by2);
          ctx.strokeStyle = coreColor;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      }

      // 2. Arc Reactor Cells Ring (10 segments)
      const cellCount = 10;
      for (let c = 0; c < cellCount; c++) {
        const cellAngle = (c * Math.PI * 2) / cellCount + angle * 0.35;
        const cellStart = cellAngle - 0.18;
        const cellEnd = cellAngle + 0.18;

        ctx.beginPath();
        ctx.arc(0, 0, 94, cellStart, cellEnd);
        ctx.arc(0, 0, 80, cellEnd, cellStart, true);
        ctx.closePath();

        const cellGrad = ctx.createRadialGradient(0, 0, 78, 0, 0, 96);
        if (isAwake) {
          const cellActive =
            state === 'thinking'
              ? (Math.floor(angle * 6) % cellCount === c)
              : true;
          cellGrad.addColorStop(0, cellActive ? 'rgba(6, 182, 212, 0.4)' : 'rgba(6, 182, 212, 0.15)');
          cellGrad.addColorStop(1, cellActive ? 'rgba(59, 130, 246, 0.7)' : 'rgba(59, 130, 246, 0.25)');
          ctx.strokeStyle = cellActive ? 'rgba(34, 211, 238, 0.85)' : 'rgba(6, 182, 212, 0.4)';
        } else {
          cellGrad.addColorStop(0, 'rgba(51, 65, 85, 0.2)');
          cellGrad.addColorStop(1, 'rgba(30, 41, 59, 0.4)');
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
        }
        ctx.fillStyle = cellGrad;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 3. Orbital Particles
      if (isAwake) {
        particles.forEach((p) => {
          p.angle += p.baseSpeed * speedMult;
          const px = Math.cos(p.angle) * p.orbitRadius;
          const py = Math.sin(p.angle) * p.orbitRadius;

          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fillStyle = coreColor;
          ctx.globalAlpha = p.opacity;
          ctx.shadowBlur = 6;
          ctx.shadowColor = coreColor;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1.0;
        });
      }

      // 4. Central Reactor Core Glow
      const pulseSize = isAwake
        ? (state === 'listening' ? 62 + audioLevel * 14 : 58 + Math.sin(pulseAngle) * 5)
        : 45;

      const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, pulseSize);
      if (isAwake) {
        innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        innerGrad.addColorStop(0.3, coreColor);
        innerGrad.addColorStop(0.7, secondaryColor);
        innerGrad.addColorStop(1, 'rgba(3, 7, 18, 0.1)');
      } else {
        innerGrad.addColorStop(0, 'rgba(100, 116, 139, 0.4)');
        innerGrad.addColorStop(0.6, 'rgba(30, 41, 59, 0.5)');
        innerGrad.addColorStop(1, 'rgba(3, 7, 18, 0.1)');
      }

      ctx.beginPath();
      ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = coreColor;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner Core Ring
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.strokeStyle = isAwake ? 'rgba(255, 255, 255, 0.7)' : 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner energy prism / core glyph
      if (isAwake) {
        const triAngle = -angle * 2;
        ctx.beginPath();
        for (let t = 0; t < 3; t++) {
          const ta = triAngle + (t * Math.PI * 2) / 3;
          const tx = Math.cos(ta) * 22;
          const ty = Math.sin(ta) * 22;
          if (t === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel, isAwake, activeTheme]);

  // Status text formatting
  const getStatusText = () => {
    if (!isAwake) return 'SYSTEM IN STANDBY';
    switch (state) {
      case 'listening':
        return languageMode === 'hi' ? 'सुन रहा हूँ, आज्ञा दीजिए... (LISTENING)' : 'LISTENING TO DIRECTIVES...';
      case 'thinking':
        return languageMode === 'hi' ? 'विश्लेषण जारी है... (COMPUTING)' : 'NEURAL PROCESSING ACTIVE...';
      case 'speaking':
        return languageMode === 'hi' ? 'उत्तर प्रसारित हो रहा है... (SPEAKING)' : 'AUDIO UPLINK BROADCASTING...';
      default:
        return 'ALL SYSTEMS NOMINAL // CORE AT 100%';
    }
  };

  const getSubStatus = () => {
    if (!isAwake) return 'PRESS WAKE BUTTON TO ACTIVATE';
    switch (state) {
      case 'listening':
        return 'VOICE RECOGNITION LOCK ENGAGED';
      case 'thinking':
        return 'GEMINI 3.8 FLASH UPLINK STREAMING';
      case 'speaking':
        return 'SYNTHESIZED VOCAL HARMONICS ONLINE';
      default:
        return 'STARK QUANTUM ENCRYPTION ACTIVE';
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* Holographic backdrop glow */}
      <div
        className={`absolute w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          !isAwake ? 'bg-slate-800/10' : 'scale-110'
        }`}
        style={{
          backgroundColor: isAwake ? activeTheme.accentGlow : undefined,
        }}
      />

      {/* Main Holographic Canvas */}
      <div className="relative z-10 w-[360px] h-[360px] max-w-[90vw] max-h-[90vw] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="w-full h-full cursor-pointer select-none"
          onClick={isAwake ? onToggleMic : onToggleWake}
          title={isAwake ? (isListening ? 'Stop listening' : 'Click to speak to JARVIS') : 'Wake up JARVIS'}
        />

        {/* Center Overlay Interactive Control Button */}
        <button
          onClick={isAwake ? onToggleMic : onToggleWake}
          style={{
            borderColor: isAwake ? activeTheme.accentColor : undefined,
            boxShadow: isAwake ? `0 0 20px ${activeTheme.accentGlow}` : undefined,
          }}
          className={`absolute z-20 w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-lg ${
            !isAwake
              ? 'bg-slate-900/90 border border-slate-700 text-slate-400'
              : isListening
              ? 'bg-black/90 border-2 text-white animate-pulse'
              : state === 'thinking'
              ? 'bg-black/90 border-2 text-white'
              : isSpeaking
              ? 'bg-black/90 border-2 text-white'
              : 'bg-black/85 border hover:scale-105'
          }`}
          aria-label={isAwake ? (isListening ? 'Stop listening' : 'Start voice input') : 'Wake JARVIS'}
        >
          {!isAwake ? (
            <Power className="w-6 h-6" />
          ) : isListening ? (
            <Mic className="w-6 h-6 animate-pulse text-cyan-200" />
          ) : isSpeaking ? (
            <Volume2 className="w-6 h-6 animate-bounce text-sky-300" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
          <span className="text-[9px] font-orbitron tracking-wider mt-0.5 uppercase">
            {!isAwake ? 'WAKE' : isListening ? 'ACTIVE' : isSpeaking ? 'VOICE' : 'SPEAK'}
          </span>
        </button>
      </div>

      {/* Holographic Status Telemetry Bar */}
      <div className="mt-2 text-center z-10 flex flex-col items-center max-w-sm px-4">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              !isAwake
                ? 'bg-slate-600'
                : state === 'listening'
                ? 'bg-cyan-400 animate-ping'
                : state === 'thinking'
                ? 'bg-blue-400 animate-spin'
                : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span
            className={`font-orbitron font-semibold text-xs tracking-widest ${
              !isAwake
                ? 'text-slate-500'
                : state === 'listening'
                ? 'text-cyan-300 text-glow-cyan'
                : state === 'thinking'
                ? 'text-blue-300 text-glow-blue'
                : 'text-cyan-400 text-glow-cyan'
            }`}
          >
            {getStatusText()}
          </span>
        </div>

        <p className="font-tech text-[11px] text-cyan-400/60 tracking-wider">
          {getSubStatus()}
        </p>

        {/* Audio Level Reactive Bar & Neural Voice Transceiver during listening */}
        {isAwake && isListening && (
          <div className="w-full max-w-xs mt-2.5 space-y-2 animate-fadeIn">
            <div className="w-48 mx-auto h-1.5 bg-slate-900/80 rounded-full overflow-hidden border border-cyan-500/30 flex items-center px-0.5">
              <div
                className="h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-75"
                style={{ width: `${Math.max(8, audioLevel * 100)}%` }}
              />
            </div>

            {onSendVoiceCommand && (
              <div className="p-2.5 rounded-xl bg-slate-950/90 border border-cyan-400/50 shadow-lg space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!voiceDraft.trim()) return;
                    const cmd = voiceDraft.trim();
                    setVoiceDraft('');
                    onToggleMic();
                    onSendVoiceCommand(cmd);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={voiceDraft}
                    onChange={(e) => setVoiceDraft(e.target.value)}
                    placeholder={
                      languageMode === 'hi'
                        ? 'आवाज़ कमांड बोलें या यहाँ लिखें...'
                        : 'Speak or enter live voice directive...'
                    }
                    className="flex-1 bg-slate-900 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs font-rajdhani text-cyan-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={!voiceDraft.trim()}
                    className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 transition-all"
                    title="Transmit voice command"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="flex flex-wrap items-center justify-center gap-1">
                  {[
                    { label: 'नमस्ते जार्विस', cmd: 'नमस्ते जार्विस, सभी सिस्टम की स्थिति बताओ' },
                    { label: 'Device Control', cmd: 'Jarvis, open full autonomous device control center' },
                    { label: 'Modify App File', cmd: 'Jarvis, open app source files editor to modify code' },
                    { label: 'Self-Upgrade', cmd: 'Jarvis, prepare autonomous self-upgrade system' },
                  ].map((vc) => (
                    <button
                      key={vc.label}
                      type="button"
                      onClick={() => {
                        onToggleMic();
                        onSendVoiceCommand(vc.cmd);
                      }}
                      className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 hover:border-cyan-400 text-[10px] font-rajdhani text-cyan-200 transition-all"
                    >
                      🎙️ {vc.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Trigger Buttons Below Core */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 z-10">
        <button
          onClick={onToggleWake}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-orbitron tracking-wider transition-all duration-300 border ${
            isAwake
              ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400'
              : 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/50 shadow-emerald-500/20 shadow-lg animate-pulse'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {isAwake ? 'STANDBY MODE' : 'WAKE UP J.A.R.V.I.S.'}
        </button>

        {isAwake && (
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-orbitron tracking-wider transition-all duration-300 border ${
              isListening
                ? 'bg-rose-950/50 border-rose-500/60 text-rose-300 shadow-rose-500/20 shadow-lg'
                : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400'
            }`}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {isListening ? 'STOP LISTENING' : 'VOICE INPUT'}
          </button>
        )}
      </div>
    </div>
  );
};
