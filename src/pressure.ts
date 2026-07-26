import { centroid, clamp } from "./math";
import type { Particle } from "./verlet";

export function applyPressure(nodes: readonly Particle[], pressure: number, strength: number): void {
  if (nodes.length === 0 || pressure <= 0) {
    return;
  }

  const center = centroid(nodes);
  const amount = pressure * strength;
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const dx = node.x - center.x;
    const dy = node.y - center.y;
    const len = Math.hypot(dx, dy);
    if (len <= 1e-8) {
      continue;
    }
    const falloff = clamp(1 - len / 240, 0.15, 1);
    const n = falloff * amount;
    node.x += (dx / len) * n;
    node.y += (dy / len) * n;
  }
}

export function applyPropagation(nodes: readonly Particle[], strength: number): void {
  const count = nodes.length;
  if (count < 3) {
    return;
  }

  for (let i = 0; i < count; i += 1) {
    const prev = nodes[(i - 1 + count) % count];
    const node = nodes[i];
    const next = nodes[(i + 1) % count];
    const smoothX = (prev.x + node.x + next.x) / 3;
    const smoothY = (prev.y + node.y + next.y) / 3;
    node.x += (smoothX - node.x) * strength * 0.2;
    node.y += (smoothY - node.y) * strength * 0.2;
  }
}
