import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2,
  Shield,
  Heart,
  Utensils,
  Eye,
  Server,
  Terminal,
  Play,
  Pause,
  Sparkles,
  AlertTriangle,
  Zap,
  Crosshair,
  Compass,
  Box,
  Send,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Pickaxe,
  Sword,
  Flame,
} from 'lucide-react';
import {
  minecraftEngine,
  MinecraftBotSession,
  MinecraftServerStatus,
} from '../utils/minecraftBotEngine';
import {
  fetchSystemHardwareSpecs,
  analyzeGameScreenVision,
  SystemHardwareSpecs,
  ScreenVisionAnalysisResult,
} from '../utils/systemControlBridge';
import { playClick, playSuccess, playError } from '../utils/soundEffects';

interface MinecraftControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeak?: (text: string) => void;
}

type TileType =
  | 'sky'
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'coal_ore'
  | 'iron_ore'
  | 'diamond_ore'
  | 'wood'
  | 'leaves'
  | 'planks'
  | 'torch'
  | 'creeper';

const TILE_META: Record<
  TileType,
  { label: string; bg: string; icon: string; solid: boolean;collectible?: string }
> = {
  sky: { label: 'Air / Sky', bg: 'bg-sky-950/40', icon: '', solid: false },
  grass: { label: 'Grass Block', bg: 'bg-emerald-700 border-t-4 border-emerald-400', icon: '🌱', solid: true, collectible: 'Dirt' },
  dirt: { label: 'Dirt', bg: 'bg-amber-900/90', icon: '🟫', solid: true, collectible: 'Dirt' },
  stone: { label: 'Stone', bg: 'bg-slate-600', icon: '🪨', solid: true, collectible: 'Cobblestone' },
  coal_ore: { label: 'Coal Ore', bg: 'bg-slate-700 border border-slate-900', icon: '⬛', solid: true, collectible: 'Coal' },
  iron_ore: { label: 'Iron Ore', bg: 'bg-slate-600 border border-amber-300/60', icon: '🪙', solid: true, collectible: 'Iron Ingot' },
  diamond_ore: { label: 'Diamond Ore', bg: 'bg-cyan-900 border border-cyan-300', icon: '💎', solid: true, collectible: 'Diamond' },
  wood: { label: 'Oak Log', bg: 'bg-amber-800', icon: '🪵', solid: true, collectible: 'Oak Planks' },
  leaves: { label: 'Oak Leaves', bg: 'bg-green-800/80', icon: '🍃', solid: false },
  planks: { label: 'Shelter Planks', bg: 'bg-amber-700 border border-amber-500/50', icon: '🧱', solid: true, collectible: 'Oak Planks' },
  torch: { label: 'Torch', bg: 'bg-amber-500/20', icon: '🕯️', solid: false, collectible: 'Torches' },
  creeper: { label: 'Hostile Creeper', bg: 'bg-green-600 animate-pulse', icon: '👾', solid: false },
};

const WORLD_COLS = 14;
const WORLD_ROWS = 8;

function createInitialWorld(): TileType[][] {
  const grid: TileType[][] = [];
  for (let r = 0; r < WORLD_ROWS; r++) {
    const row: TileType[] = [];
    for (let c = 0; c < WORLD_COLS; c++) {
      if (r < 3) {
        row.push('sky');
      } else if (r === 3) {
        if (c === 11) row.push('creeper');
        else row.push('sky');
      } else if (r === 4) {
        row.push('grass');
      } else if (r === 5) {
        row.push(c % 4 === 0 ? 'coal_ore' : 'dirt');
      } else if (r === 6) {
        if (c === 3 || c === 8 || c === 12) row.push('iron_ore');
        else row.push('stone');
      } else {
        if (c === 5 || c === 10) row.push('diamond_ore');
        else if (c % 3 === 0) row.push('iron_ore');
        else row.push('stone');
      }
    }
    grid.push(row);
  }
  // Add an oak tree on the left
  grid[3][2] = 'wood';
  grid[2][2] = 'wood';
  grid[1][1] = 'leaves';
  grid[1][2] = 'leaves';
  grid[1][3] = 'leaves';
  // Add a small shelter frame on the right
  grid[3][8] = 'planks';
  grid[2][8] = 'planks';
  grid[3][9] = 'torch';
  return grid;
}

