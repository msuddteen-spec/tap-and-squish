import type { SquishyBlob } from "./simulation";
import { clamp } from "./math";

export interface FrameStats {
  score: number;
  squishes: number;
  combo: number;
  comboTime: number;
  comboWindow: number;
  flash: number;
  highScore: number;
}

interface SplinePoint {
  x: number;
  y: number;
}

function drawSpline(ctx: CanvasRenderingContext2D, points: readonly SplinePoint[]): void {
  const count = points.length;
  if (count < 2) {
    return;
  }
  const get = (index: number): SplinePoint => points[(index + count) % count];
  const first = get(0);
  ctx.moveTo(first.x, first.y);
  for (let i = 0; i < count; i += 1) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
  }
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blob: SquishyBlob,
  stats: FrameStats
): void {
  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#08111f");
  background.addColorStop(0.55, "#101a2d");
  background.addColorStop(1, "#06101a");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const floor = ctx.createLinearGradient(0, height * 0.72, 0, height);
  floor.addColorStop(0, "rgba(69, 98, 140, 0)");
  floor.addColorStop(1, "rgba(18, 30, 42, 0.55)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, height * 0.72, width, height * 0.28);

  const outerPoints: SplinePoint[] = [];
  const innerPoints: SplinePoint[] = [];
  for (let i = 0; i < blob.outerIndices.length; i += 1) {
    const point = blob.points[blob.outerIndices[i]];
    outerPoints.push({ x: point.x, y: point.y });
  }
  for (let i = 0; i < blob.innerIndices.length; i += 1) {
    const point = blob.points[blob.innerIndices[i]];
    innerPoints.push({ x: point.x, y: point.y });
  }

  const outerCenterX = blob.points[0].x;
  const outerCenterY = blob.points[0].y;
  const blobScale = clamp(blob.areaRatio, 0.62, 1.16);
  const shadowAlpha = 0.34 + (1 - blobScale) * 0.14;

  ctx.save();
  ctx.shadowColor = `rgba(0, 0, 0, ${shadowAlpha})`;
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 16;

  ctx.beginPath();
  drawSpline(ctx, outerPoints);
  ctx.closePath();

  const fill = ctx.createRadialGradient(
    outerCenterX - blob.baseRadius * 0.36,
    outerCenterY - blob.baseRadius * 0.42,
    blob.baseRadius * 0.16,
    outerCenterX,
    outerCenterY,
    blob.baseRadius * 1.25
  );
  fill.addColorStop(0, blob.palette.light);
  fill.addColorStop(0.34, blob.palette.base);
  fill.addColorStop(0.72, blob.palette.deep);
  fill.addColorStop(1, "rgba(8, 10, 18, 0.06)");
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.lineWidth = Math.max(1.4, blob.baseRadius * 0.018);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.stroke();

  const innerGlow = ctx.createRadialGradient(
    outerCenterX - blob.baseRadius * 0.08,
    outerCenterY - blob.baseRadius * 0.1,
    blob.baseRadius * 0.08,
    outerCenterX,
    outerCenterY,
    blob.baseRadius * 0.92
  );
  innerGlow.addColorStop(0, "rgba(255, 255, 255, 0.28)");
  innerGlow.addColorStop(0.48, "rgba(255, 255, 255, 0.06)");
  innerGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = innerGlow;
  ctx.fill();

  ctx.beginPath();
  drawSpline(ctx, innerPoints);
  ctx.closePath();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = Math.max(0.8, blob.baseRadius * 0.01);
  ctx.stroke();
  ctx.restore();

  const rim = ctx.createLinearGradient(
    outerCenterX - blob.baseRadius * 0.5,
    outerCenterY - blob.baseRadius * 0.65,
    outerCenterX + blob.baseRadius * 0.35,
    outerCenterY + blob.baseRadius * 0.45
  );
  rim.addColorStop(0, blob.palette.glow);
  rim.addColorStop(0.5, "rgba(255, 255, 255, 0)");
  rim.addColorStop(1, blob.palette.accent);
  ctx.fillStyle = rim;
  ctx.beginPath();
  drawSpline(ctx, outerPoints);
  ctx.closePath();
  ctx.globalCompositeOperation = "screen";
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  const titleX = 18;
  const titleY = 28;
  ctx.fillStyle = "rgba(236, 243, 255, 0.92)";
  ctx.font = "700 18px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillText("Tap & Squish", titleX, titleY);

  ctx.font = "600 13px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(208, 221, 240, 0.88)";
  ctx.fillText(`Score ${stats.score.toLocaleString()}`, titleX, 52);
  ctx.fillText(`Squishes ${stats.squishes}`, titleX + 118, 52);
  ctx.fillText(`Combo x${Math.max(1, stats.combo)}`, titleX + 240, 52);

  const comboWidth = 160;
  const comboProgress = clamp(stats.comboTime / stats.comboWindow, 0, 1);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(titleX, 60, comboWidth, 6);
  ctx.fillStyle = blob.palette.light;
  ctx.fillRect(titleX, 60, comboWidth * comboProgress, 6);

  ctx.font = "500 12px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(188, 199, 223, 0.84)";
  ctx.fillText("Press, drag, and pinch with one or more fingers.", titleX, height - 18);

  if (stats.flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${stats.flash * 0.08})`;
    ctx.fillRect(0, 0, width, height);
  }
}
