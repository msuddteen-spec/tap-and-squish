import { centroid, clamp } from "./math";
import type { SoftBody } from "./softbody";

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

function catmullRomToBezier(
  ctx: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[]
): void {
  const count = points.length;
  if (count < 2) {
    return;
  }

  const get = (index: number) => points[(index + count) % count];
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

export function renderSoftBody({ ctx, width, height }: RenderContext, body: SoftBody): void {
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#1b1b1b");
  bg.addColorStop(1, "#111111");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const outer = body.outer.map((node) => ({
    x: node.x,
    y: node.y
  }));
  const inner = body.inner.map((node) => ({
    x: node.x,
    y: node.y
  }));

  const center = centroid(outer);
  const squish = clamp(body.compression, 0, 1);
  const radius = Math.max(body.avgOuterRadius * 1.05, 1);

  ctx.save();
  ctx.translate(0, 0);

  ctx.beginPath();
  catmullRomToBezier(ctx, outer);
  ctx.closePath();

  const fill = ctx.createRadialGradient(
    center.x - radius * 0.2,
    center.y - radius * 0.35,
    radius * 0.2,
    center.x,
    center.y,
    radius * 1.2
  );
  fill.addColorStop(0, `rgba(255, 232, 200, ${0.98 - squish * 0.06})`);
  fill.addColorStop(0.55, `rgba(230, 179, 116, ${0.96 - squish * 0.04})`);
  fill.addColorStop(1, `rgba(165, 103, 35, ${0.96})`);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(92, 51, 16, 0.38)";
  ctx.stroke();

  ctx.beginPath();
  catmullRomToBezier(ctx, inner);
  ctx.closePath();
  ctx.strokeStyle = "rgba(255, 242, 219, 0.12)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  const highlight = ctx.createRadialGradient(
    center.x - radius * 0.3,
    center.y - radius * 0.45,
    radius * 0.1,
    center.x - radius * 0.1,
    center.y - radius * 0.2,
    radius * 0.9
  );
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.24)");
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = highlight;
  ctx.fill();

  ctx.restore();
}
