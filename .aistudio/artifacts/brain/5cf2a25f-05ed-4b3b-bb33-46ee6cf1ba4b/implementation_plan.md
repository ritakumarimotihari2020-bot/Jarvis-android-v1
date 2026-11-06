# JARVIS Ultimate Personal AI Agent & Minecraft Gaming System

Transform JARVIS into an advanced, personal AI operating assistant and gaming companion capable of managing personal Google accounts (Gmail, Calendar, Drive, Contacts), orchestrating Minecraft Java and Bedrock gameplay through a dual-mode native bot and desktop bridge, controlling server infrastructure (RCON, Geyser crossplay), and performing autonomous computer operations under strict owner authorization.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The architectural directions below were confirmed in Phase 1 clarification:
> - **Google Workspace Scope**: Connect all 4 core services (**Gmail, Google Calendar, Google Drive, and Google Contacts**) via Google OAuth 2.0 with least-privilege token delegation and explicit confirmation dialogs before sending emails or mutating user data.
> - **Minecraft Gameplay AI Architecture**: Implement **Dual-Mode** operation:
>   1. **Native Bot Protocol Engine**: Direct network client simulation (Java & Bedrock/Geyser) for block mining, pathfinding, building, resource collection, and combat.
>   2. **Desktop Screen & Control Bridge**: Local OS process detection, authorized screen capture with Gemini multimodal visual scene analysis, and keyboard/mouse automation with an instant emergency takeover switch.
> - **Minecraft Server Management**: Full support for **both Local and Remote Java, Bedrock, and Geyser Crossplay servers** with real-time ping/MOTD probers, RCON command dispatch, server process lifecycle, and log streaming.

---

## 1. Overview & Core Concept

JARVIS evolves from an OS assistant into an **Autonomous Personal Intelligence & Gaming Operator**:
1. **Personal Workspace Officer**: Directly monitors, summarizes, and drafts Gmail messages, manages Google Calendar appointments, navigates Google Drive files, and searches Contacts with zero password exposure.
2. **Autonomous Minecraft Companion**: Acts as an in-game teammate or autonomous bot capable of playing alongside the player on Java or Bedrock servers, gathering wood/ores, constructing structures, surviving nighttime raids, and following spoken Hindi/English voice orders.
3. **Minecraft Server Commander**: Manages dedicated game servers (local JVM processes or remote hosts via RCON), monitoring player counts,TPS, server console logs, backups, and Geyser cross-play translations.
4. **Desktop & Hardware Operator**: Detects system hardware (CPU, RAM, GPU, OS), launches installed games and applications, and executes desktop tasks with strict confirmation guardrails and an **Emergency Disconnect Switch**.

---

## 2. User Experience & Visual Design

### Aesthetic Direction & Visual Identity
- **Futuristic Stark Holographic HUD**: Deep void canvas (`#030712`), high-contrast cyan optical vectors (`#06B6D4`, `#22D3EE`), and deep cobalt panels (`#0B132B`).
- **Interactive Holographic AI Core**: Blue animated concentric rings with audio reactive waveforms and state transitions (Idle, Listening, Processing, Gaming Autonomous Mode, Emergency Halt).
- **Domain-Specific Layout**: Sidebar navigation and high-density HUD tabs for rapid switching:
  1. **Core HUD & Chat**: Live holographic core, bilingual Hindi/English voice transcription, and multi-step task execution.
  2. **Personal Accounts Vault**: Google Workspace connection status, active tokens expiry, permissions overview, and connected gaming accounts (Minecraft, Microsoft Xbox Live).
  3. **Google Workspace Hub**: Interactive tabs for **Gmail** (inbox viewer, AI email summarizer, safe draft composer with approval popup), **Calendar** (timeline agenda, quick event scheduler), **Drive** (file search, document preview), and **Contacts**.
  4. **Minecraft Gaming Control Center**:
     - *Bot Operator Panel*: Java & Bedrock bot status, live coordinates $(X, Y, Z)$, inventory grid, health & hunger meters, active AI task (e.g., "Mining Iron", "Building Shelter", "Defending Perimeter"), and quick voice/text command bar.
     - *Vision & Desktop Bridge Panel*: Real-time game screen stream preview, Gemini visual scene understanding log, hardware GPU/RAM telemetry, and keyboard/mouse override toggle.
  5. **Minecraft Server Manager**: Live server cards (Local Vanilla, Paper/Purpur, Bedrock Dedicated, Geyser Proxy), MOTD viewer, online player list, RCON console terminal with command history, and server start/stop/restart controls.
  6. **Computer Control & Hardware**: System hardware specs detector (OS, CPU cores, RAM, GPU), installed games/app launcher, file navigator with safety confirmation modal.
  7. **Self-Upgrade & Version Center**: Established Mark VII system with SHA-256 pre-write backups, automatic version bumping (`vX.Y.Z`), and instant rollback.

