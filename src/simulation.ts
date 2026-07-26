import { clamp, distance, fromAngle, lerp, normalize, polygonArea, polygonCentroid, rotate, smallestAngleDifference, smoothstep, wrap } from "./math";
import type { PointerContact } from "./input";
import { EVOLUTION_STAGES } from "./progression";

interface BlobPoint {
  x: number;
  y: number;
  px: number;
  py: number;
  invMass: number;
  restX: number;
  restY: number;
  ring: 0 | 1 | 2;
}

interface DistanceConstraint {
  a: number;
  b: number;
  rest: number;
  stiffness: number;
}

interface BlobPalette {
  base: string;
  deep: string;
  light: string;
  glow: string;
  accent: string;
}

export interface BlobMetrics {
  compression: number;
  areaRatio: number;
  centerX: number;
  centerY: number;
}

function solveDistance(points: BlobPoint[], constraint: DistanceConstraint): void {
  const a = points[constraint.a];
  const b = points[constraint.b];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-8) {
    return;
  }
  const diff = (len - constraint.rest) / len;
  const invMassSum = a.invMass + b.invMass;
  if (invMassSum <= 0) {
    return;
  }
  const correction = diff * constraint.stiffness;
  const aFactor = a.invMass / invMassSum;
  const bFactor = b.invMass / invMassSum;
  const offsetX = dx * correction;
  const offsetY = dy * correction;
  a.x += offsetX * aFactor;
  a.y += offsetY * aFactor;
  b.x -= offsetX * bFactor;
  b.y -= offsetY * bFactor;
}

function integrate(points: BlobPoint[], _dt: number, damping: number): void {
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    if (point.invMass <= 0) {
      point.px = point.x;
      point.py = point.y;
      continue;
    }
    const vx = (point.x - point.px) * damping;
    const vy = (point.y - point.py) * damping;
    point.px = point.x;
    point.py = point.y;
    point.x += vx;
    point.y += vy;
  }
}

function applyCentering(points: BlobPoint[], targetX: number, targetY: number, strength: number): void {
  const center = points[0];
  center.x += (targetX - center.x) * strength;
  center.y += (targetY - center.y) * strength;
}

export class SquishyBlob {
  readonly points: BlobPoint[] = [];
  readonly outerIndices: number[] = [];
  readonly innerIndices: number[] = [];

  palette: BlobPalette;
  outerCount: number;
  innerCount: number;
  baseRadius: number;
  homeX: number;
  homeY: number;
  readonly restOuterArea: number;
  readonly restInnerArea: number;
  stageIndex: number;
  softness: number;
  pressureBoost: number;

  compression = 0;
  areaRatio = 1;
  jiggle = 0;

  private readonly constraints: DistanceConstraint[] = [];
  private readonly restOuter: { x: number; y: number }[] = [];
  private readonly restInner: { x: number; y: number }[] = [];
  private readonly currentOuterScratch: { x: number; y: number }[] = [];
  private readonly currentInnerScratch: { x: number; y: number }[] = [];
  private readonly tempForces: { x: number; y: number }[] = [];
  private readonly shapeGoal = { cos: 1, sin: 0 };

  constructor(x: number, y: number, rng: () => number, stageIndex = 0) {
    const generated = this.generateProfile(rng, stageIndex);
    this.palette = generated.palette;
    this.outerCount = generated.outerCount;
    this.innerCount = generated.innerCount;
    this.baseRadius = generated.baseRadius;
    this.stageIndex = stageIndex;
    this.softness = generated.softness;
    this.pressureBoost = generated.pressureBoost;
    this.homeX = x;
    this.homeY = y;

    this.points.push({
      x,
      y,
      px: x,
      py: y,
      invMass: 0,
      restX: 0,
      restY: 0,
      ring: 0
    });

    for (let i = 0; i < this.innerCount; i += 1) {
      const rest = this.restInner[i];
      const px = x + rest.x;
      const py = y + rest.y;
      this.points.push({
        x: px,
        y: py,
        px,
        py,
        invMass: 0.75,
        restX: rest.x,
        restY: rest.y,
        ring: 1
      });
      this.innerIndices.push(1 + i);
    }

    for (let i = 0; i < this.outerCount; i += 1) {
      const rest = this.restOuter[i];
      const px = x + rest.x;
      const py = y + rest.y;
      this.points.push({
        x: px,
        y: py,
        px,
        py,
        invMass: 0.62,
        restX: rest.x,
        restY: rest.y,
        ring: 2
      });
      this.outerIndices.push(1 + this.innerCount + i);
    }

    this.restOuterArea = Math.abs(polygonArea(this.outerIndices.map((index) => this.points[index])));
    this.restInnerArea = Math.abs(polygonArea(this.innerIndices.map((index) => this.points[index])));

    this.buildConstraints();
    this.initScratch();
    this.tempForces.length = this.points.length;
    for (let i = 0; i < this.tempForces.length; i += 1) {
      this.tempForces[i] = { x: 0, y: 0 };
    }
  }

