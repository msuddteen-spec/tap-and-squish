import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';
import type { PressResult, SaveState } from '../types/game';
import { ScoreSyncManager } from './ScoreSyncManager';

const ranks = [{ score: 100000, title: 'Bread God' }, { score: 20000, title: 'Bread Emperor' }, { score: 5000, title: 'Bread Legend' }, { score: 1500, title: 'Bread Master' }, { score: 500, title: 'Bread Fan' }, { score: 100, title: 'Bread Lover' }, { score: 0, title: 'Bread Rookie' }];
const multiplierFor = (combo: number) => combo >= 40 ? 10 : combo >= 20 ? 5 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
const rankFor = (score: number) => ranks.find((rank) => score >= rank.score) ?? ranks[ranks.length - 1];

export class GameManager {
  readonly save: SaveManager;
  readonly audio: AudioManager;
  private combo = 0;
  private lastPress = 0;
  readonly sync: ScoreSyncManager;
  private listeners = new Set<(result: PressResult, state: SaveState) => void>();

  constructor() { this.save = new SaveManager(); this.audio = new AudioManager(); this.sync = new ScoreSyncManager(this); }
  get state(): SaveState { return this.save.get(); }
  get currentCombo(): number { return this.combo; }
  onPress(listener: (result: PressResult, state: SaveState) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  press(): PressResult {
    const now = performance.now();
    this.combo = now - this.lastPress <= 850 ? this.combo + 1 : 1;
    this.lastPress = now;
    const multiplier = multiplierFor(this.combo);
    const scoreAdded = multiplier;
    const previousScore = this.state.score;
    const nextScore = previousScore + scoreAdded;
    const previousRank = rankFor(previousScore).title;
    const nextRank = rankFor(nextScore).title;
    const coinsAdded = Math.floor(nextScore / 10) - Math.floor(previousScore / 10);
    const dailyPresses = this.state.dailyPresses + 1;
    this.save.update({ score: nextScore, highScore: Math.max(this.state.highScore, nextScore), coins: this.state.coins + coinsAdded, totalPresses: this.state.totalPresses + 1, dailyPresses, bestCombo: Math.max(this.state.bestCombo, this.combo) });
    this.sync.request();
    this.audio.playSquish();
    if (this.state.hapticEnabled && 'vibrate' in navigator) navigator.vibrate(8);
    const result: PressResult = { scoreAdded, combo: this.combo, multiplier, coinsAdded, rankChanged: nextRank !== previousRank && nextRank !== this.state.unlockedRank ? nextRank : undefined, missionCompleted: dailyPresses >= 300 };
    if (result.rankChanged) this.save.update({ unlockedRank: nextRank });
    for (const listener of this.listeners) listener(result, this.state);
    return result;
  }
  claimMission(): boolean { if (this.state.dailyMissionClaimed || this.state.dailyPresses < 300) return false; this.save.update({ coins: this.state.coins + 100, dailyMissionClaimed: true }); return true; }
  dispose(): void { this.sync.dispose(); this.save.dispose(); }
}
