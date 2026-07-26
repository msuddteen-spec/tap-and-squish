export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x = 0, y = 0): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len <= 1e-8) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function wrap(index: number, lengthValue: number): number {
  return ((index % lengthValue) + lengthValue) % lengthValue;
}

export function centroid(points: readonly Vec2[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  const inv = points.length > 0 ? 1 / points.length : 0;
  return { x: x * inv, y: y * inv };
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

export function angleOf(v: Vec2): number {
  return Math.atan2(v.y, v.x);
}

export function fromAngle(angle: number, radius: number): Vec2 {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}

export function quadraticPoint(a: Vec2, b: Vec2, c: Vec2, t: number): Vec2 {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  return {
    x: uu * a.x + 2 * u * t * b.x + tt * c.x,
    y: uu * a.y + 2 * u * t * b.y + tt * c.y
  };
}