export const MinecraftControlCenter: React.FC<MinecraftControlCenterProps> = ({
  isOpen,
  onClose,
  onSpeak,
}) => {
  const [activeTab, setActiveTab] = useState<'game' | 'bot' | 'servers' | 'vision' | 'rcon'>('game');
  const [session, setSession] = useState<MinecraftBotSession>(minecraftEngine.getSession());
  const [servers, setServers] = useState<MinecraftServerStatus[]>(minecraftEngine.getServers());
  const [selectedServer, setSelectedServer] = useState<MinecraftServerStatus>(servers[0]);
  const [rconInput, setRconInput] = useState('');
  const [rconLogs, setRconLogs] = useState<string[]>([
    '[RCON] Connection established to 127.0.0.1:25575 (Stark Local Realm).',
  ]);
  const [hardwareSpecs, setHardwareSpecs] = useState<SystemHardwareSpecs | null>(null);
  const [visionAnalysis, setVisionAnalysis] = useState<ScreenVisionAnalysisResult | null>(null);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const [customCommand, setCustomCommand] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Interactive 2D Minecraft World State
  const [worldGrid, setWorldGrid] = useState<TileType[][]>(() => createInitialWorld());
  const [botCoord, setBotCoord] = useState<{ r: number; c: number }>({ r: 3, c: 4 });
  const [autonomousPlay, setAutonomousPlay] = useState<boolean>(true);
  const [selectedTool, setSelectedTool] = useState<'pickaxe' | 'sword' | 'planks' | 'torch'>('pickaxe');
  const [minedCount, setMinedCount] = useState<{ iron: number; diamond: number; coal: number; mobsDefeated: number }>({
    iron: 24,
    diamond: 3,
    coal: 42,
    mobsDefeated: 2,
  });
  const [liveGameFeed, setLiveGameFeed] = useState<string>(
    'JARVIS Autonomous Bot is active in the world. Click any adjacent block to mine/build, or use WASD / Arrow buttons!'
  );

  useEffect(() => {
    if (isOpen) {
      setSession(minecraftEngine.getSession());
      setServers(minecraftEngine.getServers());
      fetchSystemHardwareSpecs().then(setHardwareSpecs).catch(console.warn);
    }
  }, [isOpen]);

  // Move Bot helper
  const moveBot = useCallback(
    (dr: number, dc: number) => {
      setBotCoord((prev) => {
        const nr = Math.max(0, Math.min(WORLD_ROWS - 1, prev.r + dr));
        const nc = Math.max(0, Math.min(WORLD_COLS - 1, prev.c + dc));
        const targetTile = worldGrid[nr]?.[nc];

        // If target tile is a creeper, attack it automatically!
        if (targetTile === 'creeper') {
          setWorldGrid((w) => {
            const copy = w.map((row) => [...row]);
            copy[nr][nc] = 'sky';
            return copy;
          });
          setMinedCount((m) => ({ ...m, mobsDefeated: m.mobsDefeated + 1 }));
          setLiveGameFeed('⚔️ JARVIS neutralized a Hostile Creeper with Diamond Sword!');
          return { r: nr, c: nc };
        }

        // If solid block is in the way, mine it automatically when moving into it!
        if (targetTile && TILE_META[targetTile].solid) {
          setWorldGrid((w) => {
            const copy = w.map((row) => [...row]);
            copy[nr][nc] = 'sky';
            return copy;
          });
          if (targetTile === 'iron_ore') {
            setMinedCount((m) => ({ ...m, iron: m.iron + 1 }));
            setLiveGameFeed(`⛏️ Mined Iron Ore at (${nc}, ${nr})!`);
          } else if (targetTile === 'diamond_ore') {
            setMinedCount((m) => ({ ...m, diamond: m.diamond + 1 }));
            setLiveGameFeed(`💎 Mined RARE DIAMOND ORE at (${nc}, ${nr})!`);
          } else if (targetTile === 'coal_ore') {
            setMinedCount((m) => ({ ...m, coal: m.coal + 1 }));
            setLiveGameFeed(`⛏️ Mined Coal Ore at (${nc}, ${nr})!`);
          } else {
            setLiveGameFeed(`⛏️ Excavated ${TILE_META[targetTile].label} at (${nc}, ${nr}).`);
          }
          return { r: nr, c: nc };
        }

        return { r: nr, c: nc };
      });
    },
    [worldGrid]
  );

  // Autonomous AI Gameplay Loop
  useEffect(() => {
    if (!isOpen || !autonomousPlay || session.status === 'emergency_stop') return;

    const timer = setInterval(() => {
      // Find nearest creeper, diamond_ore, or iron_ore
      let targetR = -1;
      let targetC = -1;
      for (let r = 0; r < WORLD_ROWS; r++) {
        for (let c = 0; c < WORLD_COLS; c++) {
          const t = worldGrid[r][c];
          if (t === 'creeper' || t === 'diamond_ore' || t === 'iron_ore') {
            targetR = r;
            targetC = c;
            break;
          }
        }
        if (targetR !== -1) break;
      }

      if (targetR !== -1 && targetC !== -1) {
        const dr = targetR > botCoord.r ? 1 : targetR < botCoord.r ? -1 : 0;
        const dc = targetC > botCoord.c ? 1 : targetC < botCoord.c ? -1 : 0;
        if (dc !== 0) moveBot(0, dc);
        else if (dr !== 0) moveBot(dr, 0);
      } else {
        // Patrol randomly
        const dirs = [
          [0, 1],
          [0, -1],
          [-1, 0],
          [1, 0],
        ];
        const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
        moveBot(dr, dc);
      }
    }, 1400);

    return () => clearInterval(timer);
  }, [isOpen, autonomousPlay, botCoord, worldGrid, moveBot, session.status]);

  // Keyboard WASD controls when game tab is open
  useEffect(() => {
    if (!isOpen || activeTab !== 'game') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'w' || e.key === 'ArrowUp') {
        e.preventDefault();
        moveBot(-1, 0);
      } else if (e.key === 's' || e.key === 'ArrowDown') {
        e.preventDefault();
        moveBot(1, 0);
      } else if (e.key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        moveBot(0, -1);
      } else if (e.key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        moveBot(0, 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, moveBot]);

  if (!isOpen) return null;

  // Click any tile on the canvas to mine or build
  const handleTileClick = (r: number, c: number) => {
    playClick();
    const current = worldGrid[r][c];
    if (selectedTool === 'pickaxe') {
      if (current !== 'sky') {
        const copy = worldGrid.map((row) => [...row]);
        copy[r][c] = 'sky';
        setWorldGrid(copy);
        if (current === 'iron_ore') setMinedCount((m) => ({ ...m, iron: m.iron + 1 }));
        if (current === 'diamond_ore') setMinedCount((m) => ({ ...m, diamond: m.diamond + 1 }));
        if (current === 'coal_ore') setMinedCount((m) => ({ ...m, coal: m.coal + 1 }));
        setLiveGameFeed(`⛏️ Mined ${TILE_META[current].label} at (${c}, ${r}).`);
      }
    } else if (selectedTool === 'sword') {
      if (current === 'creeper') {
        const copy = worldGrid.map((row) => [...row]);
        copy[r][c] = 'sky';
        setWorldGrid(copy);
        setMinedCount((m) => ({ ...m, mobsDefeated: m.mobsDefeated + 1 }));
        setLiveGameFeed(`⚔️ Defeated Hostile Creeper at (${c}, ${r})!`);
      } else {
        setBotCoord({ r, c });
      }
    } else if (selectedTool === 'planks') {
      const copy = worldGrid.map((row) => [...row]);
      copy[r][c] = 'planks';
      setWorldGrid(copy);
      setLiveGameFeed(`🧱 Placed Shelter Oak Planks at (${c}, ${r}).`);
    } else if (selectedTool === 'torch') {
      const copy = worldGrid.map((row) => [...row]);
      copy[r][c] = 'torch';
      setWorldGrid(copy);
      setLiveGameFeed(`🕯️ Placed Torch at (${c}, ${r}) to light up area.`);
    }
  };

  // Spawn Creeper or Regenerate Ores for testing
  const handleSpawnCreeper = () => {
    playClick();
    const copy = worldGrid.map((row) => [...row]);
    copy[3][Math.floor(Math.random() * WORLD_COLS)] = 'creeper';
    setWorldGrid(copy);
    setLiveGameFeed('👾 Hostile Creeper spawned on the surface! JARVIS combat defense alerted.');
  };

  const handleResetWorld = () => {
    playClick();
    setWorldGrid(createInitialWorld());
    setBotCoord({ r: 3, c: 4 });
    setLiveGameFeed('🌍 Minecraft Sandbox World regenerated with fresh Iron & Diamond veins.');
  };

  // Handle Bot Directives
  const handleExecuteBotDirective = (cmd: string) => {
    playClick();
    const res = minecraftEngine.executeCommand(cmd);
    setSession({ ...minecraftEngine.getSession() });
    setStatusNotice(res.message);
    setLiveGameFeed(`🤖 DIRECTIVE: ${res.message}`);
    if (cmd.includes('stop')) {
      setAutonomousPlay(false);
    } else {
      setAutonomousPlay(true);
    }
    if (onSpeak && res.speechResponse) {
      onSpeak(res.speechResponse);
    }
  };

  // Handle RCON execution
  const handleSendRcon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rconInput.trim() || !selectedServer) return;
    playClick();
    const cmd = rconInput.trim();
    try {
      const res = await minecraftEngine.executeRcon(selectedServer.id, cmd);
      setRconLogs((prev) => [...prev, `> ${cmd}`, res.output]);
      setRconInput('');
      playSuccess();
    } catch (err: any) {
      playError();
      setRconLogs((prev) => [...prev, `> ${cmd}`, `[ERROR] ${err.message}`]);
    }
  };

  // Analyze Game Screen Vision
  const handleAnalyzeVision = async () => {
    playClick();
    setIsAnalyzingVision(true);
    setStatusNotice('Scanning Minecraft screen viewport with Gemini multimodal vision...');
    try {
      const res = await analyzeGameScreenVision();
      setVisionAnalysis(res);
      playSuccess();
      setStatusNotice('Vision scan completed.');
      if (onSpeak) {
        onSpeak(`Sir, visual scan indicates: ${res.summary}`);
      }
    } catch (err: any) {
      playError();
      setStatusNotice(`Vision error: ${err.message}`);
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn font-rajdhani">
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[900px] bg-[#030712] border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-cyan-500/30 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl border border-emerald-400 bg-emerald-950/60 shadow-[0_0_15px_#10b981]">
              <Gamepad2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-extrabold text-sm sm:text-base tracking-widest text-emerald-300">
                  MINECRAFT LIVE AI GAME & SERVER COMMAND CENTER
                </span>
                <span className="font-tech text-xs bg-emerald-950 border border-emerald-400/60 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  PLAYABLE + AI BOT
                </span>
              </div>
              <p className="font-tech text-xs text-cyan-400/70">
                INTERACTIVE 2D MINECRAFT SANDBOX • AUTONOMOUS AI BOT • JAVA & BEDROCK SERVERS • RCON
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* EMERGENCY STOP ALL COMMANDS BUTTON */}
            <button
              onClick={() => handleExecuteBotDirective('emergency stop')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500 bg-red-950/80 hover:bg-red-900 text-red-200 font-orbitron font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
              <span>STOP AI BOT</span>
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

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-slate-950/90 border-b border-cyan-500/20 shrink-0 overflow-x-auto">
          <button
            onClick={() => {
              playClick();
              setActiveTab('game');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'game'
                ? 'bg-emerald-950 border border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-slate-400 hover:text-emerald-300 border border-transparent'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>🎮 LIVE MINECRAFT GAME WORLD</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('bot');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-orbitron transition-all cursor-pointer shrink-0 ${
              activeTab === 'bot'
                ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'text-slate-400 hover:text-cyan-300 border border-transparent'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>BOT TELEMETRY & INVENTORY</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('vision');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-orbitron transition-all cursor-pointer shrink-0 ${
              activeTab === 'vision'
                ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'text-slate-400 hover:text-cyan-300 border border-transparent'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>GEMINI SCREEN VISION</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('servers');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-orbitron transition-all cursor-pointer shrink-0 ${
              activeTab === 'servers'
                ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'text-slate-400 hover:text-cyan-300 border border-transparent'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>SERVERS (JAVA / BEDROCK)</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveTab('rcon');
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-orbitron transition-all cursor-pointer shrink-0 ${
              activeTab === 'rcon'
                ? 'bg-cyan-950 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'text-slate-400 hover:text-cyan-300 border border-transparent'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>RCON TERMINAL</span>
          </button>
        </div>

        {/* Status Notice */}
        {statusNotice && (
          <div className="px-6 py-2 bg-cyan-950/40 border-b border-cyan-500/20 text-xs font-mono text-cyan-300 flex items-center justify-between">
            <span className="truncate">{statusNotice}</span>
            <button onClick={() => setStatusNotice(null)} className="text-cyan-400 ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 0: LIVE PLAYABLE MINECRAFT SANDBOX GAME & AI BOT VIEWPORT */}
          {activeTab === 'game' && (
            <div className="space-y-4">
              {/* Top Control Bar: Autonomous AI Toggle + Resource Counters */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      playClick();
                      setAutonomousPlay(!autonomousPlay);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-orbitron font-bold text-xs transition-all cursor-pointer shadow-md ${
                      autonomousPlay
                        ? 'bg-emerald-600 text-white border border-emerald-300'
                        : 'bg-slate-800 text-slate-300 border border-slate-600'
                    }`}
                  >
                    {autonomousPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>
                      {autonomousPlay
                        ? '🤖 JARVIS AI AUTO-PLAY: ON (Click to Play Manually)'
                        : '🎮 MANUAL PLAYER CONTROL (Click to Enable JARVIS AI)'}
                    </span>
                  </button>

                  <button
                    onClick={handleSpawnCreeper}
                    className="px-3 py-2 rounded-xl bg-green-950/80 hover:bg-green-900 border border-green-500/40 text-green-200 font-orbitron text-xs cursor-pointer"
                  >
                    👾 SPAWN CREEPER
                  </button>

                  <button
                    onClick={handleResetWorld}
                    className="px-3 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 font-orbitron text-xs cursor-pointer"
                  >
                    🌍 REGENERATE WORLD
                  </button>
                </div>

                {/* Live Mined Scoreboard */}
                <div className="flex items-center gap-3 font-mono text-xs bg-slate-950 px-3.5 py-2 rounded-xl border border-cyan-500/20 tabular-nums">
                  <span title="Diamonds Mined">💎 {minedCount.diamond}</span>
                  <span>•</span>
                  <span title="Iron Ore Mined">🪙 {minedCount.iron}</span>
                  <span>•</span>
                  <span title="Coal Mined">⬛ {minedCount.coal}</span>
                  <span>•</span>
                  <span title="Mobs Neutralized">⚔️ {minedCount.mobsDefeated}</span>
                </div>
              </div>

              {/* Interactive 2D Minecraft World Grid */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-gradient-to-b from-[#07192f] via-[#0f2942] to-[#040814] p-3 shadow-[0_0_35px_rgba(6,182,212,0.15)]">
                <div className="flex items-center justify-between mb-2 text-xs font-mono text-cyan-300 px-1">
                  <span>
                    LIVE WORLD VIEWPORT // BOT COORDS: X:{botCoord.c + 138} Y:{72 - botCoord.r * 8}{' '}
                    Z:-312
                  </span>
                  <span className="text-emerald-300 truncate max-w-md">{liveGameFeed}</span>
                </div>

                <div
                  className="grid gap-1 w-full select-none"
                  style={{ gridTemplateColumns: `repeat(${WORLD_COLS}, minmax(0, 1fr))` }}
                >
                  {worldGrid.map((row, rIdx) =>
                    row.map((tile, cIdx) => {
                      const isBotHere = botCoord.r === rIdx && botCoord.c === cIdx;
                      const meta = TILE_META[tile];
                      return (
                        <button
                          key={`${rIdx}-${cIdx}`}
                          onClick={() => handleTileClick(rIdx, cIdx)}
                          title={`${meta.label} (${cIdx}, ${rIdx}) — Click to ${
                            selectedTool === 'pickaxe'
                              ? 'Mine'
                              : selectedTool === 'sword'
                              ? 'Attack/Move'
                              : 'Place Block'
                          }`}
                          className={`aspect-square rounded-md flex items-center justify-center text-base sm:text-xl transition-all cursor-pointer relative ${
                            meta.bg
                          } ${
                            isBotHere
                              ? 'ring-2 ring-cyan-300 shadow-[0_0_15px_#22d3ee] z-10 scale-105'
                              : 'hover:brightness-125'
                          }`}
                        >
                          {isBotHere ? (
                            <span className="text-xl sm:text-2xl drop-shadow-[0_0_8px_#22d3ee] animate-bounce">
                              🤖
                            </span>
                          ) : (
                            <span>{meta.icon}</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Bottom Controls: Hotbar Tools + Directional Pad */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-cyan-500/20">
                  {/* Hotbar Tool Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-orbitron text-slate-400 mr-1">HOTBAR:</span>
                    <button
                      onClick={() => {
                        playClick();
                        setSelectedTool('pickaxe');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron border cursor-pointer ${
                        selectedTool === 'pickaxe'
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Pickaxe className="w-3.5 h-3.5" />
                      <span>⛏️ MINE</span>
                    </button>

                    <button
                      onClick={() => {
                        playClick();
                        setSelectedTool('sword');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron border cursor-pointer ${
                        selectedTool === 'sword'
                          ? 'bg-red-950 border-red-400 text-red-200 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Sword className="w-3.5 h-3.5" />
                      <span>⚔️ ATTACK</span>
                    </button>

                    <button
                      onClick={() => {
                        playClick();
                        setSelectedTool('planks');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron border cursor-pointer ${
                        selectedTool === 'planks'
                          ? 'bg-amber-950 border-amber-400 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span>🧱 BUILD PLANKS</span>
                    </button>

                    <button
                      onClick={() => {
                        playClick();
                        setSelectedTool('torch');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron border cursor-pointer ${
                        selectedTool === 'torch'
                          ? 'bg-yellow-950 border-yellow-400 text-yellow-200 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>🕯️ TORCH</span>
                    </button>
                  </div>

                  {/* Manual Movement D-Pad */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-orbitron text-slate-400 mr-2 hidden sm:inline">
                      MOVE (WASD):
                    </span>
                    <button
                      onClick={() => moveBot(0, -1)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-cyan-500/40 text-cyan-200 cursor-pointer"
                      title="Move Left (A)"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveBot(-1, 0)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-cyan-500/40 text-cyan-200 cursor-pointer"
                      title="Jump / Climb Up (W)"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveBot(1, 0)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-cyan-500/40 text-cyan-200 cursor-pointer"
                      title="Dig Down (S)"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveBot(0, 1)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-cyan-500/40 text-cyan-200 cursor-pointer"
                      title="Move Right (D)"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Voice / Text Command Bar right below the game */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customCommand.trim()) {
                      handleExecuteBotDirective(customCommand.trim());
                      setCustomCommand('');
                    }
                  }}
                  placeholder="Give JARVIS a gaming command in Hindi or English (e.g., 'Jarvis diamond mine karo', 'Build shelter', 'Fight creeper')..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  onClick={() => {
                    if (customCommand.trim()) {
                      handleExecuteBotDirective(customCommand.trim());
                      setCustomCommand('');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl border border-emerald-400 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 text-xs font-orbitron font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>COMMAND BOT</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: AUTONOMOUS BOT OPERATOR */}
          {activeTab === 'bot' && (
            <div className="space-y-6">
              {/* Bot Status & Vital Signs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-3">
                  <div className="text-xs font-orbitron font-bold text-cyan-300 flex items-center justify-between">
                    <span>BOT VITALS</span>
                    <span className="font-mono text-emerald-400 text-[11px]">
                      STATUS: {session.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-red-400">
                        <Heart className="w-3.5 h-3.5" /> HEALTH:
                      </span>
                      <span className="font-mono font-bold text-slate-100">
                        {session.vitals.health} / 20
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-red-500 h-full"
                        style={{ width: `${(session.vitals.health / 20) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <Utensils className="w-3.5 h-3.5" /> HUNGER:
                      </span>
                      <span className="font-mono font-bold text-slate-100">
                        {session.vitals.food} / 20
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${(session.vitals.food / 20) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <Shield className="w-3.5 h-3.5" /> ARMOR:
                      </span>
                      <span className="font-mono font-bold text-slate-100">
                        {session.vitals.armor} / 20
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-3">
                  <div className="text-xs font-orbitron font-bold text-cyan-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" /> COORDINATES
                    </span>
                    <span className="font-mono text-cyan-400 text-[11px]">
                      {session.position.dimension.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono text-center">
                    <div className="p-2 rounded bg-slate-950 border border-cyan-500/15">
                      <div className="text-[10px] text-slate-400">X</div>
                      <div className="text-xs font-bold text-cyan-300">{session.position.x}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-cyan-500/15">
                      <div className="text-[10px] text-slate-400">Y (ALT)</div>
                      <div className="text-xs font-bold text-cyan-300">{session.position.y}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-cyan-500/15">
                      <div className="text-[10px] text-slate-400">Z</div>
                      <div className="text-xs font-bold text-cyan-300">{session.position.z}</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 truncate">
                    Biome: <span className="text-slate-200">{session.position.biome}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-2 md:col-span-2">
                  <div className="text-xs font-orbitron font-bold text-cyan-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> ACTIVE OBJECTIVE
                    </span>
                    <span className="font-mono text-amber-300 text-xs">
                      {session.currentObjective?.progress || 0}% COMPLETE
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-100">
                    {session.currentObjective?.title || 'Standing by for owner instructions'}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {session.currentObjective?.description ||
                      'Jarvis is waiting for voice or manual directive.'}
                  </p>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full"
                      style={{ width: `${session.currentObjective?.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bot Inventory & Activity Logs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-cyan-500/25 bg-slate-900/60 space-y-3">
                  <div className="text-xs font-orbitron font-bold text-cyan-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5" /> BOT INVENTORY
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {session.inventory.length} SLOTS OCCUPIED
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {session.inventory.map((item) => (
                      <div
                        key={item.slot}
                        className="p-2 rounded-lg bg-slate-950 border border-cyan-500/20 flex flex-col items-center justify-center relative hover:border-cyan-400 transition-all"
                        title={item.name}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-[10px] text-slate-300 font-bold truncate w-full text-center">
                          {item.name.split(' ')[0]}
                        </span>
                        <span className="absolute bottom-1 right-1 font-mono text-[9px] text-cyan-300 font-bold">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-cyan-500/25 bg-slate-900/60 space-y-3 flex flex-col">
                  <div className="text-xs font-orbitron font-bold text-cyan-300 flex items-center justify-between">
                    <span>ACTIVITY AUDIT TELEMETRY</span>
                    <span className="font-mono text-[10px] text-emerald-400">REAL-TIME</span>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-56 space-y-2 pr-1 font-mono text-xs">
                    {session.activityHistory.map((act) => (
                      <div
                        key={act.id}
                        className="p-2 rounded bg-slate-950/70 border border-slate-800 space-y-0.5"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="text-cyan-400">[{act.type.toUpperCase()}]</span>
                          <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-200 text-[11px]">{act.message}</div>
                        {act.hindiTranslation && (
                          <div className="text-cyan-300/80 text-[10px] italic">
                            {act.hindiTranslation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DESKTOP SCREEN VISION & DESKTOP BRIDGE */}
          {activeTab === 'vision' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-orbitron font-bold text-sm text-cyan-200">
                    GEMINI MULTIMODAL SCREEN VISION SCANNER
                  </div>
                  <div className="text-xs text-slate-400">
                    Real-time situational awareness: Detects health bars, hostile mobs, light levels, and mineral veins.
                  </div>
                </div>

                <button
                  onClick={handleAnalyzeVision}
                  disabled={isAnalyzingVision}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-400 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 font-orbitron font-bold text-xs cursor-pointer shadow-md"
                >
                  <Eye className={`w-4 h-4 ${isAnalyzingVision ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzingVision ? 'SCANNING SCREEN...' : 'SCAN GAMEPLAY SCREEN'}</span>
                </button>
              </div>

              {visionAnalysis && (
                <div className="p-5 rounded-xl border border-emerald-500/30 bg-slate-950/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                    <span className="font-orbitron font-bold text-xs text-emerald-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      SCENE CLASSIFICATION: {visionAnalysis.detectedScene.toUpperCase()}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      CONFIDENCE: {(visionAnalysis.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-200 font-bold">ENGLISH BRIEFING:</div>
                    <div className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800">
                      {visionAnalysis.summary}
                    </div>

                    <div className="text-xs text-cyan-300 font-bold pt-1">HINDI BRIEFING (हिंदी):</div>
                    <div className="text-xs text-cyan-200 bg-slate-900 p-3 rounded-lg border border-slate-800">
                      {visionAnalysis.hindiSummary}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="text-xs font-bold text-slate-300">OBSERVED VITALS & HAZARDS:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {visionAnalysis.vitalObservations.map((obs, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-slate-900 border border-cyan-500/15 text-xs text-slate-300"
                        >
                          • {obs}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
                    <span className="font-bold">SUGGESTED ACTION:</span>
                    <span>{visionAnalysis.suggestedAction}</span>
                  </div>
                </div>
              )}

              {hardwareSpecs && (
                <div className="p-4 rounded-xl border border-cyan-500/20 bg-slate-900/50 space-y-3">
                  <div className="font-orbitron font-bold text-xs text-cyan-300">
                    DESKTOP HARDWARE & MINECRAFT INSTALLATION DETECTION
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/15">
                      <div className="text-slate-400 text-[11px]">PLATFORM / CPU</div>
                      <div className="font-mono text-cyan-200 mt-0.5">
                        {hardwareSpecs.platform} ({hardwareSpecs.cpuCores} Cores)
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/15">
                      <div className="text-slate-400 text-[11px]">RAM USAGE</div>
                      <div className="font-mono text-emerald-300 mt-0.5">
                        {hardwareSpecs.memoryUsagePercent}% Used
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/15">
                      <div className="text-slate-400 text-[11px]">MINECRAFT STATUS</div>
                      <div className="font-mono text-cyan-300 mt-0.5">
                        {hardwareSpecs.isMinecraftInstalled ? 'Installed & Verified' : 'Cloud Sandbox Active'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVER MANAGEMENT */}
          {activeTab === 'servers' && (
            <div className="space-y-6">
              <div className="text-xs font-orbitron font-bold text-cyan-300">
                REGISTERED JAVA & BEDROCK REALMS (GEYSER CROSS-PLAY)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {servers.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => {
                      playClick();
                      setSelectedServer(srv);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                      selectedServer.id === srv.id
                        ? 'border-cyan-400 bg-cyan-950/60 shadow-md'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-100">{srv.name}</span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full">
                        {srv.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-black/60 font-mono text-[11px] text-cyan-300 truncate">
                      {srv.motd}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                      <div>
                        PLAYERS:{' '}
                        <span className="text-slate-200">
                          {srv.onlinePlayers} / {srv.maxPlayers}
                        </span>
                      </div>
                      <div>
                        PING: <span className="text-emerald-400">{srv.pingMs}ms</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                      <span className="font-mono text-cyan-400">{srv.edition.toUpperCase()}</span>
                      {srv.isGeyserCrossplay && (
                        <span className="text-purple-300 text-[10px]">GEYSER ENABLED</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: REMOTE RCON CONSOLE */}
          {activeTab === 'rcon' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-orbitron text-cyan-300">
                  RCON SERVER TERMINAL // TARGET: {selectedServer.name}
                </div>
                <div className="font-mono text-[11px] text-slate-400">
                  PORT: {selectedServer.rconPort || 25575}
                </div>
              </div>

              <div className="h-72 p-4 rounded-xl bg-black border border-cyan-500/30 font-mono text-xs text-emerald-400 overflow-y-auto space-y-1">
                {rconLogs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap">
                    {log}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendRcon} className="flex gap-2">
                <input
                  type="text"
                  value={rconInput}
                  onChange={(e) => setRconInput(e.target.value)}
                  placeholder="Enter Minecraft server command (e.g. /time set day, /weather clear, /say Greetings)..."
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl border border-cyan-400 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 text-xs font-orbitron font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>EXECUTE</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
