export type MinecraftEdition = 'java' | 'bedrock';

export interface InventoryItem {
  slot: number;
  id: string;
  name: string;
  count: number;
  category: 'tool' | 'weapon' | 'armor' | 'block' | 'resource' | 'food';
  icon: string;
}

export interface BotPosition {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  dimension: 'overworld' | 'nether' | 'the_end';
  biome: string;
}

export interface BotVitals {
  health: number; // 0 - 20
  food: number; // 0 - 20
  oxygen: number; // 0 - 20
  armor: number; // 0 - 20
  level: number;
  experience: number;
}

export interface BotObjective {
  id: string;
  title: string;
  description: string;
  progress: number; // 0 - 100
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  startedAt: string;
  targetBlockOrMob?: string;
}

export interface BotActivityLog {
  id: string;
  timestamp: string;
  type: 'movement' | 'mining' | 'crafting' | 'combat' | 'chat' | 'system';
  message: string;
  hindiTranslation?: string;
}

export interface MinecraftServerStatus {
  id: string;
  name: string;
  edition: MinecraftEdition;
  host: string;
  port: number;
  rconPort?: number;
  status: 'online' | 'offline' | 'unreachable';
  motd: string;
  version: string;
  onlinePlayers: number;
  maxPlayers: number;
  pingMs: number;
  isGeyserCrossplay: boolean;
  gameMode?: string;
}

export interface MinecraftBotSession {
  id: string;
  botName: string;
  edition: MinecraftEdition;
  connectionMode: 'native_protocol' | 'desktop_bridge' | 'dual_mode';
  status: 'idle' | 'spawning' | 'active' | 'combat' | 'mining' | 'building' | 'emergency_stop';
  server: {
    host: string;
    port: number;
    name: string;
  };
  position: BotPosition;
  vitals: BotVitals;
  inventory: InventoryItem[];
  currentObjective: BotObjective | null;
  activityHistory: BotActivityLog[];
  lastAction: string;
}

class MinecraftEngine {
  private session: MinecraftBotSession = {
    id: 'stark-mc-bot-01',
    botName: 'JARVIS_Companion',
    edition: 'java',
    connectionMode: 'dual_mode',
    status: 'active',
    server: {
      host: 'localhost',
      port: 25565,
      name: 'Local Stark Forge Realm (Java & Geyser)',
    },
    position: {
      x: 142.45,
      y: 68.0,
      z: -312.8,
      yaw: 84.2,
      pitch: -12.4,
      dimension: 'overworld',
      biome: 'Plains / Oak Forest',
    },
    vitals: {
      health: 20,
      food: 19,
      oxygen: 20,
      armor: 15,
      level: 18,
      experience: 65,
    },
    inventory: [
      { slot: 0, id: 'diamond_sword', name: 'Diamond Sword', count: 1, category: 'weapon', icon: '⚔️' },
      { slot: 1, id: 'diamond_pickaxe', name: 'Diamond Pickaxe', count: 1, category: 'tool', icon: '⛏️' },
      { slot: 2, id: 'diamond_axe', name: 'Diamond Axe', count: 1, category: 'tool', icon: '🪓' },
      { slot: 3, id: 'iron_shovel', name: 'Iron Shovel', count: 1, category: 'tool', icon: '🥄' },
      { slot: 4, id: 'cooked_beef', name: 'Cooked Beef', count: 32, category: 'food', icon: '🥩' },
      { slot: 5, id: 'oak_planks', name: 'Oak Planks', count: 64, category: 'block', icon: '🪵' },
      { slot: 6, id: 'cobblestone', name: 'Cobblestone', count: 64, category: 'block', icon: '🪨' },
      { slot: 7, id: 'torches', name: 'Torches', count: 48, category: 'tool', icon: '🕯️' },
      { slot: 8, id: 'shield', name: 'Iron Shield', count: 1, category: 'armor', icon: '🛡️' },
      { slot: 9, id: 'iron_ingot', name: 'Iron Ingot', count: 24, category: 'resource', icon: '🪙' },
      { slot: 10, id: 'coal', name: 'Coal', count: 42, category: 'resource', icon: '⬛' },
      { slot: 11, id: 'redstone', name: 'Redstone Dust', count: 18, category: 'resource', icon: '🔴' },
    ],
    currentObjective: {
      id: 'obj-mine-iron',
      title: 'Strip Mining at Y=16 for Iron & Diamonds',
      description: 'Navigating underground tunnel, placing torches for light, excavating iron veins and securing perimeter against creepers.',
      progress: 68,
      status: 'in_progress',
      startedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      targetBlockOrMob: 'iron_ore',
    },
    activityHistory: [
      {
        id: 'act-1',
        timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        type: 'system',
        message: 'Connected to server: 127.0.0.1:25565 via Native Protocol Bridge.',
        hindiTranslation: 'नेटिव प्रोटोकॉल ब्रिज के ज़रिए सर्वर से कनेक्ट हुआ।',
      },
      {
        id: 'act-2',
        timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
        type: 'movement',
        message: 'Navigated to subterranean quarry coordinates (X:140, Y:16, Z:-310).',
        hindiTranslation: 'खदान निर्देशांक (X:140, Y:16, Z:-310) पर पहुंचा।',
      },
      {
        id: 'act-3',
        timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
        type: 'mining',
        message: 'Mined 14 Iron Ore blocks and 6 Coal nodes.',
        hindiTranslation: '14 आयरन अयस्क और 6 कोयला ब्लॉक सफलतापूर्वक खोदे।',
      },
      {
        id: 'act-4',
        timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
        type: 'combat',
        message: 'Neutralized 1 Creeper and 1 Skeleton using Diamond Sword & Shield.',
        hindiTranslation: 'शील्ड और डायमंड तलवार से क्रीपर व कंकाल को निष्प्रभावी किया।',
      },
    ],
    lastAction: 'Mining deepslate iron vein at X: 142.4, Y: 16.0, Z: -312.8',
  };

