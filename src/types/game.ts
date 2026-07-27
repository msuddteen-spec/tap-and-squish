export type LeaderboardCategory = 'today' | 'weekly' | 'allTime';

export interface SaveState {
  anonymousPlayerId: string; username: string; countryCode: string; countryChangedAt: string;
  score: number; highScore: number; coins: number; totalPresses: number; dailyPresses: number;
  dailyMissionDate: string; dailyMissionClaimed: boolean; unlockedRank: string; bestCombo: number; updatedAt: string;
  soundEnabled: boolean; hapticEnabled: boolean; reduceEffects: boolean;
}
export interface PressResult { scoreAdded: number; combo: number; multiplier: number; coinsAdded: number; rankChanged?: string; missionCompleted: boolean; }
