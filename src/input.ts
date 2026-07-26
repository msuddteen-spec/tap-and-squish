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
  readonly pressed: PointerContact[] = [];
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

  clearPressed(): void {
    this.pressed.length = 0;
  }

  private bind(): void {
    const toLocal = (event: PointerEvent): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    };

    this.canvas.addEventListener("pointerdown", (event) => {
      this.canvas.setPointerCapture(event.pointerId);
      const local = toLocal(event);
      const contact: PointerContact = {
        id: event.pointerId,
        x: local.x,
        y: local.y,
        prevX: local.x,
        prevY: local.y,
        pressure: event.pressure > 0 ? event.pressure : 0.5,
        // A very quick tap can begin and end between two physics frames.
        // Start with a small guaranteed squish so it still advances gameplay.
        peakCompression: 0.34
      };
      this.active.set(event.pointerId, contact);
      this.pressed.push({ ...contact });
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
