export interface PlayerProfile { id: string; username: string; countryCode: string; score: number; highScore: number; bestCombo: number; totalPresses: number; updatedAt: string; }
export interface PlayerLeaderboardEntry { rank: number; id: string; username: string; countryCode: string; score: number; bestCombo: number; }
export interface CountryLeaderboardEntry { rank: number; countryCode: string; totalScore: number; playerCount: number; updatedAt?: string; }
export interface LeaderboardResponse<T> { entries: T[]; playerRank?: number; updatedAt: string; source: 'supabase' | 'mock' | 'cache'; error?: string; }
export interface SyncStatus { state: 'idle' | 'syncing' | 'offline' | 'error'; lastSyncedAt?: string; pending: boolean; }