  resetPosition(x: number, y: number): void {
    const dx = x - this.homeX;
    const dy = y - this.homeY;
    this.homeX = x;
    this.homeY = y;
    for (const point of this.points) {
      point.x += dx;
      point.y += dy;
      point.px += dx;
      point.py += dy;
    }
  }

  respawn(x: number, y: number, rng: () => number, stageIndex = this.stageIndex): void {
    const generated = this.generateProfile(rng, stageIndex);
    this.palette = generated.palette;
    this.outerCount = generated.outerCount;
    this.innerCount = generated.innerCount;
    this.baseRadius = generated.baseRadius;
    this.stageIndex = stageIndex;
    this.softness = generated.softness;
    this.pressureBoost = generated.pressureBoost;
    this.homeX = x;
    this.homeY = y;
    this.points.length = 0;
    this.outerIndices.length = 0;
    this.innerIndices.length = 0;
    this.constraints.length = 0;
    this.restOuter.length = 0;
    this.restInner.length = 0;

    this.points.push({
      x,
      y,
      px: x,
      py: y,
      invMass: 0,
      restX: 0,
      restY: 0,
      ring: 0
    });

    for (let i = 0; i < this.innerCount; i += 1) {
      const rest = this.restInner[i];
      const px = x + rest.x;
      const py = y + rest.y;
      this.points.push({
        x: px,
        y: py,
        px,
        py,
        invMass: 0.75,
        restX: rest.x,
        restY: rest.y,
        ring: 1
      });
      this.innerIndices.push(1 + i);
    }

    for (let i = 0; i < this.outerCount; i += 1) {
      const rest = this.restOuter[i];
      const px = x + rest.x;
      const py = y + rest.y;
      this.points.push({
        x: px,
        y: py,
        px,
        py,
        invMass: 0.62,
        restX: rest.x,
        restY: rest.y,
        ring: 2
      });
      this.outerIndices.push(1 + this.innerCount + i);
    }

    this.buildConstraints();
    this.initScratch();
    this.tempForces.length = this.points.length;
    for (let i = 0; i < this.tempForces.length; i += 1) {
      this.tempForces[i] = { x: 0, y: 0 };
    }
  }

  step(dt: number, pointers: readonly PointerContact[], worldWidth: number, worldHeight: number): BlobMetrics {
    const fixedDt = clamp(dt, 1 / 240, 1 / 45);
    const center = this.points[0];

    for (let i = 0; i < this.tempForces.length; i += 1) {
      this.tempForces[i].x = 0;
      this.tempForces[i].y = 0;
    }

    for (let i = 0; i < pointers.length; i += 1) {
      this.applyPointer(pointers[i]);
    }

    integrate(this.points, fixedDt, clamp(0.952 + this.softness * 0.012, 0.95, 0.97));

    const substeps = 7;
    for (let iteration = 0; iteration < substeps; iteration += 1) {
      for (let i = 0; i < this.constraints.length; i += 1) {
        solveDistance(this.points, this.constraints[i]);
      }

      this.solveAreaConstraint(this.outerIndices, this.restOuterArea, 0.8);
      this.solveAreaConstraint(this.innerIndices, this.restInnerArea, 0.5);
      this.solveShapeMatching(0.09);
      this.solvePressure(fixedDt);
      this.solveBounds(worldWidth, worldHeight);
      applyCentering(this.points, this.homeX, this.homeY, 0.006);
    }

    const outer = this.outerIndices.map((index) => this.points[index]);
    const outerArea = Math.abs(polygonArea(outer));
    const compression = this.restOuterArea > 0 ? clamp(1 - outerArea / this.restOuterArea, 0, 1) : 0;
    this.compression = compression;
    this.areaRatio = this.restOuterArea > 0 ? outerArea / this.restOuterArea : 1;
    this.jiggle = lerp(this.jiggle, compression, 0.12);

    const centerX = center.x;
    const centerY = center.y;
    return {
      compression,
      areaRatio: this.areaRatio,
      centerX,
      centerY
    };
  }

