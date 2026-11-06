/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CoreGeometry = 'concentric' | 'gyro' | 'lattice' | 'soundwave';
export type GridStyle = 'cyber-grid' | 'hex-matrix' | 'polar-radar';

export interface JarvisTheme {
  id: string;
  name: string;
  codename: string;
  description: string;
  accentColor: string; // Hex for primary highlights & text glow (e.g., #22d3ee)
  accentGlow: string; // RGBA for glow effects (e.g., rgba(34, 211, 238, 0.45))
  secondaryColor: string; // Complementary highlight (e.g., #38bdf8)
  surfaceColor: string; // Dark panel backdrop (e.g., rgba(3, 7, 18, 0.85))
  bgTone: string; // Main background tint
  borderColor: string; // Border accent color
  coreGeometry: CoreGeometry;
  gridStyle: GridStyle;
  isCustom?: boolean;
  createdAt?: string;
}

export const FACTORY_THEMES: JarvisTheme[] = [
  {
    id: 'theme_arc_cyan',
    name: 'Mark VII Arc Cyan',
    codename: 'DEFAULT_STARK_ARC',
    description: 'Iconic classic Stark Arc Reactor luminescence with high-frequency cyan rings and electric blue telemetry.',
    accentColor: '#22d3ee', // cyan-400
    accentGlow: 'rgba(34, 211, 238, 0.45)',
    secondaryColor: '#38bdf8', // sky-400
    surfaceColor: '#030712',
    bgTone: '#030712',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    coreGeometry: 'concentric',
    gridStyle: 'cyber-grid',
  },
  {
    id: 'theme_mark_xliv',
    name: 'Mark XLIV Hulkbuster',
    codename: 'HEAVY_ASSAULT_GOLD',
    description: 'High-density crimson armor aesthetic with solar amber reactor cores calibrated for maximum kinetic output.',
    accentColor: '#f59e0b', // amber-500
    accentGlow: 'rgba(245, 158, 11, 0.45)',
    secondaryColor: '#ef4444', // red-500
    surfaceColor: '#0c0705',
    bgTone: '#080404',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    coreGeometry: 'gyro',
    gridStyle: 'hex-matrix',
  },
  {
    id: 'theme_stealth_violet',
    name: 'Stealth Shadow Ops',
    codename: 'NIGHT_INFILTRATOR',
    description: 'Sub-radar dark matter obsidian casing with vibrant ultraviolet quantum resonance and reduced thermal signatures.',
    accentColor: '#c084fc', // purple-400
    accentGlow: 'rgba(192, 132, 252, 0.45)',
    secondaryColor: '#818cf8', // indigo-400
    surfaceColor: '#07040d',
    bgTone: '#05020a',
    borderColor: 'rgba(192, 132, 252, 0.35)',
    coreGeometry: 'lattice',
    gridStyle: 'polar-radar',
  },
  {
    id: 'theme_tachyon_emerald',
    name: 'Tachyon Bio-Shield',
    codename: 'PERIMETER_SENTRY',
    description: 'Hyper-frequency emerald matrix designed for tactical surveillance, biological diagnostics, and long-range radar.',
    accentColor: '#34d399', // emerald-400
    accentGlow: 'rgba(52, 211, 153, 0.45)',
    secondaryColor: '#2dd4bf', // teal-400
    surfaceColor: '#030c08',
    bgTone: '#020805',
    borderColor: 'rgba(52, 211, 153, 0.35)',
    coreGeometry: 'soundwave',
    gridStyle: 'hex-matrix',
  },
  {
    id: 'theme_solar_amber',
    name: 'Orbital Solar Sentinel',
    codename: 'HELIOS_HARMONICS',
    description: 'Warm gold cybernetic telemetry calibrated for solar flare monitoring, arc reactor tuning, and aerospace telecommunications.',
    accentColor: '#fbbf24', // amber-400
    accentGlow: 'rgba(251, 191, 36, 0.45)',
    secondaryColor: '#f97316', // orange-500
    surfaceColor: '#0a0802',
    bgTone: '#070501',
    borderColor: 'rgba(251, 191, 36, 0.38)',
    coreGeometry: 'gyro',
    gridStyle: 'cyber-grid',
  },
  {
    id: 'theme_quantum_cobalt',
    name: 'Quantum Cobalt Deep Space',
    codename: 'DEEP_SPACE_TELEMETRY',
    description: 'High-contrast oceanic cobalt with pristine ice-blue orbital harmonics for satellite telemetry and deep research.',
    accentColor: '#60a5fa', // blue-400
    accentGlow: 'rgba(96, 165, 250, 0.45)',
    secondaryColor: '#38bdf8', // sky-400
    surfaceColor: '#020617',
    bgTone: '#01040f',
    borderColor: 'rgba(96, 165, 250, 0.35)',
    coreGeometry: 'concentric',
    gridStyle: 'polar-radar',
  },
];