### Zero-Pill & Anti-Slop Disciplined UI
- Unboxed typographic metadata with clean `·` and `/` delimiters.
- Tabular numerals (`tabular-nums`) for all player counts, coordinates, memory stats, and timestamps.
- Explicit destructive confirmation modals for sending emails, deleting files, or executing server stop commands.

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Approach | Rationale & User Benefit |
| :--- | :--- | :--- |
| **Google Authentication** | Client-Side Firebase Auth + `GoogleAuthProvider` with Google Workspace scopes | Complies with strict AI Studio OAuth requirements; eliminates fragile server-side redirect URIs that fail in preview environments; keeps tokens strictly in memory. |
| **Destructive Actions Safety** | Mandatory Custom Confirmation Modals before sending emails or modifying server files | Prevents accidental data deletion or unintended email transmissions while maintaining seamless automated reading and drafting. |
| **Minecraft Bot Integration** | Dual-Architecture: Server-side Headless Protocol Client + Client-side Desktop Vision Bridge | Protocol bots provide exact block manipulation and pathfinding regardless of screen resolution, while the Desktop Vision Bridge enables playing directly on the local display. |
| **Bilingual Voice Engine** | Continuous Web Speech Recognition with Hindi/English NLP + Gemini 2.5/3.8 Flash Fallback | Ensures instant response times on native browsers with a reliable server-side AI fallback so Jarvis never fails to hear or speak. |

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             JARVIS FRONTEND HUD                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │  Holographic AI Core  │  │ Personal Accounts Hub │  │ Gaming Console  │  │
│  │  (Bilingual Voice STT)│  │ (Google OAuth & Vault)│  │ (MC Java/Bedrock│  │
│  └───────────┬───────────┘  └───────────┬───────────┘  └────────┬────────┘  │
└──────────────┼──────────────────────────┼───────────────────────┼───────────┘
               │                          │                       │
               ▼                          ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPRESS FULL-STACK SERVER                         │
│                                                                             │
│  ┌────────────────────┐   ┌────────────────────┐   ┌─────────────────────┐  │
│  │ /api/workspace/*   │   │ /api/minecraft/*   │   │ /api/system/*       │  │
│  │ - Gmail List/Send  │   │ - Java Bot Client  │   │ - Hardware Specs    │  │
│  │ - Calendar Events  │   │ - Bedrock / Geyser │   │ - App Launcher      │  │
│  │ - Drive Explorer   │   │ - Server RCON Prober│  │ - Vision Analysis   │  │
│  │ - Contacts Search  │   │ - Task Executive   │   │ - Emergency Halt    │  │
│  └─────────┬──────────┘   └─────────┬──────────┘   └──────────┬──────────┘  │
│            │                        │                         │             │
│            ▼                        ▼                         ▼             │
│  ┌────────────────────┐   ┌────────────────────┐   ┌─────────────────────┐  │
│  │ Google REST APIs   │   │ Mineflayer / RCON  │   │ Node OS & ChildProc │  │
│  │ (Bearer Auth)      │   │ Protocol Sockets   │   │ Hardware Telemetry  │  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Data Models & State Stores

```typescript
// Personal Accounts Vault
interface ConnectedAccount {
  id: string;
  provider: 'google' | 'microsoft_minecraft' | 'desktop_companion';
  email?: string;
  username?: string;
  status: 'connected' | 'disconnected' | 'token_expired';
  scopes: string[];
  lastSyncedAt: string;
  metadata?: Record<string, any>;
}

// Minecraft Bot & Session State
interface MinecraftBotState {
  botId: string;
  edition: 'java' | 'bedrock';
  serverHost: string;
  serverPort: number;
  status: 'offline' | 'connecting' | 'spawned' | 'active_task' | 'combat' | 'error';
  position: { x: number; y: number; z: number; dimension: string };
  vitalStats: { health: number; food: number; oxygen: number; armor: number };
  inventory: Array<{ slot: number; name: string; count: number; displayName: string }>;
  currentObjective: string;
  recentActivity: Array<{ timestamp: string; action: string; details: string }>;
}

// Minecraft Server Instance
interface MinecraftServerNode {
  id: string;
  name: string;
  type: 'local_java' | 'local_bedrock' | 'remote_rcon' | 'geyser_crossplay';
  host: string;
  port: number;
  rconPort?: number;
  status: 'online' | 'offline' | 'restarting';
  onlinePlayers: number;
  maxPlayers: number;
  motd: string;
  version: string;
  pingMs: number;
  isOwnerManaged: boolean;
}
```

---

## 5. Phased Implementation Roadmap

### Phase 1: Google Workspace OAuth & Personal Account Vault
- Configure Google OAuth tool (`set_up_oauth`) with combined Workspace scopes (`gmail.modify`, `calendar.events`, `drive.readonly`, `drive.file`, `contacts.readonly`).
- Implement `src/utils/workspaceAuth.ts` and `src/components/PersonalAccountsDashboard.tsx`.
- Implement `src/components/WorkspaceHub.tsx` with dedicated Gmail, Calendar, Drive, and Contacts explorers with mandatory approval dialogs for message sending.

### Phase 2: Minecraft Gameplay AI & Bot Protocol Engine
- Build `src/utils/minecraftBotEngine.ts` and `/api/minecraft/*` endpoints for headless bot spawning, autonomous block harvesting, crafting recipes, pathfinding, building, and combat defense.
- Add Bedrock Edition & Geyser crossplay connector modules.
- Create `src/components/MinecraftControlCenter.tsx` featuring live coordinate tracking, inventory inspection, and task dispatching.

### Phase 3: Autonomous Desktop Bridge & Computer Hardware Telemetry
- Build `src/utils/systemControlBridge.ts` and `/api/system/*` routes to detect actual hardware specs (OS, CPU, RAM, GPU), list installed applications, and provide desktop automation hooks.
- Implement Gemini multimodal screen vision analysis (`gemini-2.5-flash`) for real-time game situation comprehension and strategic voice responses.
- Implement prominent **Emergency Stop / Disconnect All Controls** switch.

### Phase 4: Minecraft Server Management Console
- Build `src/utils/minecraftServerManager.ts` to probe server ping, MOTD, player lists, and execute RCON administrative commands.
- Provide local server process management (start, stop, restart, config view, logs).

### Phase 5: Voice Assistant & System Integration
- Connect bilingual wake word ("Hey JARVIS") and gaming voice commands to the bot action router.
- Verify complete app compilation, lint checks, and pre-write backup preservation.