  private generateProfile(rng: () => number, stageIndex: number): {
    outerCount: number;
    innerCount: number;
    baseRadius: number;
    palette: BlobPalette;
    softness: number;
    pressureBoost: number;
  } {
    const stage = EVOLUTION_STAGES[stageIndex];
    const outerCount = 24 + Math.floor(rng() * 8) * 2;
    const innerCount = outerCount / 2;
    const baseRadius = (78 + rng() * 34) * stage.radiusScale;
    const hue = (stage.hue + Math.floor((rng() - 0.5) * stage.hueSpread)) % 360;
    const palette: BlobPalette = {
      base: `hsl(${(hue + 360) % 360} 82% 64%)`,
      deep: `hsl(${(hue + 18 + 360) % 360} 74% 48%)`,
      light: `hsl(${(hue + 10 + 360) % 360} 100% 84%)`,
      glow: `hsla(${(hue + 6 + 360) % 360} 100% 70% / 0.3)`,
      accent: `hsl(${(hue + 210 + 360) % 360} 76% 60%)`
    };

    this.restOuter.length = 0;
    this.restInner.length = 0;
    for (let i = 0; i < outerCount; i += 1) {
      const angle = (Math.PI * 2 * i) / outerCount;
      const profile = 1 + Math.sin(angle * 3 + rng() * 0.8) * 0.05 + Math.cos(angle * 5 + rng() * 0.7) * 0.03;
      const radius = baseRadius * (1 + rng() * 0.06) * profile;
      this.restOuter.push(fromAngle(angle, radius));
    }
    for (let i = 0; i < innerCount; i += 1) {
      const angle = (Math.PI * 2 * i) / innerCount;
      const profile = 1 + Math.sin(angle * 2 + rng() * 0.7) * 0.04 + Math.cos(angle * 4 + rng() * 0.6) * 0.02;
      const radius = baseRadius * 0.54 * (1 + rng() * 0.04) * profile;
      this.restInner.push(fromAngle(angle, radius));
    }

    return { outerCount, innerCount, baseRadius, palette, softness: stage.softness, pressureBoost: stage.pressureBoost };
  }

  private buildConstraints(): void {
    const spokeStrength = 0.74;
    const ringStrength = 0.65;
    const braceStrength = 0.48;

    for (let i = 0; i < this.innerIndices.length; i += 1) {
      const inner = this.innerIndices[i];
      const outer = this.outerIndices[i * 2];
      const opposite = this.outerIndices[(i * 2 + 1) % this.outerIndices.length];
      const center = 0;

      this.constraints.push({
        a: center,
        b: inner,
        rest: distance(this.points[center], this.points[inner]),
        stiffness: spokeStrength
      });
      this.constraints.push({
        a: inner,
        b: outer,
        rest: distance(this.points[inner], this.points[outer]),
        stiffness: ringStrength
      });
      this.constraints.push({
        a: inner,
        b: opposite,
        rest: distance(this.points[inner], this.points[opposite]),
        stiffness: braceStrength
      });
    }

    for (let i = 0; i < this.innerIndices.length; i += 1) {
      const a = this.innerIndices[i];
      const b = this.innerIndices[wrap(i + 1, this.innerIndices.length)];
      this.constraints.push({
        a,
        b,
        rest: distance(this.points[a], this.points[b]),
        stiffness: 0.52
      });
    }

    for (let i = 0; i < this.outerIndices.length; i += 1) {
      const a = this.outerIndices[i];
      const b = this.outerIndices[wrap(i + 1, this.outerIndices.length)];
      const c = this.outerIndices[wrap(i + 2, this.outerIndices.length)];
      this.constraints.push({
        a,
        b,
        rest: distance(this.points[a], this.points[b]),
        stiffness: 0.54
      });
      this.constraints.push({
        a,
        b: c,
        rest: distance(this.points[a], this.points[c]),
        stiffness: 0.18
      });
    }
  }

