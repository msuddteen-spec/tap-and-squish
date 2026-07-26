import type { SquishyBlob } from "./simulation";
import { clamp } from "./math";

export interface FrameStats {
  stageName: string;
  stageProgress: number;
  squishes: number;
  gachaTickets: number;
  collectionCount: number;
  collectionTotal: number;
  toastText: string;
  toastTime: number;
  flash: number;
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
  ctx.moveTo(get(0).x, get(0).y);
  for (let i = 0; i < count; i += 1) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
      p2.x,
      p2.y
    );
  }
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fill: string,
  stroke = "rgba(255,255,255,0.08)"
): number {
  ctx.font = "600 12px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  const width = Math.ceil(ctx.measureText(text).width) + 18;
  ctx.save();
  ctx.fillStyle = "rgba(6, 10, 16, 0.44)";
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  roundedRectPath(ctx, x, y, width, 24, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fillText(text, x + 9, y + 16);
  ctx.restore();
  return width;
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blob: SquishyBlob,
  stats: FrameStats
): void {
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#07111d");
  bg.addColorStop(0.45, "#0b1627");
  bg.addColorStop(1, "#050b12");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const topWash = ctx.createRadialGradient(width * 0.5, height * 0.22, 10, width * 0.5, height * 0.22, Math.max(width, height) * 0.8);
  topWash.addColorStop(0, "rgba(255,255,255,0.06)");
  topWash.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = topWash;
  ctx.fillRect(0, 0, width, height);

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

  const cx = blob.points[0].x;
  const cy = blob.points[0].y;
  const radius = blob.baseRadius;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.36)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 18;
  ctx.beginPath();
  drawSpline(ctx, outerPoints);
  ctx.closePath();

  const bodyFill = ctx.createRadialGradient(
    cx - radius * 0.3,
    cy - radius * 0.34,
    radius * 0.1,
    cx,
    cy,
    radius * 1.25
  );
  bodyFill.addColorStop(0, blob.palette.light);
  bodyFill.addColorStop(0.34, blob.palette.base);
  bodyFill.addColorStop(0.76, blob.palette.deep);
  bodyFill.addColorStop(1, "rgba(10, 12, 18, 0.08)");
  ctx.fillStyle = bodyFill;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = Math.max(1.2, radius * 0.017);
  ctx.stroke();

  const shine = ctx.createRadialGradient(
    cx - radius * 0.34,
    cy - radius * 0.44,
    radius * 0.04,
    cx - radius * 0.1,
    cy - radius * 0.18,
    radius * 1.0
  );
  shine.addColorStop(0, "rgba(255,255,255,0.28)");
  shine.addColorStop(0.42, "rgba(255,255,255,0.08)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.fill();

  ctx.beginPath();
  drawSpline(ctx, innerPoints);
  ctx.closePath();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = Math.max(0.8, radius * 0.01);
  ctx.stroke();
  ctx.restore();

  const progress = clamp(stats.stageProgress, 0, 1);
  const barWidth = Math.min(240, width - 36);
  const barX = (width - barWidth) * 0.5;
  const barY = Math.max(18, height - 26);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(barX, barY, barWidth, 6);
  ctx.fillStyle = blob.palette.light;
  ctx.fillRect(barX, barY, barWidth * progress, 6);

  const topY = 16;
  const leftWidth = drawLabel(
    ctx,
    16,
    topY,
    `${stats.stageName} ${Math.round(progress * 100)}%`,
    "rgba(239, 245, 255, 0.96)"
  );
  drawLabel(ctx, 24 + leftWidth, topY, `Squishes ${stats.squishes}`, "rgba(218, 228, 245, 0.9)");

  const rightText = stats.gachaTickets > 0 ? `Gacha ${stats.gachaTickets}` : "Gacha 0";
  ctx.font = "600 12px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  const rightWidth = Math.ceil(ctx.measureText(rightText).width) + 18;
  drawLabel(ctx, width - rightWidth - 16, topY, rightText, "rgba(255, 233, 196, 0.96)", "rgba(255, 218, 153, 0.18)");

  ctx.font = "600 12px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  drawLabel(
    ctx,
    width - 16 - Math.ceil(ctx.measureText(`${stats.collectionCount}/${stats.collectionTotal}`).width) - 30,
    height - 42,
    `Collection ${stats.collectionCount}/${stats.collectionTotal}`,
    "rgba(210, 224, 255, 0.92)",
    "rgba(147, 180, 255, 0.16)"
  );

  if (stats.toastTime > 0 && stats.toastText) {
    const toastWidth = Math.min(width - 32, Math.ceil(ctx.measureText(stats.toastText).width) + 24);
    const toastX = (width - toastWidth) * 0.5;
    const toastY = Math.max(44, height - 92);
    ctx.save();
    ctx.globalAlpha = clamp(stats.toastTime, 0, 1);
    ctx.fillStyle = "rgba(6, 10, 16, 0.55)";
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    roundedRectPath(ctx, toastX, toastY, toastWidth, 28, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(244, 248, 255, 0.96)";
    ctx.font = "600 12px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(stats.toastText, toastX + 12, toastY + 18);
    ctx.restore();
  }

  if (stats.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${stats.flash * 0.07})`;
    ctx.fillRect(0, 0, width, height);
  }
}
