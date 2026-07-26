import { centroid, polygonArea } from "./math";
import type { Particle } from "./verlet";

export function computeArea(nodes: readonly Particle[]): number {
  return polygonArea(nodes);
}

export function applyAreaConstraint(nodes: readonly Particle[], restArea: number, stiffness: number): void {
  if (nodes.length < 3) {
    return;
  }

  const currentArea = computeArea(nodes);
  const area = Math.abs(currentArea);
  if (area <= 1e-8) {
    return;
  }

  const direction = currentArea >= 0 ? 1 : -1;
  const delta = (restArea - area) / restArea;
  const push = delta * stiffness * 0.5;
  const center = centroid(nodes);

  for (const node of nodes) {
    const dx = node.x - center.x;
    const dy = node.y - center.y;
    const len = Math.hypot(dx, dy);
    if (len <= 1e-8) {
      continue;
    }
    const radial = (push * direction) / len;
    node.x += dx * radial;
    node.y += dy * radial;
  }
}

export function areaToPressure(restArea: number, currentArea: number): number {
  if (restArea <= 1e-8) {
    return 0;
  }
  const compression = 1 - Math.max(0, currentArea) / restArea;
  return Math.max(0, compression);
}
