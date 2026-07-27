import type { LeaderboardCategory } from '../types/game';

export interface LeaderboardEntry { name: string; score: number; isPlayer?: boolean; }
const mock: LeaderboardEntry[] = [
  { name: 'BreadKing', score: 52310 }, { name: 'MochiMaster', score: 47880 }, { name: 'SoftBun', score: 42950 }, { name: 'ToastBoss', score: 39420 }, { name: 'JellyBread', score: 35870 },
];

export class LeaderboardManager {
  getEntries(score: number, category: LeaderboardCategory): LeaderboardEntry[] {
    const factor = category === 'today' ? 1 : category === 'weekly' ? 1.15 : 1.35;
    return [...mock.map((entry) => ({ ...entry, score: Math.round(entry.score * factor) })), { name: 'You', score, isPlayer: true }].sort((a, b) => b.score - a.score).slice(0, 6);
  }
  getPlayerRank(score: number, category: LeaderboardCategory): number { return [...this.getEntries(score, category)].sort((a, b) => b.score - a.score).findIndex((entry) => entry.isPlayer) + 1; }
}