  private knownServers: MinecraftServerStatus[] = [
    {
      id: 'srv-local-java',
      name: 'Stark Local Realm (Java Dedicated)',
      edition: 'java',
      host: '127.0.0.1',
      port: 25565,
      rconPort: 25575,
      status: 'online',
      motd: '§b§lSTARK INDUSTRIES §r§7// Autonomous JARVIS Fortress §e[1.21]',
      version: 'Paper 1.21.1',
      onlinePlayers: 3,
      maxPlayers: 20,
      pingMs: 4,
      isGeyserCrossplay: true,
      gameMode: 'Survival',
    },
    {
      id: 'srv-bedrock-realm',
      name: 'JARVIS Bedrock Pocket Server',
      edition: 'bedrock',
      host: '127.0.0.1',
      port: 19132,
      status: 'online',
      motd: '§aBedrock Dedicated §f// Geyser Cross-Platform Enabled',
      version: 'Bedrock 1.21.30',
      onlinePlayers: 2,
      maxPlayers: 10,
      pingMs: 12,
      isGeyserCrossplay: true,
      gameMode: 'Survival',
    },
    {
      id: 'srv-remote-smp',
      name: 'Stark Remote SMP (Geyser Cross-Play)',
      edition: 'java',
      host: 'mc.stark-industries.net',
      port: 25565,
      rconPort: 25575,
      status: 'online',
      motd: '§6Owner SMP §f- Java & Bedrock Welcome!',
      version: 'Purpur 1.21.1 (Geyser 2.4.2)',
      onlinePlayers: 7,
      maxPlayers: 50,
      pingMs: 28,
      isGeyserCrossplay: true,
      gameMode: 'Survival',
    },
  ];

  // Get current session
  getSession(): MinecraftBotSession {
    return this.session;
  }

  // Set edition
  setEdition(edition: MinecraftEdition) {
    this.session.edition = edition;
    this.addLog('system', `Switched Minecraft operating edition to ${edition.toUpperCase()}.`);
  }

  // Set connection mode
  setConnectionMode(mode: 'native_protocol' | 'desktop_bridge' | 'dual_mode') {
    this.session.connectionMode = mode;
    this.addLog('system', `Bot operating mode reconfigured to: ${mode}.`);
  }

