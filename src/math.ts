export interface Vec2 {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function wrap(index: number, lengthValue: number): number {
  return ((index % lengthValue) + lengthValue) % lengthValue;
}

export function fromAngle(angle: number, radius: number): Vec2 {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}

export function polygonArea(points: readonly Vec2[]): number {
  if (points.length < 3) {
    return 0;
  }
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area * 0.5;
}

export function polygonCentroid(points: readonly Vec2[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  const inv = points.length > 0 ? 1 / points.length : 0;
  return { x: x * inv, y: y * inv };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function length(x: number, y: number): number {
  return Math.hypot(x, y);
}

export function normalize(x: number, y: number): Vec2 {
  const len = Math.hypot(x, y);
  if (len <= 1e-8) {
    return { x: 0, y: 0 };
  }
  return { x: x / len, y: y / len };
}

export function rotate(x: number, y: number, cos: number, sin: number): Vec2 {
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos
  };
}

export function smallestAngleDifference(a: number, b: number): number {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}
