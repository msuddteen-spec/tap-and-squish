import type { GameManager } from './GameManager';
import { CountryRankingService } from '../lib/CountryRankingService';
import type { SyncStatus, PlayerProfile } from '../types/country';

export class ScoreSyncManager {
  readonly ranking: CountryRankingService;
  private timer: number | undefined;
  private lastSynced = '';
  private pending = false;
  private status: SyncStatus = { state: 'idle', pending: false };
  constructor(private readonly game: GameManager) { this.ranking = new CountryRankingService(); window.addEventListener('pagehide', this.flush); document.addEventListener('visibilitychange', this.onVisibility); window.addEventListener('online', this.onOnline); window.addEventListener('offline', this.onOffline); void this.bootstrapAuth(); }
  get syncStatus(): SyncStatus { return this.status; }
  request(): void { this.pending = true; this.status = { ...this.status, pending: true }; window.clearTimeout(this.timer); this.timer = window.setTimeout(() => { void this.syncNow(); }, 12_000); }
  async syncNow(): Promise<void> { window.clearTimeout(this.timer); if (!navigator.onLine) { this.status = { state: 'offline', pending: this.pending }; return; } const state = this.game.state; if (!state.username || !state.countryCode || state.updatedAt === this.lastSynced) return; this.status = { state: 'syncing', pending: true }; const profile: PlayerProfile = { id: state.anonymousPlayerId, username: state.username, countryCode: state.countryCode, score: state.score, highScore: state.highScore, bestCombo: state.bestCombo, totalPresses: state.totalPresses, updatedAt: state.updatedAt }; try { const synced = await this.ranking.syncProfile(profile); if (synced) { this.lastSynced = state.updatedAt; this.pending = false; this.status = { state: 'idle', lastSyncedAt: new Date().toISOString(), pending: false }; this.ranking.invalidate(); } else { this.status = { state: 'idle', pending: true }; } } catch { this.status = { state: 'error', pending: true }; } }
  dispose(): void { window.clearTimeout(this.timer); window.removeEventListener('pagehide', this.flush); document.removeEventListener('visibilitychange', this.onVisibility); window.removeEventListener('online', this.onOnline); window.removeEventListener('offline', this.onOffline); }
  private async bootstrapAuth(): Promise<void> { const authId = await this.ranking.ensureAnonymousAuth(); if (authId && authId !== this.game.state.anonymousPlayerId) this.game.save.update({ anonymousPlayerId: authId }); if (this.game.state.username && this.game.state.countryCode) this.request(); }
  private flush = () => { if (this.pending) void this.syncNow(); };
  private onVisibility = () => { if (document.visibilityState === 'hidden') this.flush(); };
  private onOnline = () => { if (this.pending) void this.syncNow(); };
  private onOffline = () => { this.status = { state: 'offline', pending: this.pending }; };
}
