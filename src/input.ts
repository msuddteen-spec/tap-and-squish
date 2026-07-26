export interface PointerContact {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  pressure: number;
  peakCompression: number;
}

export interface ReleasedPointer extends PointerContact {
  lifetime: number;
}

export class InputManager {
  readonly active = new Map<number, PointerContact>();
  readonly released: ReleasedPointer[] = [];

  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.style.touchAction = "none";
    this.bind();
  }

  clearReleased(): void {
    this.released.length = 0;
  }

  private bind(): void {
    const toLocal = (event: PointerEvent): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
        y: (event.clientY - rect.top) * (this.canvas.height / rect.height)
      };
    };

    this.canvas.addEventListener("pointerdown", (event) => {
      this.canvas.setPointerCapture(event.pointerId);
      const local = toLocal(event);
      this.active.set(event.pointerId, {
        id: event.pointerId,
        x: local.x,
        y: local.y,
        prevX: local.x,
        prevY: local.y,
        pressure: event.pressure > 0 ? event.pressure : 0.5,
        peakCompression: 0
      });
    });

    this.canvas.addEventListener("pointermove", (event) => {
      const contact = this.active.get(event.pointerId);
      if (!contact) {
        return;
      }
      const local = toLocal(event);
      contact.prevX = contact.x;
      contact.prevY = contact.y;
      contact.x = local.x;
      contact.y = local.y;
      contact.pressure = event.pressure > 0 ? event.pressure : contact.pressure;
    });

    const release = (event: PointerEvent): void => {
      const contact = this.active.get(event.pointerId);
      if (!contact) {
        return;
      }
      const snapshot: ReleasedPointer = {
        ...contact,
        lifetime: performance.now()
      };
      this.released.push(snapshot);
      this.active.delete(event.pointerId);
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
    };

    this.canvas.addEventListener("pointerup", release);
    this.canvas.addEventListener("pointercancel", release);
    this.canvas.addEventListener("lostpointercapture", release);
  }
}
