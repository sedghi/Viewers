import { getEnabledElements } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';

export type PointerSample = {
  viewportId: string;
  canvasPoint: Types.Point2;
  worldPoint: Types.Point3;
  at: number;
};

let last: PointerSample | null = null;
let started = false;

/** Remembers the last viewport position the mouse hovered, so voice commands can say "here". */
export function startPointerTracking(): void {
  if (started || typeof document === 'undefined') {
    return;
  }
  started = true;
  document.addEventListener(
    'mousemove',
    event => {
      for (const enabled of getEnabledElements()) {
        const canvas = enabled.viewport?.canvas;
        if (!canvas) {
          continue;
        }
        const rect = canvas.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          continue;
        }
        const canvasPoint: Types.Point2 = [event.clientX - rect.left, event.clientY - rect.top];
        try {
          last = {
            viewportId: enabled.viewportId,
            canvasPoint,
            worldPoint: enabled.viewport.canvasToWorld(canvasPoint),
            at: Date.now(),
          };
        } catch {
          // Viewport not ready for coordinate conversion yet.
        }
        return;
      }
    },
    { passive: true }
  );
}

export function getLastPointer(): PointerSample | null {
  return last;
}