  private applyPointer(pointer: PointerContact): void {
    const center = this.points[0];
    const pointerX = pointer.x;
    const pointerY = pointer.y;
    const dx = pointerX - center.x;
    const dy = pointerY - center.y;
    const pointerAngle = Math.atan2(dy, dx);
    const centerToPointer = normalize(dx, dy);
    const radius = this.baseRadius * 1.55;
    const drag = 0.24;
    const pressure = clamp(pointer.pressure, 0.25, 1.2);
    const pull = pressure * 0.42;
    const bulge = pressure * 0.16;
    const deltaX = pointer.x - pointer.prevX;
    const deltaY = pointer.y - pointer.prevY;

    for (let i = 1; i < this.points.length; i += 1) {
      const point = this.points[i];
      const vx = point.x - pointerX;
      const vy = point.y - pointerY;
      const dist = Math.hypot(vx, vy);
      if (dist > radius) {
        continue;
      }

      const falloff = smoothstep(radius, 0, dist);
      const localAngle = Math.atan2(point.y - center.y, point.x - center.x);
      const angleDelta = Math.abs(smallestAngleDifference(localAngle, pointerAngle));
      const angularWeight = clamp(1 - angleDelta / (Math.PI * 0.95), 0, 1);
      const influence = falloff * angularWeight;
      const softnessPush = 0.88 + this.softness * 0.18;
      const inward = pull * influence * softnessPush;
      const outward = bulge * influence * (0.5 + this.softness * 0.12);
      const toCenterX = center.x - point.x;
      const toCenterY = center.y - point.y;
      const toPointerX = pointerX - point.x;
      const toPointerY = pointerY - point.y;
      const towardCenter = normalize(toCenterX, toCenterY);
      const towardPointer = normalize(toPointerX, toPointerY);

      point.x += towardCenter.x * inward + towardPointer.x * outward;
      point.y += towardCenter.y * inward + towardPointer.y * outward;
      point.x += deltaX * drag * influence;
      point.y += deltaY * drag * influence;
      point.px += deltaX * drag * influence * 0.35;
      point.py += deltaY * drag * influence * 0.35;
    }

    center.x += deltaX * 0.05;
    center.y += deltaY * 0.05;
  }

  private solveAreaConstraint(indices: readonly number[], restArea: number, stiffness: number): void {
    if (indices.length < 3 || restArea <= 1e-8) {
      return;
    }
    const scratch = indices === this.outerIndices ? this.currentOuterScratch : this.currentInnerScratch;
    for (let i = 0; i < indices.length; i += 1) {
      const point = this.points[indices[i]];
      scratch[i].x = point.x;
      scratch[i].y = point.y;
    }
    const currentArea = Math.abs(polygonArea(scratch));
    if (currentArea <= 1e-8) {
      return;
    }
    const areaError = (restArea - currentArea) / restArea;
    const center = polygonCentroid(scratch);
    const push = areaError * stiffness * 0.52;
    for (let i = 0; i < indices.length; i += 1) {
      const index = indices[i];
      const point = this.points[index];
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const len = Math.hypot(dx, dy);
      if (len <= 1e-8) {
        continue;
      }
      const factor = push * (1 + point.ring * 0.08) * this.softness;
      point.x += (dx / len) * factor * len * 0.35;
      point.y += (dy / len) * factor * len * 0.35;
    }
  }

