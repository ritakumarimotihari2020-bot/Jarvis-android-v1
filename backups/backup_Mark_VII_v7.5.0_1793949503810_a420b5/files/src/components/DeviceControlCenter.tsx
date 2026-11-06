import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Cpu,
  BatteryCharging,
  Battery,
  Wifi,
  Maximize2,
  Minimize2,
  Camera,
  CameraOff,
  Sun,
  Smartphone,
  ShieldCheck,
  Zap,
  RefreshCw,
  X,
  Lock,
  Unlock,
  Compass,
  Share2,
  ClipboardCheck,
  Activity,
  HardDrive,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { playClick, playWakeChime, playResponseChime, playAlert } from '../utils/soundEffects';

interface DeviceControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  brightnessLevel: number;
  onBrightnessChange: (level: number) => void;
  soundMuted: boolean;
  onToggleSound: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onSpeak?: (text: string) => void;
}

interface HostTelemetry {
  hostname: string;
  platform: string;
  cpuModel: string;
  cpuCores: number;
  loadAverage1m: number;
  loadAverage5m: number;
  totalMemoryMB: number;
  usedMemoryMB: number;
  freeMemoryMB: number;
  memoryUsagePercent: number;
  processHeapMB: number;
  uptimeSeconds: number;
  activeInterfaces: Array<{ name: string; address: string; family: string }>;
}

interface DeviceActionRecord {
  id: string;
  action: string;
  detail: string;
  triggeredBy: 'AUTONOMOUS_CORE' | 'USER_COMMAND';
  timestamp: string;
}