const STORAGE_KEY_ACTIVE_THEME = 'jarvis_active_theme_v2';
const STORAGE_KEY_THEME_HISTORY = 'jarvis_theme_history_v2';
const STORAGE_KEY_CUSTOM_THEMES = 'jarvis_custom_themes_v2';

class ThemeManager {
  private activeTheme: JarvisTheme = FACTORY_THEMES[0];
  private themeHistory: JarvisTheme[] = [];
  private customThemes: JarvisTheme[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE_THEME);
      if (savedActive) {
        this.activeTheme = JSON.parse(savedActive);
      }

      const savedHistory = localStorage.getItem(STORAGE_KEY_THEME_HISTORY);
      if (savedHistory) {
        this.themeHistory = JSON.parse(savedHistory);
      }

      const savedCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_THEMES);
      if (savedCustom) {
        this.customThemes = JSON.parse(savedCustom);
      }
    } catch (e) {
      console.warn('Failed to load theme data from localStorage:', e);
    }
  }

  public getActiveTheme(): JarvisTheme {
    return this.activeTheme;
  }

  public getAllAvailableThemes(): JarvisTheme[] {
    return [...FACTORY_THEMES, ...this.customThemes];
  }

  public getThemeHistory(): JarvisTheme[] {
    return this.themeHistory;
  }

  public canRollback(): boolean {
    return this.themeHistory.length > 0;
  }

  public getPreviousTheme(): JarvisTheme | null {
    if (this.themeHistory.length === 0) return null;
    return this.themeHistory[this.themeHistory.length - 1];
  }

  /**
   * Applies the theme by setting root CSS custom variables.
   * Enforces zero-glitch global synchronization.
   */
  public applyTheme(theme: JarvisTheme, saveHistory: boolean = true): { success: boolean; message: string } {
    if (saveHistory && this.activeTheme.id !== theme.id) {
      this.themeHistory.push(this.activeTheme);
      // Keep max 10 in history
      if (this.themeHistory.length > 10) {
        this.themeHistory.shift();
      }
    }

    this.activeTheme = theme;

    // Apply to DOM via CSS custom properties
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--hud-accent', theme.accentColor);
      root.style.setProperty('--hud-accent-glow', theme.accentGlow);
      root.style.setProperty('--hud-secondary', theme.secondaryColor);
      root.style.setProperty('--hud-surface', theme.surfaceColor);
      root.style.setProperty('--hud-bg', theme.bgTone);
      root.style.setProperty('--hud-border', theme.borderColor);
    }

    // Save to storage
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_THEME, JSON.stringify(this.activeTheme));
      localStorage.setItem(STORAGE_KEY_THEME_HISTORY, JSON.stringify(this.themeHistory));
    } catch (e) {
      console.warn('Failed to persist theme state:', e);
    }

    return {
      success: true,
      message: `Theme '${theme.name}' applied successfully under Stark authorization.`,
    };
  }

  /**
   * Restores the previous theme from the history stack
   */
  public rollback(): { success: boolean; restoredTheme: JarvisTheme | null; message: string } {
    if (this.themeHistory.length === 0) {
      return { success: false, restoredTheme: null, message: 'No prior theme snapshot available for rollback.' };
    }

    const previousTheme = this.themeHistory.pop()!;
    this.applyTheme(previousTheme, false); // Don't re-push to history during rollback

    try {
      localStorage.setItem(STORAGE_KEY_THEME_HISTORY, JSON.stringify(this.themeHistory));
    } catch (e) {
      console.warn('Failed to persist theme rollback:', e);
    }

    return {
      success: true,
      restoredTheme: previousTheme,
      message: `Restored previous visual design '${previousTheme.name}'.`,
    };
  }

  /**
   * Synthesize a novel theme procedurally with harmonious color theory and Stark design constraints
   */
  public synthesizeNovelTheme(customDirective?: string): JarvisTheme {
    const geometries: CoreGeometry[] = ['concentric', 'gyro', 'lattice', 'soundwave'];
    const gridStyles: GridStyle[] = ['cyber-grid', 'hex-matrix', 'polar-radar'];

    // Curated Stark color harmony seeds
    const colorHarmonies = [
      { name: 'Plasma Rose', accent: '#f43f5e', sec: '#fb7185', glow: 'rgba(244, 63, 94, 0.45)', bg: '#080204', surface: '#0d0407', border: 'rgba(244, 63, 94, 0.35)' },
      { name: 'Tesseract Cyan', accent: '#00f2fe', sec: '#4facfe', glow: 'rgba(0, 242, 254, 0.45)', bg: '#020612', surface: '#030b1e', border: 'rgba(0, 242, 254, 0.35)' },
      { name: 'Hyperdrive Emerald', accent: '#10b981', sec: '#06b6d4', glow: 'rgba(16, 185, 129, 0.45)', bg: '#010a06', surface: '#02130c', border: 'rgba(16, 185, 129, 0.35)' },
      { name: 'Supernova Gold', accent: '#fbbf24', sec: '#ea580c', glow: 'rgba(251, 191, 36, 0.45)', bg: '#090601', surface: '#120d03', border: 'rgba(251, 191, 36, 0.35)' },
      { name: 'Nebula Amethyst', accent: '#d946ef', sec: '#8b5cf6', glow: 'rgba(217, 70, 239, 0.45)', bg: '#09020b', surface: '#130417', border: 'rgba(217, 70, 239, 0.35)' },
      { name: 'Cryo Ice Sapphire', accent: '#38bdf8', sec: '#818cf8', glow: 'rgba(56, 189, 248, 0.45)', bg: '#020712', surface: '#040d21', border: 'rgba(56, 189, 248, 0.35)' },
      { name: 'Vibranium Silver', accent: '#cbd5e1', sec: '#38bdf8', glow: 'rgba(203, 213, 225, 0.45)', bg: '#04070c', surface: '#090e17', border: 'rgba(203, 213, 225, 0.35)' },
    ];

    const harmony = colorHarmonies[Math.floor(Math.random() * colorHarmonies.length)];
    const geom = geometries[Math.floor(Math.random() * geometries.length)];
    const grid = gridStyles[Math.floor(Math.random() * gridStyles.length)];
    const randNum = Math.floor(100 + Math.random() * 900);

    const newTheme: JarvisTheme = {
      id: `theme_synth_${Date.now()}_${randNum}`,
      name: `${harmony.name} Mark-${randNum}`,
      codename: `SYNTH_${harmony.name.toUpperCase().replace(/\s+/g, '_')}`,
      description: customDirective
        ? `Autonomously synthesized based on user directive: "${customDirective}". Calibrated for optimal HUD contrast and core dynamics.`
        : `Autonomous Stark neural synthesis: ${harmony.name} chromatic balance with ${geom} core hologram geometry and ${grid} structure.`,
      accentColor: harmony.accent,
      accentGlow: harmony.glow,
      secondaryColor: harmony.sec,
      surfaceColor: harmony.surface,
      bgTone: harmony.bg,
      borderColor: harmony.border,
      coreGeometry: geom,
      gridStyle: grid,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    return newTheme;
  }

  public saveCustomTheme(theme: JarvisTheme) {
    this.customThemes.unshift(theme);
    if (this.customThemes.length > 20) {
      this.customThemes.pop();
    }
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_THEMES, JSON.stringify(this.customThemes));
    } catch (e) {
      console.warn('Failed to save custom theme:', e);
    }
  }
}

export const themeManager = new ThemeManager();
