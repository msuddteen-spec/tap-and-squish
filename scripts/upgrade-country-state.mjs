import fs from 'node:fs';
fs.writeFileSync('src/types/game.ts', `export type LeaderboardCategory = 'today' | 'weekly' | 'allTime';

export interface SaveState {
  anonymousPlayerId: string; username: string; countryCode: string; countryChangedAt: string;
  score: number; highScore: number; coins: number; totalPresses: number; dailyPresses: number;
  dailyMissionDate: string; dailyMissionClaimed: boolean; unlockedRank: string; bestCombo: number; updatedAt: string;
  soundEnabled: boolean; hapticEnabled: boolean; reduceEffects: boolean;
}
export interface PressResult { scoreAdded: number; combo: number; multiplier: number; coinsAdded: number; rankChanged?: string; missionCompleted: boolean; }
`);
fs.writeFileSync('src/game/SaveManager.ts', `import type { SaveState } from '../types/game';
export const SAVE_KEY = 'squishyBread.save.v1';
const today = () => { const date = new Date(); return date.toISOString().slice(0, 10); };
const playerId = () => { try { const id = crypto.randomUUID(); return id; } catch { return \`local-\\${Date.now()}-\\${Math.random().toString(36).slice(2)}\`; } };
const defaults = (): SaveState => ({ anonymousPlayerId: playerId(), username: '', countryCode: '', countryChangedAt: '', score: 0, highScore: 0, coins: 0, totalPresses: 0, dailyPresses: 0, dailyMissionDate: today(), dailyMissionClaimed: false, unlockedRank: 'Bread Rookie', bestCombo: 0, updatedAt: new Date().toISOString(), soundEnabled: true, hapticEnabled: true, reduceEffects: false });
export class SaveManager {
  private state: SaveState; private timer: number | undefined;
  constructor() { this.state = this.read(); window.addEventListener('pagehide', this.flush); document.addEventListener('visibilitychange', this.onVisibilityChange); }
  get(): SaveState { return this.state; }
  update(patch: Partial<SaveState>): void { this.state = { ...this.state, ...patch, updatedAt: new Date().toISOString() }; this.schedule(); }
  reset(): void { this.state = defaults(); this.flush(); }
  dispose(): void { window.removeEventListener('pagehide', this.flush); document.removeEventListener('visibilitychange', this.onVisibilityChange); this.flush(); }
  private read(): SaveState { const fallback = defaults(); try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return fallback; const value = JSON.parse(raw) as Partial<SaveState>; const state = { ...fallback, ...value }; if (typeof state.score !== 'number' || !Number.isFinite(state.score)) state.score = 0; if (typeof state.highScore !== 'number' || !Number.isFinite(state.highScore)) state.highScore = state.score; if (typeof state.totalPresses !== 'number') state.totalPresses = 0; if (typeof state.bestCombo !== 'number') state.bestCombo = 0; if (state.dailyMissionDate !== today()) { state.dailyMissionDate = today(); state.dailyPresses = 0; state.dailyMissionClaimed = false; } return state; } catch { return fallback; } }
  private schedule = () => { window.clearTimeout(this.timer); this.timer = window.setTimeout(this.flush, 250); };
  private flush = () => { window.clearTimeout(this.timer); this.timer = undefined; try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch { /* storage unavailable */ } };
  private onVisibilityChange = () => { if (document.visibilityState === 'hidden') this.flush(); };
}
`);