  private solveShapeMatching(strength: number): void {
    const dynamicCount = this.points.length - 1;
    if (dynamicCount <= 0) {
      return;
    }

    let currentCenterX = 0;
    let currentCenterY = 0;
    let restCenterX = 0;
    let restCenterY = 0;
    for (let i = 1; i < this.points.length; i += 1) {
      const point = this.points[i];
      currentCenterX += point.x;
      currentCenterY += point.y;
      restCenterX += point.restX;
      restCenterY += point.restY;
    }
    currentCenterX /= dynamicCount;
    currentCenterY /= dynamicCount;
    restCenterX /= dynamicCount;
    restCenterY /= dynamicCount;

    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;
    for (let i = 1; i < this.points.length; i += 1) {
      const point = this.points[i];
      const cx = point.x - currentCenterX;
      const cy = point.y - currentCenterY;
      const rx = point.restX - restCenterX;
      const ry = point.restY - restCenterY;
      a += cx * rx;
      b += cx * ry;
      c += cy * rx;
      d += cy * ry;
    }

    const angle = Math.atan2(c - b, a + d);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.shapeGoal.cos = cos;
    this.shapeGoal.sin = sin;

    for (let i = 1; i < this.points.length; i += 1) {
      const point = this.points[i];
      const localX = point.restX - restCenterX;
      const localY = point.restY - restCenterY;
      const rotated = rotate(localX, localY, cos, sin);
      const goalX = currentCenterX + rotated.x;
      const goalY = currentCenterY + rotated.y;
      point.x += (goalX - point.x) * strength;
      point.y += (goalY - point.y) * strength;
    }

    const center = this.points[0];
    center.x += (currentCenterX - center.x) * strength * 0.25;
    center.y += (currentCenterY - center.y) * strength * 0.25;
  }

  private solvePressure(dt: number): void {
    const outer = this.currentOuterScratch;
    for (let i = 0; i < this.outerIndices.length; i += 1) {
      const point = this.points[this.outerIndices[i]];
      outer[i].x = point.x;
      outer[i].y = point.y;
    }
    const outerArea = Math.abs(polygonArea(outer));
    const compression = this.restOuterArea > 0 ? clamp(1 - outerArea / this.restOuterArea, 0, 1) : 0;
    const pressure = compression * (1.1 + dt * 0.2) * this.pressureBoost;
    if (pressure <= 0) {
      return;
    }

    const center = polygonCentroid(outer);
    for (let i = 0; i < outer.length; i += 1) {
      const point = outer[i];
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const len = Math.hypot(dx, dy);
      if (len <= 1e-8) {
        continue;
      }
      const radial = pressure * 0.05 * (1 + i / outer.length * 0.1);
      point.x += (dx / len) * radial * len * 0.24;
      point.y += (dy / len) * radial * len * 0.24;
    }

    for (let i = 0; i < this.innerIndices.length; i += 1) {
      const point = this.points[this.innerIndices[i]];
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const len = Math.hypot(dx, dy);
      if (len <= 1e-8) {
        continue;
      }
      const radial = pressure * 0.02;
      point.x += (dx / len) * radial * len * 0.14;
      point.y += (dy / len) * radial * len * 0.14;
    }
  }

  private solveBounds(worldWidth: number, worldHeight: number): void {
    const margin = this.baseRadius * 0.9;
    for (let i = 1; i < this.points.length; i += 1) {
      const point = this.points[i];
      if (point.x < margin) {
        point.x = margin;
        point.px = point.x + 1.5;
      } else if (point.x > worldWidth - margin) {
        point.x = worldWidth - margin;
        point.px = point.x - 1.5;
      }
      if (point.y < margin) {
        point.y = margin;
        point.py = point.y + 1.5;
      } else if (point.y > worldHeight - margin) {
        point.y = worldHeight - margin;
        point.py = point.y - 1.5;
      }
    }
  }

  private initScratch(): void {
    this.currentOuterScratch.length = this.outerCount;
    for (let i = 0; i < this.outerCount; i += 1) {
      if (!this.currentOuterScratch[i]) {
        this.currentOuterScratch[i] = { x: 0, y: 0 };
      }
    }
    this.currentInnerScratch.length = this.innerCount;
    for (let i = 0; i < this.innerCount; i += 1) {
      if (!this.currentInnerScratch[i]) {
        this.currentInnerScratch[i] = { x: 0, y: 0 };
      }
    }
  }
}
