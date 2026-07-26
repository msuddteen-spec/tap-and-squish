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
  pendingGachaOpen: boolean;
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

function drawFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, happy: number): void {
  const eyeY = cy - radius * 0.05;
  const eyeOffset = radius * 0.25;
  const eyeSize = Math.max(2.2, radius * 0.055);
  ctx.save();
  ctx.fillStyle = "rgba(55, 35, 48, 0.8)";
  ctx.beginPath();
  ctx.arc(cx - eyeOffset, eyeY, eyeSize, 0, Math.PI * 2);
  ctx.arc(cx + eyeOffset, eyeY, eyeSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(55, 35, 48, 0.78)";
  ctx.lineWidth = Math.max(2, radius * 0.035);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy + radius * 0.08, radius * (0.17 + happy * 0.05), 0.16 * Math.PI, 0.84 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 112, 131, ${0.16 + happy * 0.18})`;
  ctx.beginPath();
  ctx.ellipse(cx - radius * 0.39, cy + radius * 0.12, radius * 0.11, radius * 0.055, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + radius * 0.39, cy + radius * 0.12, radius * 0.11, radius * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStageTrack(ctx: CanvasRenderingContext2D, width: number, y: number, active: number): void {
  const labels = ["DOUGH", "BREAD", "CAKE", "SQUISHY"];
  const left = 26;
  const step = (width - 52) / (labels.length - 1);
  ctx.save();
  ctx.font = "700 9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 173, 184, 0.28)";
  ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - left, y); ctx.stroke();
  labels.forEach((label, i) => {
    const x = left + step * i;
    ctx.fillStyle = i <= active ? "#ff7990" : "#d8c8c2";
    ctx.beginPath(); ctx.arc(x, y, i === active ? 7 : 5, 0, Math.PI * 2); ctx.fill();
    if (i === active) { ctx.fillStyle = "#fff8f4"; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = i <= active ? "#7b5360" : "#b7aaa7";
    ctx.fillText(label, x, y + 22);
  });
  ctx.restore();
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
  bg.addColorStop(0, "#fff8f3");
  bg.addColorStop(0.65, "#fff1ed");
  bg.addColorStop(1, "#f8e5e3");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const topWash = ctx.createRadialGradient(width * 0.5, height * 0.22, 10, width * 0.5, height * 0.22, Math.max(width, height) * 0.8);
  topWash.addColorStop(0, "rgba(255,255,255,0.62)");
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
  ctx.fillStyle = "rgba(188, 105, 115, 0.13)";
  ctx.filter = "blur(12px)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius * 0.93, radius * 0.85, radius * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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

  drawFace(ctx, cx, cy, radius, clamp(blob.jiggle * 1.4, 0, 1));

  const progress = clamp(stats.stageProgress, 0, 1);
  const barWidth = Math.min(310, width - 52);
  const barX = (width - barWidth) * 0.5;
  const barY = cy + radius + 38;

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  roundedRectPath(ctx, barX, barY, barWidth, 12, 6); ctx.fill();
  ctx.fillStyle = "#ff8b9b";
  roundedRectPath(ctx, barX, barY, Math.max(12, barWidth * progress), 12, 6); ctx.fill();
  drawStageTrack(ctx, width, 100, ["Dough", "Bread", "Cake", "Squishy"].indexOf(stats.stageName));

  ctx.fillStyle = "#6d4c56";
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${stats.stageName}  ·  ${Math.round(progress * 100)}%`, width * 0.5, barY + 29);

  ctx.textAlign = "left";
  ctx.fillStyle = "#7b5960"; ctx.font = "800 17px system-ui, sans-serif"; ctx.fillText("Tap & Squish", 22, 38);
  ctx.fillStyle = "#bd9296"; ctx.font = "600 10px system-ui, sans-serif"; ctx.fillText("MAKE IT SMILE", 23, 54);
  ctx.textAlign = "right"; ctx.fillStyle = "#7b5960"; ctx.font = "800 13px system-ui, sans-serif"; ctx.fillText(`✦ ${stats.squishes}`, width - 22, 37);
  ctx.fillStyle = "#b27c86"; ctx.font = "700 10px system-ui, sans-serif"; ctx.fillText("SQUISHES", width - 22, 53);

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
    ctx.fillStyle = "rgba(126, 70, 83, 0.82)";
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1;
    roundedRectPath(ctx, toastX, toastY, toastWidth, 28, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(244, 248, 255, 0.96)";
    ctx.font = "600 12px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(stats.toastText, toastX + 12, toastY + 18);
    ctx.restore();
  }

  ctx.save();
  const cardY = height - 92;
  roundedRectPath(ctx, 18, cardY, width - 36, 58, 18);
  ctx.fillStyle = stats.pendingGachaOpen ? "#ff8a9a" : "rgba(255,255,255,0.66)"; ctx.fill();
  ctx.strokeStyle = stats.pendingGachaOpen ? "rgba(255,255,255,0.55)" : "rgba(177,126,130,0.18)"; ctx.stroke();
  ctx.textAlign = "left"; ctx.fillStyle = stats.pendingGachaOpen ? "#fff8f4" : "#8a656c"; ctx.font = "800 13px system-ui, sans-serif";
  ctx.fillText(stats.pendingGachaOpen ? "✨ Your Squishy is ready!" : "Complete the bar to unlock a Squishy", 36, cardY + 24);
  ctx.font = "600 11px system-ui, sans-serif"; ctx.fillStyle = stats.pendingGachaOpen ? "rgba(255,255,255,0.9)" : "#b08a8e";
  ctx.fillText(stats.pendingGachaOpen ? "Tap to open your surprise" : "Tap the dough gently and watch it grow", 36, cardY + 42);
  ctx.textAlign = "right"; ctx.font = "800 14px system-ui, sans-serif"; ctx.fillText(stats.pendingGachaOpen ? "OPEN ›" : `COLLECTION  ${stats.collectionCount}/${stats.collectionTotal}`, width - 34, cardY + 33);
  ctx.restore();

  if (stats.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${stats.flash * 0.07})`;
    ctx.fillRect(0, 0, width, height);
  }
}
