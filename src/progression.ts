export interface EvolutionStageDef {
  readonly name: string;
  readonly hue: number;
  readonly hueSpread: number;
  readonly radiusScale: number;
  readonly softness: number;
  readonly pressureBoost: number;
}

export const EVOLUTION_STAGES: readonly EvolutionStageDef[] = [
  { name: "Dough", hue: 36, hueSpread: 18, radiusScale: 1.08, softness: 1.1, pressureBoost: 0.9 },
  { name: "Bread", hue: 26, hueSpread: 16, radiusScale: 1.0, softness: 1.0, pressureBoost: 1.0 },
  { name: "Cake", hue: 332, hueSpread: 22, radiusScale: 0.96, softness: 0.94, pressureBoost: 1.05 },
  { name: "Squishy", hue: 186, hueSpread: 28, radiusScale: 0.92, softness: 0.88, pressureBoost: 1.12 }
] as const;

export interface GachaItem {
  readonly id: string;
  readonly name: string;
  readonly accent: string;
  readonly tone: string;
}

export const GACHA_POOL: readonly GachaItem[] = [
  { id: "sprinkle-star", name: "Sprinkle Star", accent: "#ffd166", tone: "#fff4c7" },
  { id: "berry-blink", name: "Berry Blink", accent: "#ff5da2", tone: "#ffd7e9" },
  { id: "mint-puff", name: "Mint Puff", accent: "#4dd4c6", tone: "#d6fff7" },
  { id: "milk-cloud", name: "Milk Cloud", accent: "#d2e2ff", tone: "#f5f8ff" },
  { id: "caramel-drop", name: "Caramel Drop", accent: "#c98a4a", tone: "#ffe2c0" },
  { id: "blue-jelly", name: "Blue Jelly", accent: "#64a8ff", tone: "#d7e8ff" },
  { id: "peach-ring", name: "Peach Ring", accent: "#ffab7a", tone: "#ffe8d9" },
  { id: "violet-pop", name: "Violet Pop", accent: "#9f7bff", tone: "#ece4ff" },
  { id: "lemon-burst", name: "Lemon Burst", accent: "#ffe15a", tone: "#fff7bf" },
  { id: "rose-gel", name: "Rose Gel", accent: "#ff7f9d", tone: "#ffe1e8" }
] as const;

export interface ProgressSnapshot {
  readonly stageIndex: number;
  readonly stageProgress: number;
  readonly stageName: string;
  readonly gachaTickets: number;
  readonly collectionCount: number;
  readonly collectionTotal: number;
}

export function pickGachaItem(
  rng: () => number,
  unlocked: ReadonlySet<string>
): GachaItem {
  const remaining = GACHA_POOL.filter((item) => !unlocked.has(item.id));
  const pool = remaining.length > 0 ? remaining : GACHA_POOL;
  return pool[Math.floor(rng() * pool.length) % pool.length];
}