  // Execute bot command
  executeCommand(command: string): { success: boolean; message: string; speechResponse: string } {
    const cmd = command.toLowerCase().trim();

    // Emergency Stop
    if (cmd.includes('stop') || cmd.includes('halt') || cmd.includes('ruko') || cmd.includes('emergency')) {
      this.session.status = 'emergency_stop';
      if (this.session.currentObjective) {
        this.session.currentObjective.status = 'paused';
      }
      this.addLog('system', 'EMERGENCY STOP EXECUTED: All bot movement and mining halted immediately.');
      return {
        success: true,
        message: 'EMERGENCY STOP ACTIVATED: Bot has severed all game controls and stopped in place.',
        speechResponse: 'Emergency stop activated, sir. All bot controls and actions are halted.',
      };
    }

    // Resume / Start
    if (cmd.includes('start') || cmd.includes('resume') || cmd.includes('shuru')) {
      this.session.status = 'active';
      if (this.session.currentObjective) {
        this.session.currentObjective.status = 'in_progress';
      }
      this.addLog('system', 'Bot resumed autonomous operations.');
      return {
        success: true,
        message: 'Bot operations resumed.',
        speechResponse: 'Resuming autonomous operations, sir.',
      };
    }

    // Mining command
    if (cmd.includes('mine') || cmd.includes('iron') || cmd.includes('diamond') || cmd.includes('khodo')) {
      this.session.status = 'mining';
      this.session.currentObjective = {
        id: `obj-${Date.now()}`,
        title: 'Excavate Resources (Iron / Coal / Diamonds)',
        description: 'Using Diamond Pickaxe to mine target mineral veins and construct safety pillars.',
        progress: 15,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        targetBlockOrMob: 'ore',
      };
      this.addLog('mining', 'Objective assigned: Subterranean resource extraction sequence initiated.');
      return {
        success: true,
        message: 'Mining protocol initiated at Y=16.',
        speechResponse: 'Mining sequence initiated, sir. I am gathering ore and securing the shaft.',
      };
    }

    // Building command
    if (cmd.includes('build') || cmd.includes('house') || cmd.includes('shelter') || cmd.includes('banao')) {
      this.session.status = 'building';
      this.session.currentObjective = {
        id: `obj-${Date.now()}`,
        title: 'Construct Fortified Perimeter Shelter',
        description: 'Placing oak planks and cobblestone walls with roof, door, torches, and storage chest.',
        progress: 25,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        targetBlockOrMob: 'oak_planks',
      };
      this.addLog('crafting', 'Initiated construction blueprint: Fortified Perimeter Shelter.');
      return {
        success: true,
        message: 'Building construction blueprint activated.',
        speechResponse: 'Building shelter blueprint initialized, sir. Laying foundation blocks now.',
      };
    }

    // Combat / Defend command
    if (cmd.includes('defend') || cmd.includes('fight') || cmd.includes('mob') || cmd.includes('survive')) {
      this.session.status = 'combat';
      this.addLog('combat', 'Defensive combat stance: Equipping shield in offhand, scanning for hostile mobs.');
      return {
        success: true,
        message: 'Combat defense stance activated. Scanning 32-block radius.',
        speechResponse: 'Perimeter defense active, sir. Shield equipped, scanning for hostiles.',
      };
    }

    // Follow player command
    if (cmd.includes('follow') || cmd.includes('come') || cmd.includes('aao') || cmd.includes('saath')) {
      this.session.status = 'active';
      this.session.currentObjective = {
        id: `obj-${Date.now()}`,
        title: 'Follow Owner Coordinates',
        description: 'Calculating dynamic A* 3D pathfinding to maintain 3-block proximity to owner.',
        progress: 50,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      };
      this.addLog('movement', 'Pathfinding route calculated to player coordinates.');
      return {
        success: true,
        message: 'Pathfinding to player coordinates engaged.',
        speechResponse: 'Following your lead, sir. Staying within three blocks of your position.',
      };
    }

    // Default action
    this.addLog('system', `Command processed: "${command}"`);
    return {
      success: true,
      message: `Directive executed: ${command}`,
      speechResponse: `Understood, sir. Processing directive: ${command}.`,
    };
  }

  // Get servers list
  getServers(): MinecraftServerStatus[] {
    return this.knownServers;
  }

  // Execute RCON Command
  async executeRcon(serverId: string, rconCommand: string): Promise<{ success: boolean; output: string }> {
    const srv = this.knownServers.find((s) => s.id === serverId);
    if (!srv) {
      throw new Error(`Server ${serverId} not found in Stark registry.`);
    }

    // Simulate RCON execution and log output
    const cleanCmd = rconCommand.startsWith('/') ? rconCommand.slice(1) : rconCommand;
    let output = '';

    if (cleanCmd.startsWith('time set')) {
      output = `[Server] Set time to ${cleanCmd.replace('time set', '').trim()}`;
    } else if (cleanCmd.startsWith('weather')) {
      output = `[Server] Set weather to ${cleanCmd.replace('weather', '').trim()}`;
    } else if (cleanCmd.startsWith('list')) {
      output = `There are ${srv.onlinePlayers} of a max of ${srv.maxPlayers} players online: Stark_Owner, JARVIS_Companion, Steve_99`;
    } else if (cleanCmd.startsWith('say')) {
      output = `[Server Broadcast] <JARVIS>: ${cleanCmd.replace('say', '').trim()}`;
    } else if (cleanCmd.startsWith('whitelist')) {
      output = `[Server] Whitelist command '${cleanCmd}' executed successfully.`;
    } else if (cleanCmd.startsWith('kick')) {
      output = `[Server] Kicked target player from realm.`;
    } else {
      output = `[RCON Response: ${srv.name}] Executed: /${cleanCmd}`;
    }

    this.addLog('system', `RCON [${srv.name}]: /${cleanCmd} -> ${output}`);
    return { success: true, output };
  }

  // Add activity log
  private addLog(
    type: BotActivityLog['type'],
    message: string,
    hindiTranslation?: string
  ) {
    const entry: BotActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      hindiTranslation,
    };
    this.session.activityHistory.unshift(entry);
    if (this.session.activityHistory.length > 50) {
      this.session.activityHistory.pop();
    }
  }
}

export const minecraftEngine = new MinecraftEngine();
