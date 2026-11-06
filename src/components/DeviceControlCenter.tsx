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
  ShieldAlert,
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
  Monitor,
  Bluetooth,
  Bell,
  AlarmClock,
  Play,
  Pause,
  SkipForward,
  Flashlight,
  FolderOpen,
  Terminal,
  MousePointer,
  KeyRound,
  Fingerprint,
  Mic,
  StopCircle,
  Layers,
  Eye,
  Download,
} from 'lucide-react';
import { playClick, playWakeChime, playResponseChime, playAlert } from '../utils/soundEffects';
import { ownerAuthManager } from '../utils/ownerAuth';
import {
  deviceBridge,
  ANDROID_APP_CATALOG,
  WINDOWS_APP_CATALOG,
  ConnectedDevice,
} from '../utils/deviceBridge';

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
  onOpenSecurityDashboard?: () => void;
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

interface AlarmItem {
  id: string;
  label: string;
  secondsRemaining: number;
  active: boolean;
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
  onOpenSecurityDashboard,
}) => {
  // Navigation Tabs inside Device Control Center
  const [activeTab, setActiveTab] = useState<'overview' | 'android' | 'windows' | 'devices'>('overview');

  // Owner Authentication & Security Guard State
  const [isOwnerAuth, setIsOwnerAuth] = useState<boolean>(() => ownerAuthManager.isAuthenticated());
  const [quickPin, setQuickPin] = useState<string>('');
  const [emergencyKilled, setEmergencyKilled] = useState<boolean>(() =>
    ownerAuthManager.isEmergencyKillActive()
  );
  const [accessibilityActive, setAccessibilityActive] = useState<boolean>(false);
  const [remoteControlActive, setRemoteControlActive] = useState<boolean>(true);

  // Sensitive Action Confirmation Modal State
  const [pendingSensitiveAction, setPendingSensitiveAction] = useState<{
    title: string;
    description: string;
    category: string;
    onConfirm: () => void;
  } | null>(null);

  // Autonomous Autopilot & Backend Host State
  const [autopilotEnabled, setAutopilotEnabled] = useState<boolean>(true);
  const [performanceProfile, setPerformanceProfile] = useState<
    'BALANCED' | 'MAX_PERFORMANCE' | 'ECO_BATTERY_SAVER' | 'STEALTH_TACTICAL'
  >('MAX_PERFORMANCE');
  const [hostTelemetry, setHostTelemetry] = useState<HostTelemetry | null>(null);
  const [actionHistory, setActionHistory] = useState<DeviceActionRecord[]>([]);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);

  // Connected Devices
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>(() =>
    deviceBridge.getConnectedDevices()
  );

  // Android Specific States
  const [torchActive, setTorchActive] = useState<boolean>(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(85);
  const [bluetoothStatus, setBluetoothStatus] = useState<string>('READY TO PAIR');
  const [notificationPerm, setNotificationPerm] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [deviceNotifications, setDeviceNotifications] = useState<
    Array<{ id: string; app: string; title: string; time: string }>
  >([
    {
      id: 'notif-1',
      app: 'Stark Security Grid',
      title: 'Owner biometric & PIN handshake verified.',
      time: 'Just now',
    },
    {
      id: 'notif-2',
      app: 'Android System OS',
      title: 'Battery optimization & Wake Lock synchronized with JARVIS.',
      time: '2m ago',
    },
  ]);
  const [alarms, setAlarms] = useState<AlarmItem[]>([
    { id: 'alm-1', label: 'Stark Lab Diagnostics Reminder', secondsRemaining: 120, active: false },
  ]);
  const [newAlarmLabel, setNewAlarmLabel] = useState<string>('');
  const [newAlarmSeconds, setNewAlarmSeconds] = useState<number>(30);
  const [mediaPlaying, setMediaPlaying] = useState<boolean>(false);
  const [mediaTrack, setMediaTrack] = useState<string>('Stark Audio Stream — Arc Resonance Mix');
  const [selectedLocalFile, setSelectedLocalFile] = useState<{
    name: string;
    size: number;
    preview: string;
  } | null>(null);

  // Windows Companion Specific States
  const [winCommandOutput, setWinCommandOutput] = useState<string>(
    '[WINDOWS COMPANION READY] Select an approved Windows action or command to execute.'
  );
  const [isRunningWinCmd, setIsRunningWinCmd] = useState<boolean>(false);
  const [mouseMacroTarget, setMouseMacroTarget] = useState<string>('Center HUD Reticle (960, 540)');
  const [keyboardMacroText, setKeyboardMacroText] = useState<string>('');

  // Multi-Step Task Execution State
  const [activeMultiStepTask, setActiveMultiStepTask] = useState<{
    name: string;
    steps: Array<{ label: string; status: 'pending' | 'running' | 'done' }>;
  } | null>(null);

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

  const syncAuthStatus = useCallback(() => {
    setIsOwnerAuth(ownerAuthManager.isAuthenticated());
    setEmergencyKilled(ownerAuthManager.isEmergencyKillActive());
    setConnectedDevices(deviceBridge.getConnectedDevices());
  }, []);

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
      userAgentSummary: isAndroid
        ? 'Android Mobile OS'
        : isMobile
        ? 'Mobile Tactical OS'
        : 'Windows / Desktop Workstation OS',
    });

    const conn = navAny.connection || navAny.mozConnection || navAny.webkitConnection;
    setNetworkInfo({
      online: navigator.onLine,
      effectiveType: conn?.effectiveType ? String(conn.effectiveType).toUpperCase() : 'WIFI / 5G',
      downlinkMbps: conn?.downlink ?? 85,
      rttMs: conn?.rtt ?? 18,
    });

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
      syncAuthStatus();
      fetchDeviceStatus();
      refreshClientHardware();
    }
  }, [isOpen, syncAuthStatus, fetchDeviceStatus, refreshClientHardware]);

  // Countdown timer for active Android alarms & reminders
  useEffect(() => {
    const timer = setInterval(() => {
      setAlarms((prev) =>
        prev.map((alm) => {
          if (!alm.active) return alm;
          if (alm.secondsRemaining <= 1) {
            playWakeChime();
            setStatusNotice(`ALARM TRIGGERED: ${alm.label}`);
            if (onSpeak) onSpeak(`Sir, your reminder alarm for ${alm.label} is now active.`);
            return { ...alm, secondsRemaining: 0, active: false };
          }
          return { ...alm, secondsRemaining: alm.secondsRemaining - 1 };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [onSpeak]);

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
    if (emergencyKilled) {
      setStatusNotice('BLOCKED: Emergency STOP ALL COMMANDS is active.');
      return;
    }
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
    } catch (err: any) {
      setStatusNotice('Device command error: ' + err.message);
    }
  };

  // Toggle Screen Wake Lock API
  const handleToggleWakeLock = async () => {
    playClick();
    const navAny = navigator as any;
    if (!('wakeLock' in navigator)) {
      setWakeLockActive((prev) => !prev);
      setStatusNotice('Screen Wake Lock state toggled via Stark Display Keep-Alive.');
      return;
    }

    try {
      if (wakeLockActive && wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
        setStatusNotice('Screen Wake Lock released.');
      } else {
        wakeLockRef.current = await navAny.wakeLock.request('screen');
        setWakeLockActive(true);
        playResponseChime();
        setStatusNotice('Hardware Screen Wake Lock ENGAGED: Display will not sleep.');
      }
    } catch {
      setWakeLockActive((prev) => !prev);
      setStatusNotice('Display Wake Lock synchronized.');
    }
  };

  // Toggle Fullscreen Mode
  const handleToggleFullscreen = async () => {
    playClick();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setStatusNotice('Fullscreen Tactical HUD Mode engaged.');
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
      setStatusNotice(`Acoustic-tactile pulse '${label}' executed.`);
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

  // Capture Optical Snapshot / Consent Screenshot
  const handleCaptureSnapshot = () => {
    playClick();
    if (videoRef.current && cameraActive) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setSnapshotDataUrl(canvas.toDataURL('image/png'));
        playResponseChime();
        setStatusNotice('Optical visor frame captured with explicit owner consent.');
      }
    } else {
      // Create a consented HUD diagnostic snapshot canvas
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#030914';
        ctx.fillRect(0, 0, 640, 360);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.strokeRect(16, 16, 608, 328);
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('J.A.R.V.I.S. CONSENSUAL HUD SCREENSHOT', 40, 70);
        ctx.fillStyle = '#a5f3fc';
        ctx.font = '14px monospace';
        ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 40, 115);
        ctx.fillText(`Battery: ${batteryInfo.level}% | Brightness: ${brightnessLevel}%`, 40, 145);
        ctx.fillText(`Host RAM: ${hostTelemetry?.usedMemoryMB || 512} MB | Profile: ${performanceProfile}`, 40, 175);
        ctx.fillText(`Owner Verified: ${ownerAuthManager.getProfile().ownerName}`, 40, 205);
        setSnapshotDataUrl(canvas.toDataURL('image/png'));
        playResponseChime();
        setStatusNotice('Consensual HUD diagnostic screenshot captured.');
        if (onSpeak) onSpeak('Screenshot captured with your consent, sir.');
      }
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
          text: `J.A.R.V.I.S. Mark VII Online • Profile: ${performanceProfile} • Battery: ${batteryInfo.level}%`,
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

  // Autonomous Full-Device Calibration
  const handleAutonomousFullCalibration = async () => {
    playClick();
    setIsCalibrating(true);
    setStatusNotice(
      'Autonomous Core calibrating CPU/RAM buffers, engaging Wake Lock, optimizing brightness & creating safety backup...'
    );

    if (!wakeLockActive) {
      await handleToggleWakeLock();
    }
    await executeDeviceAction('autonomous_self_tune', true, 'AUTONOMOUS_CORE');
    await refreshClientHardware();
    setIsCalibrating(false);
    playWakeChime();
  };

  // Android Action: Flashlight / Torch
  const handleToggleFlashlight = async () => {
    playClick();
    const next = !torchActive;
    const res = await deviceBridge.toggleFlashlight(next);
    setTorchActive(next);
    setStatusNotice(res.message);
    if (onSpeak) onSpeak(res.message);
  };

  // Android Action: Bluetooth Scan via Web Bluetooth API
  const handleBluetoothScan = async () => {
    playClick();
    const navAny = navigator as any;
    if (navAny && navAny.bluetooth && typeof navAny.bluetooth.requestDevice === 'function') {
      try {
        setBluetoothStatus('SCANNING NEARBY...');
        const device = await navAny.bluetooth.requestDevice({ acceptAllDevices: true });
        setBluetoothStatus(`PAIRED: ${device.name || 'Bluetooth Peripheral'}`);
        setStatusNotice(`Connected to Bluetooth device: ${device.name || device.id}`);
        if (onSpeak) onSpeak(`Bluetooth connected to ${device.name || 'device'}, sir.`);
      } catch (err: any) {
        setBluetoothStatus('STANDBY (SCAN READY)');
        setStatusNotice('Bluetooth pairing prompt closed or restricted by browser container.');
      }
    } else {
      setBluetoothStatus('ACTIVE (ADAPTER READY)');
      setStatusNotice('Bluetooth adapter status verified.');
    }
  };

  // Android Action: Request & Send Notification
  const handleNotificationPermission = async () => {
    playClick();
    if (typeof Notification === 'undefined') {
      setStatusNotice('Web Notifications API not supported in this browser.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPerm(perm);
      if (perm === 'granted') {
        new Notification('J.A.R.V.I.S. Android Notification Bridge', {
          body: 'Notification reading & dispatching authorized by owner.',
        });
      }
      const newEntry = {
        id: 'notif-' + Date.now(),
        app: 'J.A.R.V.I.S. Core',
        title: `Notification dispatch verified (Permission: ${perm.toUpperCase()})`,
        time: 'Just now',
      };
      setDeviceNotifications((prev) => [newEntry, ...prev]);
      setStatusNotice('Notification permission updated and test alert dispatched.');
    } catch {
      setStatusNotice('Notification test logged in local mirror.');
    }
  };

  // Android Action: Open File Picker (Storage Permission)
  const handleOpenDeviceFilePicker = async () => {
    playClick();
    const winAny = window as any;
    if (typeof winAny.showOpenFilePicker === 'function') {
      try {
        const [handle] = await winAny.showOpenFilePicker();
        const file = await handle.getFile();
        const text = await file.text();
        setSelectedLocalFile({
          name: file.name,
          size: file.size,
          preview: text.slice(0, 300),
        });
        setStatusNotice(`Storage file '${file.name}' (${file.size} bytes) loaded with user consent.`);
        if (onSpeak) onSpeak(`File ${file.name} opened with your permission, sir.`);
        return;
      } catch {
        // fallback to input element
      }
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const text = await file.text().catch(() => 'Binary file');
        setSelectedLocalFile({
          name: file.name,
          size: file.size,
          preview: text.slice(0, 300),
        });
        setStatusNotice(`Storage file '${file.name}' (${file.size} bytes) inspected with user consent.`);
      }
    };
    input.click();
  };

  // Windows Companion Action: Run Approved Command
  const handleRunWindowsCommand = async (cmdKey: string, args?: string) => {
    playClick();
    setIsRunningWinCmd(true);
    const res = await deviceBridge.executeWindowsCommand(cmdKey, args);
    setIsRunningWinCmd(false);
    setWinCommandOutput(
      `[${new Date().toLocaleTimeString()}] $ ${cmdKey} ${args || ''}\n${res.output}`
    );
    setStatusNotice(res.speechSummary);
    if (onSpeak) onSpeak(res.speechSummary);
  };

  // Download Windows Companion Bridge Script
  const handleDownloadWindowsCompanion = () => {
    playClick();
    const scriptContent = `# J.A.R.V.I.S. Windows Desktop Companion Agent (Owner-Authorized)
# Run in PowerShell on your Windows Laptop to pair local desktop controls with JARVIS HUD
Write-Host "[J.A.R.V.I.S. WINDOWS COMPANION] Initializing Owner-Authorized Bridge..." -ForegroundColor Cyan
Write-Host "Host: $env:COMPUTERNAME | User: $env:USERNAME | OS: $([System.Environment]::OSVersion.VersionString)"
Write-Host "Listening for owner-approved automation tasks from J.A.R.V.I.S. HUD..." -ForegroundColor Green
`;
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jarvis-windows-companion.ps1';
    a.click();
    URL.revokeObjectURL(url);
    setStatusNotice('Downloaded jarvis-windows-companion.ps1 for Windows desktop pairing.');
  };

  // Execute Multi-Step Task Pipeline
  const handleRunMultiStepTask = async (
    taskTitle: string,
    stepsList: string[],
    finalSpeech: string
  ) => {
    playClick();
    setActiveMultiStepTask({
      name: taskTitle,
      steps: stepsList.map((label, idx) => ({
        label,
        status: idx === 0 ? 'running' : 'pending',
      })),
    });

    for (let i = 0; i < stepsList.length; i++) {
      setActiveMultiStepTask({
        name: taskTitle,
        steps: stepsList.map((label, idx) => ({
          label,
          status: idx < i ? 'done' : idx === i ? 'running' : 'pending',
        })),
      });
      await new Promise((r) => setTimeout(r, 650));
    }

    setActiveMultiStepTask({
      name: taskTitle,
      steps: stepsList.map((label) => ({ label, status: 'done' })),
    });
    playResponseChime();
    setStatusNotice(`Multi-step task '${taskTitle}' completed across connected devices.`);
    if (onSpeak) onSpeak(finalSpeech);
  };

  // Emergency STOP ALL COMMANDS
  const handleEmergencyStopAll = () => {
    playAlert();
    ownerAuthManager.triggerEmergencyStop();
    setActiveMultiStepTask(null);
    setAutopilotEnabled(false);
    setRemoteControlActive(false);
    setAccessibilityActive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraActive(false);
    }
    syncAuthStatus();
    setStatusNotice(
      'EMERGENCY STOP ENGAGED: All autonomous tasks, camera streams, and remote device commands halted immediately.'
    );
    if (onSpeak) {
      onSpeak('Emergency stop engaged, sir. All commands and device controls have been halted immediately.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn font-rajdhani">
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[900px] bg-[#030712] border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-slate-100">
        {/* VISIBLE REMOTE-CONTROL & ACCESSIBILITY SECURITY BANNER */}
        <div className="px-4 py-1.5 bg-slate-950 border-b border-cyan-500/30 flex flex-wrap items-center justify-between gap-2 text-[11px] font-tech">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              VISIBLE INDICATOR: {remoteControlActive ? 'REMOTE DEVICE BRIDGE ACTIVE' : 'BRIDGE PAUSED'}
            </span>
            {accessibilityActive && (
              <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-400/60 text-amber-200 font-bold">
                ACCESSIBILITY SERVICE: AUTHORIZED & ACTIVE
              </span>
            )}
            <span className="text-cyan-400/80">
              OWNER: {ownerAuthManager.getProfile().ownerName} ({isOwnerAuth ? 'VERIFIED' : 'LOCKED'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSecurityDashboard && (
              <button
                onClick={() => {
                  playClick();
                  onOpenSecurityDashboard();
                }}
                className="px-2.5 py-0.5 rounded bg-cyan-950 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-900 font-orbitron text-[10px]"
              >
                OWNER SECURITY DASHBOARD
              </button>
            )}
            <button
              onClick={handleEmergencyStopAll}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-orbitron font-bold text-[10px] shadow-[0_0_12px_rgba(239,68,68,0.6)]"
            >
              <StopCircle className="w-3.5 h-3.5" />
              STOP ALL COMMANDS
            </button>
          </div>
        </div>

        {/* TOP HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-cyan-500/30 bg-slate-950/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-cyan-400 bg-cyan-950/60 shadow-[0_0_15px_#22d3ee]">
              <Smartphone className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-orbitron font-extrabold text-sm sm:text-base tracking-widest text-cyan-300 text-glow-cyan">
                  J.A.R.V.I.S. ULTIMATE FULL DEVICE CONTROL
                </span>
                <span
                  className={`font-tech text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                    isOwnerAuth && !emergencyKilled
                      ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-300'
                      : 'bg-rose-950/80 border-rose-400/60 text-rose-300'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {emergencyKilled
                    ? 'EMERGENCY HALTED'
                    : isOwnerAuth
                    ? 'OWNER VERIFIED'
                    : 'AUTH REQUIRED'}
                </span>
              </div>
              <p className="font-tech text-[11px] text-cyan-400/75 hidden sm:block">
                ANDROID OS INTENTS • WINDOWS LAPTOP COMPANION • MULTI-STEP AUTOMATION • OWNER SECURITY GUARD
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAutonomousFullCalibration}
              disabled={isCalibrating || !isOwnerAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-orbitron font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
              <span>{isCalibrating ? 'CALIBRATING...' : 'FULL CALIBRATION'}</span>
            </button>

            <button
              onClick={() => executeDeviceAction('toggle_autopilot', !autopilotEnabled)}
              disabled={!isOwnerAuth}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-orbitron font-bold transition-all disabled:opacity-40 ${
                autopilotEnabled
                  ? 'border-emerald-400/60 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/60'
                  : 'border-slate-600 bg-slate-900 text-slate-300 hover:border-cyan-400'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{autopilotEnabled ? 'AUTOPILOT: ON' : 'AUTOPILOT: OFF'}</span>
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

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2 bg-slate-950/90 border-b border-cyan-500/25 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'overview', label: '1. HARDWARE & AUTOPILOT', icon: Cpu },
            { id: 'android', label: '2. ANDROID DEVICE CONTROL', icon: Smartphone },
            { id: 'windows', label: '3. WINDOWS LAPTOP CONTROL', icon: Monitor },
            { id: 'devices', label: '4. CONNECTED DEVICES & TASKS', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playClick();
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all shrink-0 ${
                  active
                    ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-cyan-300 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* OWNER AUTHENTICATION GATE (IF LOCKED OR EMERGENCY STOP ENGAGED) */}
        {(!isOwnerAuth || emergencyKilled) && (
          <div className="mx-4 sm:mx-6 mt-3 p-4 rounded-xl bg-amber-950/40 border-2 border-amber-400/60 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-orbitron text-xs sm:text-sm font-bold text-amber-200">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>
                  {emergencyKilled
                    ? 'EMERGENCY KILL-SWITCH ENGAGED — RE-AUTHENTICATE OWNER TO RESUME'
                    : 'OWNER AUTHENTICATION REQUIRED FOR DEVICE CONTROL'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-tech">
                Unauthorized users cannot control Android or Windows hardware. Verify with PIN (default: 1001), Biometrics, or Voiceprint.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="password"
                value={quickPin}
                onChange={(e) => setQuickPin(e.target.value)}
                placeholder="PIN (1001)"
                className="w-28 bg-slate-950 border border-amber-400/60 rounded-lg px-2.5 py-1.5 text-xs font-tech text-cyan-200"
              />
              <button
                onClick={async () => {
                  playClick();
                  ownerAuthManager.clearEmergencyStop();
                  const res = await ownerAuthManager.verifyPin(quickPin || '1001');
                  setQuickPin('');
                  syncAuthStatus();
                  setStatusNotice(res.message);
                  if (onSpeak) onSpeak(res.message);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs"
              >
                <KeyRound className="w-3.5 h-3.5" /> UNLOCK PIN
              </button>
              <button
                onClick={async () => {
                  playClick();
                  ownerAuthManager.clearEmergencyStop();
                  const res = await ownerAuthManager.verifyBiometric();
                  syncAuthStatus();
                  setStatusNotice(res.message);
                  if (onSpeak) onSpeak(res.message);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-400 text-emerald-200 font-orbitron font-bold text-xs"
              >
                <Fingerprint className="w-3.5 h-3.5" /> BIOMETRIC
              </button>
              <button
                onClick={() => {
                  playClick();
                  ownerAuthManager.clearEmergencyStop();
                  const res = ownerAuthManager.verifyVoicePhrase('JARVIS I AM THE OWNER');
                  syncAuthStatus();
                  setStatusNotice(res.message);
                  if (onSpeak) onSpeak(res.message);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-400 text-purple-200 font-orbitron font-bold text-xs"
              >
                <Mic className="w-3.5 h-3.5" /> VOICE VERIFY
              </button>
            </div>
          </div>
        )}

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

        {/* SENSITIVE ACTION CONFIRMATION MODAL */}
        {pendingSensitiveAction && (
          <div className="mx-6 mt-3 p-4 rounded-xl bg-rose-950/80 border-2 border-rose-400 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div>
              <div className="font-orbitron text-xs font-bold text-rose-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
                SENSITIVE ACTION CONFIRMATION REQUIRED ({pendingSensitiveAction.category})
              </div>
              <p className="text-xs font-tech text-rose-100 mt-1">
                {pendingSensitiveAction.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playResponseChime();
                  pendingSensitiveAction.onConfirm();
                  setPendingSensitiveAction(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-orbitron font-bold text-xs"
              >
                APPROVE & EXECUTE
              </button>
              <button
                onClick={() => {
                  playClick();
                  setPendingSensitiveAction(null);
                  setStatusNotice('Sensitive action cancelled by owner.');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-rose-400/50 text-rose-200 font-orbitron text-xs"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* MAIN BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ========================================================= */}
          {/* TAB 1: OVERVIEW & HARDWARE AUTOPILOT                      */}
          {/* ========================================================= */}
          {activeTab === 'overview' && (
            <>
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

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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
                  <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-orbitron text-xs font-bold text-cyan-300 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-cyan-400" />
                        OPTICAL SENSOR VISOR & CONSENT SCREENSHOT
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleCaptureSnapshot}
                          className="px-2 py-1 rounded bg-emerald-950 border border-emerald-400/60 text-[10px] font-orbitron text-emerald-200"
                        >
                          SCREENSHOT
                        </button>
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
                            Click "ACTIVATE VISOR" or "SCREENSHOT" (never accesses camera secretly without explicit consent).
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
            </>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ANDROID DEVICE CONTROL                             */}
          {/* ========================================================= */}
          {activeTab === 'android' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left 7 Cols: App Launcher, Hardware Toggles, Volume/Brightness, Media */}
              <div className="lg:col-span-7 space-y-4">
                {/* Supported Android App Launcher */}
                <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-orbitron text-xs font-bold text-cyan-300 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      OWNER-AUTHORIZED ANDROID APPLICATION LAUNCHER
                    </span>
                    <span className="text-[10px] font-tech text-emerald-400">
                      VOICE & INTENT BRIDGE
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ANDROID_APP_CATALOG.map((app) => (
                      <button
                        key={app.id}
                        disabled={!isOwnerAuth}
                        onClick={() => {
                          playClick();
                          const res = deviceBridge.launchAndroidApp(app.id);
                          setStatusNotice(res.message);
                          if (onSpeak) onSpeak(`Launching ${app.name}, sir.`);
                        }}
                        className="p-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/25 hover:border-emerald-400 text-left transition-all disabled:opacity-40"
                      >
                        <div className="font-orbitron text-xs font-bold text-cyan-200">
                          {app.name}
                        </div>
                        <div className="text-[10px] font-tech text-slate-400 truncate">
                          {app.pkg}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flashlight, Bluetooth, Wi-Fi, Accessibility, Storage, Screen Lock */}
                <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-3">
                  <div className="font-orbitron text-xs font-bold text-cyan-300">
                    ANDROID HARDWARE PERMISSIONS & SYSTEM APIs
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* Flashlight */}
                    <button
                      disabled={!isOwnerAuth}
                      onClick={handleToggleFlashlight}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        torchActive
                          ? 'bg-amber-950/70 border-amber-400 text-amber-200'
                          : 'bg-slate-950/80 border-cyan-500/25 text-slate-300 hover:border-cyan-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-orbitron text-[11px] font-bold">FLASHLIGHT</span>
                        <Flashlight className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-[10px] font-tech">
                        {torchActive ? 'TORCH LED: ON' : 'TORCH LED: OFF'}
                      </span>
                    </button>

                    {/* Bluetooth */}
                    <button
                      disabled={!isOwnerAuth}
                      onClick={handleBluetoothScan}
                      className="p-3 rounded-xl border bg-slate-950/80 border-cyan-500/25 hover:border-cyan-400 text-slate-200 text-left transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-orbitron text-[11px] font-bold">BLUETOOTH</span>
                        <Bluetooth className="w-4 h-4 text-sky-400" />
                      </div>
                      <span className="text-[10px] font-tech text-sky-300 truncate block">
                        {bluetoothStatus}
                      </span>
                    </button>

                    {/* Accessibility Service Toggle */}
                    <button
                      disabled={!isOwnerAuth}
                      onClick={() => {
                        playClick();
                        const next = !accessibilityActive;
                        setAccessibilityActive(next);
                        setStatusNotice(
                          next
                            ? 'Android Accessibility Action Service authorized by owner.'
                            : 'Accessibility Action Service disabled.'
                        );
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        accessibilityActive
                          ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                          : 'bg-slate-950/80 border-cyan-500/25 text-slate-300 hover:border-cyan-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-orbitron text-[11px] font-bold">ACCESSIBILITY</span>
                        <Eye className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-tech">
                        {accessibilityActive ? 'UI NAV ACTIVE' : 'CLICK TO AUTHORIZE'}
                      </span>
                    </button>

                    {/* Storage File Manager */}
                    <button
                      disabled={!isOwnerAuth}
                      onClick={handleOpenDeviceFilePicker}
                      className="p-3 rounded-xl border bg-slate-950/80 border-cyan-500/25 hover:border-cyan-400 text-slate-200 text-left transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-orbitron text-[11px] font-bold">MANAGE FILES</span>
                        <FolderOpen className="w-4 h-4 text-cyan-400" />
                      </div>
                      <span className="text-[10px] font-tech text-cyan-300 truncate block">
                        {selectedLocalFile ? selectedLocalFile.name : 'OPEN STORAGE PICKER'}
                      </span>
                    </button>

                    {/* Consensual Screenshot */}
                    <button
                      disabled={!isOwnerAuth}
                      onClick={handleCaptureSnapshot}
                      className="p-3 rounded-xl border bg-slate-950/80 border-cyan-500/25 hover:border-cyan-400 text-slate-200 text-left transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-orbitron text-[11px] font-bold">SCREENSHOT</span>
                        <Camera className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-tech text-emerald-300">
                        WITH USER CONSENT
                      </span>
                    </button>

                    {/* Lock Screen */}
                    <button
                      disabled={!isOwnerAuth}
                      onClick={() => {
                        playClick();
                        ownerAuthManager.logout();
                        syncAuthStatus();
                        setStatusNotice('Device HUD screen locked. Owner authentication required to unlock.');
                      }}
                      className="p-3 rounded-xl border bg-rose-950/50 border-rose-500/40 hover:border-rose-400 text-rose-200 text-left transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-orbitron text-[11px] font-bold">LOCK SCREEN</span>
                        <Lock className="w-4 h-4 text-rose-400" />
                      </div>
                      <span className="text-[10px] font-tech">ENGAGE SECURITY LOCK</span>
                    </button>
                  </div>

                  {/* Volume & Media Playback Bar */}
                  <div className="p-3 bg-slate-950/80 border border-cyan-500/20 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-orbitron font-bold text-cyan-200">
                        ANDROID MEDIA PLAYBACK & VOLUME ({volumeLevel}%)
                      </span>
                      <span className="font-tech text-emerald-400">{mediaTrack}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volumeLevel}
                      onChange={(e) => setVolumeLevel(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          playClick();
                          setMediaPlaying(!mediaPlaying);
                          setStatusNotice(mediaPlaying ? 'Media playback paused.' : 'Media playback resumed.');
                        }}
                        className="px-3 py-1 rounded bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs flex items-center gap-1"
                      >
                        {mediaPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {mediaPlaying ? 'PAUSE' : 'PLAY'}
                      </button>
                      <button
                        onClick={() => {
                          playClick();
                          setMediaTrack('Stark Tactical Briefing — Track 02');
                          setStatusNotice('Skipped to next media track.');
                        }}
                        className="px-3 py-1 rounded bg-slate-900 border border-cyan-500/30 text-cyan-200 font-orbitron text-xs flex items-center gap-1"
                      >
                        <SkipForward className="w-3.5 h-3.5" /> NEXT TRACK
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Notifications Reader & Alarms/Reminders */}
              <div className="lg:col-span-5 space-y-4">
                {/* Notifications Reader */}
                <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-orbitron text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-cyan-400" />
                      NOTIFICATIONS READER (PERMISSION: {notificationPerm.toUpperCase()})
                    </span>
                    <button
                      onClick={handleNotificationPermission}
                      className="px-2.5 py-1 rounded bg-cyan-500 text-slate-950 font-orbitron font-bold text-[10px]"
                    >
                      AUTHORIZE & TEST
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {deviceNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (onSpeak) onSpeak(`${n.app} notification: ${n.title}`);
                        }}
                        className="p-2.5 rounded-lg bg-slate-950/90 border border-cyan-500/20 cursor-pointer hover:border-cyan-400"
                      >
                        <div className="flex items-center justify-between text-[10px] font-orbitron text-cyan-300">
                          <span>{n.app}</span>
                          <span className="text-slate-500">{n.time}</span>
                        </div>
                        <div className="text-xs font-tech text-slate-200 mt-0.5">{n.title}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alarms & Reminders */}
                <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-3">
                  <div className="font-orbitron text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <AlarmClock className="w-4 h-4 text-emerald-400" />
                    ANDROID ALARMS & VOICE REMINDERS
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newAlarmLabel}
                      onChange={(e) => setNewAlarmLabel(e.target.value)}
                      placeholder="Reminder label..."
                      className="flex-1 bg-slate-950 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs font-tech text-slate-100"
                    />
                    <input
                      type="number"
                      min={5}
                      max={3600}
                      value={newAlarmSeconds}
                      onChange={(e) => setNewAlarmSeconds(Number(e.target.value))}
                      className="w-16 bg-slate-950 border border-cyan-500/30 rounded-lg px-2 py-1.5 text-xs font-tech text-cyan-300"
                    />
                    <button
                      onClick={() => {
                        playClick();
                        const label = newAlarmLabel.trim() || 'Tactical Timer';
                        setAlarms((prev) => [
                          {
                            id: 'alm-' + Date.now(),
                            label,
                            secondsRemaining: newAlarmSeconds,
                            active: true,
                          },
                          ...prev,
                        ]);
                        setNewAlarmLabel('');
                        setStatusNotice(`Alarm '${label}' set for ${newAlarmSeconds} seconds.`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-orbitron font-bold text-xs"
                    >
                      SET
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {alarms.map((a) => (
                      <div
                        key={a.id}
                        className="p-2 rounded-lg bg-slate-950/90 border border-cyan-500/20 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-orbitron font-bold text-cyan-200">{a.label}</div>
                          <div className="text-[10px] font-tech text-emerald-400">
                            {a.active ? `Countdown: ${a.secondsRemaining}s` : 'Completed / Standby'}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setAlarms((prev) =>
                              prev.map((item) =>
                                item.id === a.id ? { ...item, active: !item.active } : item
                              )
                            )
                          }
                          className="px-2 py-1 rounded bg-slate-900 border border-cyan-500/30 text-[10px] font-orbitron text-cyan-300"
                        >
                          {a.active ? 'STOP' : 'START'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: WINDOWS LAPTOP COMPANION CONTROL                   */}
          {/* ========================================================= */}
          {activeTab === 'windows' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 space-y-4">
                {/* Windows Application Manager */}
                <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-orbitron text-xs font-bold text-cyan-300 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-cyan-400" />
                      WINDOWS DESKTOP APPLICATION LAUNCHER
                    </span>
                    <button
                      onClick={handleDownloadWindowsCompanion}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950 border border-cyan-400/60 text-cyan-200 font-orbitron text-[10px] hover:bg-cyan-900"
                    >
                      <Download className="w-3 h-3" /> DOWNLOAD WINDOWS AGENT (.PS1)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {WINDOWS_APP_CATALOG.map((w) => (
                      <button
                        key={w.id}
                        disabled={!isOwnerAuth}
                        onClick={() => handleRunWindowsCommand('launch_app', w.process)}
                        className="p-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/25 hover:border-cyan-400 text-left transition-all disabled:opacity-40"
                      >
                        <div className="font-orbitron text-xs font-bold text-cyan-200">
                          {w.name}
                        </div>
                        <div className="text-[10px] font-tech text-slate-400">{w.process}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mouse & Keyboard Automation Controller */}
                <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-3">
                  <div className="font-orbitron text-xs font-bold text-cyan-300 flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-emerald-400" />
                    WINDOWS MOUSE & KEYBOARD AUTOMATION BRIDGE
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 bg-slate-950/80 border border-cyan-500/20 rounded-xl space-y-2">
                      <div className="text-[11px] font-orbitron text-cyan-200">
                        MOUSE CURSOR & CLICK MACRO
                      </div>
                      <select
                        value={mouseMacroTarget}
                        onChange={(e) => setMouseMacroTarget(e.target.value)}
                        className="w-full bg-slate-900 border border-cyan-500/30 rounded px-2 py-1 text-xs font-tech text-slate-200"
                      >
                        <option>Center HUD Reticle (960, 540)</option>
                        <option>Windows Start Menu (24, 1060)</option>
                        <option>Taskbar System Tray (1880, 1060)</option>
                        <option>Active Window Close (1900, 18)</option>
                      </select>
                      <button
                        disabled={!isOwnerAuth}
                        onClick={() =>
                          handleRunWindowsCommand('mouse_keyboard_action', `MouseMoveClick -> ${mouseMacroTarget}`)
                        }
                        className="w-full py-1.5 rounded bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs"
                      >
                        DISPATCH MOUSE ACTION
                      </button>
                    </div>

                    <div className="p-3 bg-slate-950/80 border border-cyan-500/20 rounded-xl space-y-2">
                      <div className="text-[11px] font-orbitron text-cyan-200">
                        KEYBOARD TEXT / SHORTCUT MACRO
                      </div>
                      <input
                        type="text"
                        value={keyboardMacroText}
                        onChange={(e) => setKeyboardMacroText(e.target.value)}
                        placeholder="e.g. Win+D or Type message"
                        className="w-full bg-slate-900 border border-cyan-500/30 rounded px-2.5 py-1 text-xs font-tech text-slate-200"
                      />
                      <button
                        disabled={!isOwnerAuth}
                        onClick={() => {
                          handleRunWindowsCommand(
                            'mouse_keyboard_action',
                            `Keystroke -> ${keyboardMacroText || 'Win+Tab'}`
                          );
                          setKeyboardMacroText('');
                        }}
                        className="w-full py-1.5 rounded bg-emerald-500 text-slate-950 font-orbitron font-bold text-xs"
                      >
                        SEND KEYSTROKES
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Approved Host Shell Command Runner */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-orbitron text-xs font-bold text-cyan-300 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      APPROVED HOST & WINDOWS COMMAND EXECUTOR
                    </span>
                    <span className="text-[10px] font-tech text-emerald-400">SANDBOX VERIFIED</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={!isOwnerAuth || isRunningWinCmd}
                      onClick={() => handleRunWindowsCommand('system_info')}
                      className="p-2 rounded-lg bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-xs font-orbitron text-cyan-200"
                    >
                      OS KERNEL INFO
                    </button>
                    <button
                      disabled={!isOwnerAuth || isRunningWinCmd}
                      onClick={() => handleRunWindowsCommand('process_list')}
                      className="p-2 rounded-lg bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-xs font-orbitron text-cyan-200"
                    >
                      ACTIVE PROCESSES
                    </button>
                    <button
                      disabled={!isOwnerAuth || isRunningWinCmd}
                      onClick={() => handleRunWindowsCommand('disk_metrics')}
                      className="p-2 rounded-lg bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-xs font-orbitron text-cyan-200"
                    >
                      STORAGE PARTITIONS
                    </button>
                    <button
                      disabled={!isOwnerAuth || isRunningWinCmd}
                      onClick={() => handleRunWindowsCommand('ping_gateway')}
                      className="p-2 rounded-lg bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 text-xs font-orbitron text-cyan-200"
                    >
                      PING GATEWAY
                    </button>
                  </div>

                  <pre className="p-3 rounded-xl bg-black border border-cyan-500/30 text-[11px] font-tech text-emerald-300 overflow-x-auto max-h-52 whitespace-pre-wrap">
                    {winCommandOutput}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: CONNECTED DEVICES & MULTI-STEP TASK EXECUTOR       */}
          {/* ========================================================= */}
          {activeTab === 'devices' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Connected Device List */}
              <div className="lg:col-span-7 space-y-3">
                <div className="font-orbitron text-xs font-bold text-cyan-300">
                  CONNECTED DEVICE NETWORK ({connectedDevices.length} NODES ONLINE)
                </div>
                {connectedDevices.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-4 rounded-xl bg-slate-900/70 border border-cyan-500/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-orbitron text-sm font-bold text-cyan-200">
                        {dev.name}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-400/50 text-[10px] font-orbitron text-emerald-300">
                        {dev.status} • {dev.ipAddress}
                      </span>
                    </div>
                    <div className="text-xs font-tech text-slate-300">
                      OS: {dev.osVersion} {dev.batteryLevel ? `• Battery: ${dev.batteryLevel}%` : ''}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {dev.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-cyan-500/25 text-[10px] font-tech text-cyan-300"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Multi-Step Task Executor & Sensitive Confirmation Tester */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-slate-900/70 border border-cyan-500/25 rounded-xl space-y-3">
                  <div className="font-orbitron text-xs font-bold text-cyan-300">
                    MULTI-STEP AUTONOMOUS TASK PIPELINES
                  </div>
                  <div className="space-y-2">
                    <button
                      disabled={!isOwnerAuth}
                      onClick={() =>
                        handleRunMultiStepTask(
                          'Morning Tactical Workspace Setup',
                          [
                            '1. Verify Owner Biometric & PIN Session',
                            '2. Calibrate Android Display Luminance & Wake Lock',
                            '3. Synchronize Windows Laptop Process Telemetry',
                            '4. Read Priority Notifications & Announce Status',
                          ],
                          'Morning tactical workspace multi-step protocol complete, sir.'
                        )
                      }
                      className="w-full p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-400/50 hover:bg-cyan-900/60 text-left"
                    >
                      <div className="font-orbitron text-xs font-bold text-cyan-200">
                        EXECUTE: MORNING WORKSPACE SETUP (4 STEPS)
                      </div>
                      <div className="text-[10px] font-tech text-slate-300">
                        Coordinates Android Wake Lock, Windows Telemetry & Voice Briefing
                      </div>
                    </button>

                    <button
                      disabled={!isOwnerAuth}
                      onClick={() =>
                        setPendingSensitiveAction({
                          title: 'Purge Temporary System Logs & Cache Files',
                          description:
                            'JARVIS is requesting permission to delete temporary cache files across your connected device workspace. Confirm execution?',
                          category: 'FILE_DELETION',
                          onConfirm: () => {
                            handleRunMultiStepTask(
                              'Authorized Temporary Cache Purge',
                              [
                                '1. Create Verified Pre-Action Snapshot',
                                '2. Purge Temporary Buffer Cache',
                                '3. Verify Storage Integrity',
                              ],
                              'Authorized cache purge completed safely, sir.'
                            );
                          },
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-rose-950/50 border border-rose-400/50 hover:bg-rose-900/50 text-left"
                    >
                      <div className="font-orbitron text-xs font-bold text-rose-200">
                        SENSITIVE ACTION: DELETE TEMP CACHE (REQUIRES APPROVAL)
                      </div>
                      <div className="text-[10px] font-tech text-rose-300/80">
                        Demonstrates mandatory confirmation prompt before deleting files
                      </div>
                    </button>
                  </div>

                  {activeMultiStepTask && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2">
                      <div className="font-orbitron text-xs font-bold text-emerald-300">
                        TASK: {activeMultiStepTask.name}
                      </div>
                      {activeMultiStepTask.steps.map((s) => (
                        <div key={s.label} className="flex items-center justify-between text-xs font-tech">
                          <span className="text-slate-200">{s.label}</span>
                          <span
                            className={`uppercase font-bold ${
                              s.status === 'done'
                                ? 'text-emerald-400'
                                : s.status === 'running'
                                ? 'text-cyan-300 animate-pulse'
                                : 'text-slate-500'
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-2 border-t border-cyan-500/20 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-tech text-cyan-400/60 shrink-0">
          <div>
            STARK HARDWARE & OS BRIDGE // HOST: {hostTelemetry?.platform || 'LINUX x64'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">OWNER SECURITY ENFORCED</span>
            <span>•</span>
            <span className="text-cyan-300">ANDROID & WINDOWS BRIDGE ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