export const DeviceControlCenter: React.FC<DeviceControlCenterProps> = ({
  isOpen,
  onClose,
  brightnessLevel,
  onBrightnessChange,
  soundMuted,
  onToggleSound,
  autoSpeak,
  onToggleAutoSpeak,
  onSpeak,
}) => {
  // Autonomous Autopilot & Backend Host State
  const [autopilotEnabled, setAutopilotEnabled] = useState<boolean>(true);
  const [performanceProfile, setPerformanceProfile] = useState<
    'BALANCED' | 'MAX_PERFORMANCE' | 'ECO_BATTERY_SAVER' | 'STEALTH_TACTICAL'
  >('MAX_PERFORMANCE');
  const [hostTelemetry, setHostTelemetry] = useState<HostTelemetry | null>(null);
  const [actionHistory, setActionHistory] = useState<DeviceActionRecord[]>([]);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);

  // Client Browser / Android / Laptop Hardware States
  const [batteryInfo, setBatteryInfo] = useState<{
    level: number;
    charging: boolean;
    supported: boolean;
  }>({ level: 100, charging: true, supported: false });

  const [networkInfo, setNetworkInfo] = useState<{
    online: boolean;
    effectiveType: string;
    downlinkMbps: number;
    rttMs: number;
  }>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: '4g / Wi-Fi',
    downlinkMbps: 100,
    rttMs: 15,
  });

  const [clientSpecs, setClientSpecs] = useState<{
    cores: number;
    deviceMemoryGB: number;
    screenRes: string;
    orientation: string;
    userAgentSummary: string;
  }>({
    cores: 8,
    deviceMemoryGB: 8,
    screenRes: '1920x1080',
    orientation: 'landscape',
    userAgentSummary: 'Stark OS',
  });

  // Wake Lock & Fullscreen
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Camera Optical Visor
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [snapshotDataUrl, setSnapshotDataUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // GPS Coordinates
  const [geoCoords, setGeoCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Fetch host telemetry & autopilot state from backend
  const fetchDeviceStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/device/status');
      if (res.ok) {
        const data = await res.json();
        if (data.deviceState) {
          setAutopilotEnabled(Boolean(data.deviceState.autopilotEnabled));
          setPerformanceProfile(data.deviceState.performanceProfile || 'MAX_PERFORMANCE');
          setActionHistory(data.deviceState.actionHistory || []);
        }
        if (data.hostTelemetry) {
          setHostTelemetry(data.hostTelemetry);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Read Client Hardware Specs (Battery, Network, Screen, Cores)
  const refreshClientHardware = useCallback(async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    // 1. Client CPU/RAM/Screen
    const navAny = navigator as any;
    const cores = navigator.hardwareConcurrency || 8;
    const mem = navAny.deviceMemory || 8;
    const screenRes = `${window.screen.width}×${window.screen.height}`;
    const orientation =
      window.screen.orientation?.type?.split('-')[0] ||
      (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

    setClientSpecs({
      cores,
      deviceMemoryGB: mem,
      screenRes,
      orientation,
      userAgentSummary: isAndroid ? 'Android Mobile OS' : isMobile ? 'Mobile Tactical OS' : 'Desktop Workstation OS',
    });

    // 2. Network Connection API
    const conn = navAny.connection || navAny.mozConnection || navAny.webkitConnection;
    setNetworkInfo({
      online: navigator.onLine,
      effectiveType: conn?.effectiveType ? String(conn.effectiveType).toUpperCase() : 'HIGH-SPEED',
      downlinkMbps: conn?.downlink ?? 85,
      rttMs: conn?.rtt ?? 18,
    });

    // 3. Battery Status API
    if (typeof navAny.getBattery === 'function') {
      try {
        const bat = await navAny.getBattery();
        setBatteryInfo({
          level: Math.round((bat.level ?? 1) * 100),
          charging: Boolean(bat.charging),
          supported: true,
        });
      } catch {
        // fallback
      }
    }

    setIsFullscreen(Boolean(document.fullscreenElement));
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDeviceStatus();
      refreshClientHardware();
    }
  }, [isOpen, fetchDeviceStatus, refreshClientHardware]);

  // Clean up camera stream when closed
  useEffect(() => {
    if (!isOpen && streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraActive(false);
    }
  }, [isOpen]);

  // Execute backend device action
  const executeDeviceAction = async (
    action: string,
    value?: any,
    triggeredBy: 'AUTONOMOUS_CORE' | 'USER_COMMAND' = 'USER_COMMAND'
  ) => {
    try {
      const res = await fetch('/api/device/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value, triggeredBy }),
      });
      const data = await res.json();
      if (res.ok && data.deviceState) {
        setAutopilotEnabled(Boolean(data.deviceState.autopilotEnabled));
        setPerformanceProfile(data.deviceState.performanceProfile);
        setActionHistory(data.deviceState.actionHistory || []);
        if (typeof data.deviceState.brightnessLevel === 'number') {
          onBrightnessChange(data.deviceState.brightnessLevel);
        }
        setStatusNotice(data.detail);
        if (onSpeak && data.speechText && triggeredBy === 'USER_COMMAND') {
          onSpeak(data.speechText);
        }
      }
      await fetchDeviceStatus();
    } catch (e: any) {
      setStatusNotice('Device action notice: ' + e.message);
    }
  };

  // Toggle Screen Wake Lock (keeps Android/Laptop screen from sleeping)
  const handleToggleWakeLock = async () => {
    playClick();
    const navAny = navigator as any;
    if (wakeLockActive && wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
      setWakeLockActive(false);
      setStatusNotice('Screen Wake Lock released. Device display sleep timer restored to OS default.');
      return;
    }

    if ('wakeLock' in navigator && navAny.wakeLock?.request) {
      try {
        wakeLockRef.current = await navAny.wakeLock.request('screen');
        setWakeLockActive(true);
        playWakeChime();
        setStatusNotice('Screen Wake Lock ACTIVE: Device screen will remain awake continuously.');
        executeDeviceAction('wake_lock_engaged', true, 'USER_COMMAND');
      } catch {
        setWakeLockActive(true);
        setStatusNotice('Wake Lock standby active in browser container.');
      }
    } else {
      setWakeLockActive(!wakeLockActive);
      setStatusNotice('Screen Wake Lock keep-alive active.');
    }
  };

  // Toggle Fullscreen Mode
  const handleToggleFullscreen = async () => {
    playClick();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setStatusNotice('Full-Device Immersive HUD Mode engaged.');
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        setStatusNotice('Exited Fullscreen HUD Mode.');
      }
    } catch {
      setStatusNotice('Fullscreen toggle restricted by preview iframe container; HUD maximized.');
    }
  };

  // Trigger Android / Device Haptic Vibration
  const handleTriggerHaptics = (pattern: number | number[], label: string) => {
    playClick();
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
      setStatusNotice(`Tactile Haptic Pulse '${label}' transmitted to device hardware.`);
    } else {
      playResponseChime();
      setStatusNotice(`Acoustic-tactile pulse '${label}' simulated (Hardware vibration API on desktop).`);
    }
  };

  // Toggle Camera Optical Sensor
  const handleToggleCamera = async (facingOverride?: 'user' | 'environment') => {
    playClick();
    const targetFacing = facingOverride || cameraFacing;

    if (cameraActive && !facingOverride) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      setStatusNotice('Optical camera sensor stream closed.');
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: targetFacing, width: { ideal: 640 }, height: { ideal: 360 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setCameraFacing(targetFacing);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      playWakeChime();
      setStatusNotice(`Optical sensor feed online (${targetFacing === 'user' ? 'Front Visor' : 'Environment Cam'}).`);
    } catch (err: any) {
      playAlert();
      setStatusNotice('Camera sensor access denied or unavailable: ' + err.message);
    }
  };

  // Capture Optical Snapshot from live video
  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !cameraActive) return;
    playClick();
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setSnapshotDataUrl(canvas.toDataURL('image/png'));
      playResponseChime();
      setStatusNotice('Optical visor frame captured and analyzed.');
    }
  };

  // Acquire GPS Coordinates
  const handleAcquireLocation = () => {
    playClick();
    if (!('geolocation' in navigator)) {
      setStatusNotice('Geolocation hardware API not supported on this device.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setGeoCoords({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
          accuracy: Math.round(pos.coords.accuracy),
        });
        playResponseChime();
        setStatusNotice(`Device sector coordinates locked (±${Math.round(pos.coords.accuracy)}m accuracy).`);
      },
      (err) => {
        setIsLocating(false);
        setStatusNotice('Location read declined or unavailable: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Copy Full Device Telemetry Report to Clipboard
  const handleCopyTelemetryToClipboard = async () => {
    playClick();
    const report = JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        autopilotEnabled,
        performanceProfile,
        batteryInfo,
        networkInfo,
        clientSpecs,
        hostTelemetry,
      },
      null,
      2
    );
    try {
      await navigator.clipboard.writeText(report);
      playResponseChime();
      setStatusNotice('Complete device & hardware telemetry copied to system clipboard.');
    } catch {
      setStatusNotice('Telemetry snapshot prepared.');
    }
  };

  // Native OS Share Sheet (Android / Laptop)
  const handleNativeShare = async () => {
    playClick();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'J.A.R.V.I.S. Device Telemetry Report',
          text: `J.A.R.V.I.S. Mark VII Online • Profile: ${performanceProfile} • Battery: ${batteryInfo.level}% • Host RAM: ${hostTelemetry?.usedMemoryMB}/${hostTelemetry?.totalMemoryMB} MB`,
          url: window.location.href,
        });
        setStatusNotice('Shared via native OS share sheet.');
      } catch {
        // user cancelled share
      }
    } else {
      await handleCopyTelemetryToClipboard();
    }
  };

  // Autonomous Full-Device Calibration (1-click self-control sweep)
  const handleAutonomousFullCalibration = async () => {
    playClick();
    setIsCalibrating(true);
    setStatusNotice('Autonomous Core taking control: Calibrating CPU/RAM buffers, engaging Wake Lock, optimizing brightness & creating safety backup...');

    if (!wakeLockActive) {
      await handleToggleWakeLock();
    }
    await executeDeviceAction('autonomous_self_tune', true, 'AUTONOMOUS_CORE');
    await refreshClientHardware();
    setIsCalibrating(false);
    playWakeChime();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn font-rajdhani">
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[880px] bg-[#030712] border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-slate-100">
        {/* TOP HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-cyan-500/30 bg-slate-950/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_#22d3ee]">
              <Smartphone className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-orbitron font-extrabold text-sm sm:text-base tracking-widest text-cyan-300 text-glow-cyan">
                  J.A.R.V.I.S. AUTONOMOUS DEVICE CONTROL CENTER
                </span>
                <span
                  className={`font-tech text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                    autopilotEnabled
                      ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-300'
                      : 'bg-amber-950/80 border-amber-400/60 text-amber-300'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {autopilotEnabled ? 'AUTONOMOUS CONTROL: ACTIVE' : 'MANUAL OVERRIDE'}
                </span>
              </div>
              <p className="font-tech text-[11px] text-cyan-400/75 hidden sm:block">
                FULL HARDWARE & HOST OS BRIDGE • BATTERY, DISPLAY, WAKE LOCK, CAMERA, HAPTICS & MEMORY AUTOPILOT
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAutonomousFullCalibration}
              disabled={isCalibrating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-orbitron font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
              <span>{isCalibrating ? 'CALIBRATING DEVICE...' : 'AUTONOMOUS FULL CALIBRATION'}</span>
            </button>

            <button
              onClick={() => executeDeviceAction('toggle_autopilot', !autopilotEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-orbitron font-bold transition-all ${
                autopilotEnabled
                  ? 'border-emerald-400/60 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/60'
                  : 'border-slate-600 bg-slate-900 text-slate-300 hover:border-cyan-400'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{autopilotEnabled ? 'AUTOPILOT: ON (स्वतः नियंत्रण)' : 'AUTOPILOT: OFF'}</span>
            </button>

            <button
              onClick={() => {
                playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STATUS NOTICE BAR */}
        {statusNotice && (
          <div className="px-5 py-2 bg-cyan-950/80 border-b border-cyan-500/30 text-xs text-cyan-200 flex items-center justify-between gap-2 shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-tech tracking-wide">{statusNotice}</span>
            </div>
            <button
              onClick={() => setStatusNotice(null)}
              className="text-[10px] font-orbitron text-cyan-400 hover:text-cyan-200 uppercase"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* MAIN BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ROW 1: REAL-TIME HARDWARE TELEMETRY CARDS (BATTERY, NETWORK, CLIENT OS, HOST CPU/RAM) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Battery & Power */}
            <div className="p-3.5 bg-slate-950/90 border border-cyan-500/25 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-orbitron text-slate-400">DEVICE BATTERY & POWER</span>
                {batteryInfo.charging ? (
                  <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
                ) : (
                  <Battery className="w-4 h-4 text-cyan-400" />
                )}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-orbitron font-extrabold text-cyan-200">
                  {batteryInfo.level}%
                </span>
                <span className="font-tech text-[11px] text-emerald-400">
                  {batteryInfo.charging ? 'AC CHARGING' : 'BATTERY DISCHARGE'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all"
                  style={{ width: `${batteryInfo.level}%` }}
                />
              </div>
            </div>

            {/* Card 2: Network & Downlink */}
            <div className="p-3.5 bg-slate-950/90 border border-cyan-500/25 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-orbitron text-slate-400">NETWORK & UPLINK</span>
                <Wifi className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-orbitron font-extrabold text-cyan-200">
                  {networkInfo.effectiveType}
                </span>
                <span className="font-tech text-[11px] text-cyan-400">
                  {networkInfo.downlinkMbps} Mbps • {networkInfo.rttMs}ms
                </span>
              </div>
              <div className="text-[11px] font-tech text-emerald-400">
                {networkInfo.online ? 'ONLINE • ENCRYPTED TELEMETRY' : 'OFFLINE FALLBACK MODE'}
              </div>
            </div>

            {/* Card 3: Client Device Hardware */}
            <div className="p-3.5 bg-slate-950/90 border border-cyan-500/25 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-orbitron text-slate-400">CLIENT HARDWARE</span>
                <Smartphone className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-base font-orbitron font-bold text-cyan-200 truncate">
                {clientSpecs.userAgentSummary}
              </div>
              <div className="text-[11px] font-tech text-slate-300">
                {clientSpecs.cores} Logical Cores • ~{clientSpecs.deviceMemoryGB} GB RAM
              </div>
              <div className="text-[10px] font-tech text-cyan-400/80">
                Display: {clientSpecs.screenRes} ({clientSpecs.orientation})
              </div>
            </div>

            {/* Card 4: Host OS CPU & RAM */}
            <div className="p-3.5 bg-slate-950/90 border border-cyan-500/25 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-orbitron text-slate-400">HOST SYSTEM RAM & CPU</span>
                <HardDrive className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-orbitron font-extrabold text-emerald-300">
                  {hostTelemetry?.memoryUsagePercent ?? 42}% RAM
                </span>
                <span className="font-tech text-[11px] text-slate-300">
                  Load: {hostTelemetry?.loadAverage1m ?? 0.25}
                </span>
              </div>
              <div className="text-[10px] font-tech text-cyan-300/80 truncate">
                {hostTelemetry
                  ? `${hostTelemetry.usedMemoryMB} / ${hostTelemetry.totalMemoryMB} MB • ${hostTelemetry.cpuCores} Cores`
                  : 'Synchronizing host metrics...'}
              </div>
            </div>
          </div>

          {/* ROW 2: HARDWARE PERFORMANCE PROFILES & DISPLAY / AUDIO / HAPTICS CONTROLS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 7 Cols: Hardware Switches, Luminance Slider, Haptics & Profiles */}
            <div className="lg:col-span-7 space-y-4">
              {/* Autonomous Performance Profile Selector */}
              <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-cyan-300 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    AUTONOMOUS HARDWARE POWER & PERFORMANCE PROFILE
                  </span>
                  <span className="font-tech text-[11px] text-emerald-400">
                    Active: {performanceProfile}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'MAX_PERFORMANCE', label: 'MAX OVERDRIVE', desc: '105% Brightness • Full Threads' },
                    { id: 'BALANCED', label: 'BALANCED SPEC', desc: '100% Nominal • Auto-Scale' },
                    { id: 'ECO_BATTERY_SAVER', label: 'ECO BATTERY', desc: '80% Luminance • Low Draw' },
                    { id: 'STEALTH_TACTICAL', label: 'STEALTH MODE', desc: '65% Dimmed • Quiet Audio' },
                  ].map((p) => {
                    const active = performanceProfile === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          playClick();
                          executeDeviceAction('set_profile', p.id);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100 shadow-md shadow-cyan-500/15'
                            : 'bg-slate-950/80 border-cyan-500/20 text-slate-400 hover:border-cyan-400/50 hover:text-cyan-200'
                        }`}
                      >
                        <div className="font-orbitron text-[11px] font-bold">{p.label}</div>
                        <div className="text-[10px] font-tech opacity-80 mt-0.5">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Direct Device Hardware Switches */}
              <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-4">
                <div className="font-orbitron text-xs font-bold text-cyan-300 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  DIRECT DEVICE HARDWARE & DISPLAY CONTROLS
                </div>

                {/* Display Brightness / Optical Luminance Slider */}
                <div className="p-3 bg-slate-950/80 border border-cyan-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-orbitron font-bold text-cyan-200 flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-400" />
                      DISPLAY OPTICAL LUMINANCE (HUD BRIGHTNESS)
                    </span>
                    <span className="font-tech text-cyan-300 font-bold">{brightnessLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={120}
                    value={brightnessLevel}
                    onChange={(e) => onBrightnessChange(Number(e.target.value))}
                    onMouseUp={() => executeDeviceAction('set_brightness', brightnessLevel)}
                    onTouchEnd={() => executeDeviceAction('set_brightness', brightnessLevel)}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Hardware Action Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* Screen Wake Lock */}
                  <button
                    onClick={handleToggleWakeLock}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      wakeLockActive
                        ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
                        : 'bg-slate-950/80 border-cyan-500/25 text-slate-300 hover:border-cyan-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-orbitron text-[11px] font-bold">WAKE LOCK</span>
                      {wakeLockActive ? <Lock className="w-4 h-4 text-emerald-400" /> : <Unlock className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px] font-tech">
                      {wakeLockActive ? 'SCREEN LOCKED AWAKE' : 'ALLOW SCREEN SLEEP'}
                    </span>
                  </button>

                  {/* Fullscreen HUD */}
                  <button
                    onClick={handleToggleFullscreen}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isFullscreen
                        ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950/80 border-cyan-500/25 text-slate-300 hover:border-cyan-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-orbitron text-[11px] font-bold">FULLSCREEN HUD</span>
                      {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-300" /> : <Maximize2 className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px] font-tech">
                      {isFullscreen ? 'IMMERSIVE ACTIVE' : 'EXPAND FULL DISPLAY'}
                    </span>
                  </button>

                  {/* Master Audio Mute/Unmute */}
                  <button
                    onClick={() => {
                      playClick();
                      onToggleSound();
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      !soundMuted
                        ? 'bg-cyan-950/60 border-cyan-400/60 text-cyan-200'
                        : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-orbitron text-[11px] font-bold">DEVICE AUDIO</span>
                      {soundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
                    </div>
                    <span className="text-[10px] font-tech">
                      {soundMuted ? 'AUDIO MUTED' : 'AUDIO & VOICE ACTIVE'}
                    </span>
                  </button>

                  {/* Optimize Host Memory */}
                  <button
                    onClick={() => {
                      playClick();
                      executeDeviceAction('optimize_memory');
                    }}
                    className="p-3 rounded-xl border bg-slate-950/80 border-cyan-500/25 hover:border-cyan-400 text-slate-200 text-left transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-orbitron text-[11px] font-bold">RAM PURGE</span>
                      <RefreshCw className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-[10px] font-tech text-cyan-400/80">
                      OPTIMIZE BUFFERS
                    </span>
                  </button>

                  {/* GPS Sector Lock */}
                  <button
                    onClick={handleAcquireLocation}
                    disabled={isLocating}
                    className="p-3 rounded-xl border bg-slate-950/80 border-cyan-500/25 hover:border-cyan-400 text-slate-200 text-left transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-orbitron text-[11px] font-bold">GPS SECTOR</span>
                      <Compass className={`w-4 h-4 text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
                    </div>
                    <span className="text-[10px] font-tech text-cyan-300 truncate">
                      {geoCoords ? `${geoCoords.lat}, ${geoCoords.lng}` : 'LOCK COORDINATES'}
                    </span>
                  </button>

                  {/* Native Share / Clipboard */}
                  <button
                    onClick={handleNativeShare}
                    className="p-3 rounded-xl border bg-slate-950/80 border-cyan-500/25 hover:border-cyan-400 text-slate-200 text-left transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-orbitron text-[11px] font-bold">SHARE / COPY</span>
                      <Share2 className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-[10px] font-tech text-cyan-400/80">
                      EXPORT TELEMETRY
                    </span>
                  </button>
                </div>

                {/* Haptic Vibration Patterns Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-cyan-500/15">
                  <span className="text-[11px] font-orbitron text-slate-400">
                    TACTILE HAPTIC FEEDBACK (ANDROID / DEVICE):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTriggerHaptics(80, 'Single Pulse')}
                      className="px-2.5 py-1 rounded bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-[11px] font-tech text-cyan-300"
                    >
                      PULSE
                    </button>
                    <button
                      onClick={() => handleTriggerHaptics([70, 50, 120], 'Double Lock')}
                      className="px-2.5 py-1 rounded bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-[11px] font-tech text-cyan-300"
                    >
                      DOUBLE TAP
                    </button>
                    <button
                      onClick={() => handleTriggerHaptics([120, 60, 120, 60, 240], 'Tactical Alert')}
                      className="px-2.5 py-1 rounded bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-[11px] font-tech text-cyan-300"
                    >
                      TACTICAL ALERT
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Optical Sensor Camera Visor + Autonomous Action Log */}
            <div className="lg:col-span-5 space-y-4">
              {/* Optical Sensor / Camera Visor */}
              <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-cyan-300 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    OPTICAL SENSOR VISOR (CAMERA CONTROL)
                  </span>
                  <div className="flex items-center gap-1.5">
                    {cameraActive && (
                      <button
                        onClick={() =>
                          handleToggleCamera(cameraFacing === 'user' ? 'environment' : 'user')
                        }
                        className="px-2 py-1 rounded bg-slate-950 border border-cyan-500/30 text-[10px] font-orbitron text-cyan-300"
                      >
                        FLIP CAM
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleCamera()}
                      className={`px-2.5 py-1 rounded text-[11px] font-orbitron font-bold flex items-center gap-1 ${
                        cameraActive
                          ? 'bg-rose-500/30 border border-rose-400 text-rose-200'
                          : 'bg-cyan-500 text-slate-950'
                      }`}
                    >
                      {cameraActive ? (
                        <>
                          <CameraOff className="w-3 h-3" /> STOP CAM
                        </>
                      ) : (
                        <>
                          <Camera className="w-3 h-3" /> ACTIVATE VISOR
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="relative w-full h-44 bg-black rounded-xl border border-cyan-500/30 overflow-hidden flex items-center justify-center">
                  {cameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* HUD Target Reticle Overlay */}
                      <div className="absolute inset-0 pointer-events-none border border-cyan-400/30 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full border border-cyan-400/50 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        </div>
                      </div>
                      <button
                        onClick={handleCaptureSnapshot}
                        className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-cyan-950/90 border border-cyan-400 text-[10px] font-orbitron text-cyan-200 hover:bg-cyan-900"
                      >
                        CAPTURE FRAME
                      </button>
                    </>
                  ) : snapshotDataUrl ? (
                    <div className="relative w-full h-full">
                      <img
                        src={snapshotDataUrl}
                        alt="Captured Optical Frame"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setSnapshotDataUrl(null)}
                        className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-orbitron text-rose-300 border border-rose-500/40"
                      >
                        CLEAR
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-1 p-4">
                      <Camera className="w-7 h-7 text-cyan-500/40 mx-auto" />
                      <div className="text-xs font-orbitron text-slate-400">
                        OPTICAL SENSOR STANDBY
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Click "ACTIVATE VISOR" to stream live device camera optics into the Stark HUD.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Autonomous Device Control Ledger */}
              <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-cyan-400" />
                    AUTONOMOUS DEVICE CONTROL LOG
                  </span>
                  <span className="font-tech text-[10px] text-emerald-400">
                    {actionHistory.length} EVENTS
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {actionHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-slate-950/80 border border-cyan-500/15 text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-orbitron font-bold text-cyan-300 text-[10px]">
                          {item.action}
                        </span>
                        <span
                          className={`font-tech text-[9px] px-1.5 py-0.5 rounded ${
                            item.triggeredBy === 'AUTONOMOUS_CORE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                          }`}
                        >
                          {item.triggeredBy}
                        </span>
                      </div>
                      <p className="text-slate-300 font-tech mt-0.5">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-2 border-t border-cyan-500/20 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-tech text-cyan-400/60 shrink-0">
          <div>
            STARK HARDWARE & OS BRIDGE // HOST: {hostTelemetry?.platform || 'LINUX x64'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">AUTONOMOUS DEVICE AUTOPILOT READY</span>
            <span>•</span>
            <span className="text-cyan-300">REAL-TIME HARDWARE TELEMETRY</span>
          </div>
        </div>
      </div>
    </div>
  );
};
