import { clamp, distance, fromAngle, normalize, sub, wrap } from "./math";
import type { Particle } from "./verlet";

export function solveDistance(a: Particle, b: Particle, restLength: number, stiffness: number): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-8) {
    return;
  }

  const diff = (len - restLength) / len;
  const invMassSum = a.invMass + b.invMass;
  if (invMassSum <= 0) {
    return;
  }

  const factorA = (a.invMass / invMassSum) * stiffness;
  const factorB = (b.invMass / invMassSum) * stiffness;
  const offsetX = dx * diff;
  const offsetY = dy * diff;

  a.x += offsetX * factorA;
  a.y += offsetY * factorA;
  b.x -= offsetX * factorB;
  b.y -= offsetY * factorB;
}

export function solveCenterCoupling(center: Particle, ring: readonly Particle[], restRadius: number, stiffness: number): void {
  const count = ring.length;
  if (count === 0) {
    return;
  }

  let avgX = 0;
  let avgY = 0;
  for (const node of ring) {
    avgX += node.x;
    avgY += node.y;
  }
  avgX /= count;
  avgY /= count;

  const dx = avgX - center.x;
  const dy = avgY - center.y;
  center.x += dx * stiffness * 0.5;
  center.y += dy * stiffness * 0.5;

  const target = restRadius;
  for (const node of ring) {
    const vx = node.x - center.x;
    const vy = node.y - center.y;
    const len = Math.hypot(vx, vy);
    if (len <= 1e-8) {
      continue;
    }
    const desired = target;
    const delta = (len - desired) / len;
    node.x -= vx * delta * stiffness * 0.35;
    node.y -= vy * delta * stiffness * 0.35;
  }
}

export function solveRadialMemory(
  center: Particle,
  nodes: readonly Particle[],
  restAngles: readonly number[],
  restRadii: readonly number[],
  stiffness: number
): void {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const baseAngle = restAngles[i];
    const baseRadius = restRadii[i];
    const dx = node.x - center.x;
    const dy = node.y - center.y;
    const currentRadius = Math.hypot(dx, dy);
    if (currentRadius <= 1e-8) {
      continue;
    }
    const currentAngle = Math.atan2(dy, dx);
    let deltaAngle = currentAngle - baseAngle;
    while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
    while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

    const rotateStrength = stiffness * 0.2;
    const radiusStrength = stiffness * 0.35;
    const tangential = deltaAngle * rotateStrength;
    const radialDelta = (currentRadius - baseRadius) * radiusStrength;
    const tangentX = -dy / currentRadius;
    const tangentY = dx / currentRadius;
    const radialX = dx / currentRadius;
    const radialY = dy / currentRadius;

    node.x -= tangentX * tangential + radialX * radialDelta;
    node.y -= tangentY * tangential + radialY * radialDelta;
  }
}

export function solveRing(nodes: readonly Particle[], stiffness: number, edgeRestLength?: number): void {
  const count = nodes.length;
  if (count < 2) {
    return;
  }
  for (let i = 0; i < count; i += 1) {
    const a = nodes[i];
    const b = nodes[(i + 1) % count];
    const rest = edgeRestLength ?? distance({ x: a.px, y: a.py }, { x: b.px, y: b.py });
    solveDistance(a, b, rest, stiffness);
  }
}

export function solveShear(
  inner: readonly Particle[],
  outer: readonly Particle[],
  indexOffset: number,
  stiffness: number,
  restScale = 1
): void {
  const count = inner.length;
  for (let i = 0; i < count; i += 1) {
    const a = inner[i];
    const b = outer[wrap(i + indexOffset, outer.length)];
    const rest = distance({ x: a.px, y: a.py }, { x: b.px, y: b.py }) * restScale;
    solveDistance(a, b, rest, stiffness);
  }
}

export function solveCenterSpring(center: Particle, targetX: number, targetY: number, stiffness: number): void {
  center.x += (targetX - center.x) * stiffness;
  center.y += (targetY - center.y) * stiffness;
}

export function normalFromCenter(center: Particle, node: Particle): { x: number; y: number } {
  return normalize(sub(node, center));
}

export function clampNodeRadius(center: Particle, node: Particle, minRadius: number, maxRadius: number): void {
  const dx = node.x - center.x;
  const dy = node.y - center.y;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-8) {
    return;
  }
  const clamped = clamp(len, minRadius, maxRadius);
  const factor = clamped / len;
  node.x = center.x + dx * factor;
  node.y = center.y + dy * factor;
}

export function buildAngles(count: number): number[] {
  const angles: number[] = [];
  for (let i = 0; i < count; i += 1) {
    angles.push((Math.PI * 2 * i) / count);
  }
  return angles;
}

export function buildCircleOffsets(angles: readonly number[], radius: number): { x: number; y: number }[] {
  return angles.map((angle) => fromAngle(angle, radius));
}
