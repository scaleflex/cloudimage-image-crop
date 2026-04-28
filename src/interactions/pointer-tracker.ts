export interface PointerInfo {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  pressure: number;
  pointerType: 'mouse' | 'touch' | 'pen';
  shiftKey: boolean;
  altKey: boolean;
}

export interface PinchEvent {
  centerX: number;
  centerY: number;
  scale: number;
  distance: number;
}

export interface PointerTrackerCallbacks {
  onPointerDown(pointer: PointerInfo, pointers: PointerInfo[]): void;
  onPointerMove(pointer: PointerInfo, pointers: PointerInfo[]): void;
  onPointerUp(pointer: PointerInfo, pointers: PointerInfo[]): void;
  onHover?(pointer: PointerInfo): void;
  onPinch?(e: PinchEvent): void;
  onWheel?(e: WheelEvent): void;
}

export interface PointerTrackerHandle {
  destroy(): void;
}

export function createPointerTracker(
  element: HTMLElement,
  callbacks: PointerTrackerCallbacks,
): PointerTrackerHandle {
  const activePointers = new Map<number, PointerInfo>();
  let pinchInitialDist = 0;
  let pinchActive = false;

  function normalizePointerType(t: string): 'mouse' | 'touch' | 'pen' {
    return t === 'touch' || t === 'pen' ? t : 'mouse';
  }

  function getPointerPos(e: PointerEvent): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function getPointerList(): PointerInfo[] {
    return [...activePointers.values()];
  }

  function onPointerDown(e: PointerEvent): void {
    // Only track primary button (left click) for mouse
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    try {
      element.setPointerCapture(e.pointerId);
    } catch {
      // Safari / rare WebKit edge cases throw InvalidPointerId when the
      // pointer has already been released by the time the listener fires;
      // drop the capture silently and continue tracking logically.
    }
    const pos = getPointerPos(e);
    const info: PointerInfo = {
      id: e.pointerId,
      x: pos.x,
      y: pos.y,
      startX: pos.x,
      startY: pos.y,
      pressure: e.pressure,
      pointerType: normalizePointerType(e.pointerType),
      shiftKey: e.shiftKey,
      altKey: e.altKey,
    };
    activePointers.set(e.pointerId, info);
    callbacks.onPointerDown(info, getPointerList());
  }

  function onPointerMove(e: PointerEvent): void {
    const existing = activePointers.get(e.pointerId);
    if (!existing) {
      // No button pressed — fire hover callback for cursor updates
      if (callbacks.onHover) {
        const pos = getPointerPos(e);
        callbacks.onHover({
          id: e.pointerId,
          x: pos.x,
          y: pos.y,
          startX: pos.x,
          startY: pos.y,
          pressure: 0,
          pointerType: normalizePointerType(e.pointerType),
          shiftKey: e.shiftKey,
          altKey: e.altKey,
        });
      }
      return;
    }

    const pos = getPointerPos(e);
    existing.x = pos.x;
    existing.y = pos.y;
    existing.pressure = e.pressure;
    existing.shiftKey = e.shiftKey;
    existing.altKey = e.altKey;

    const pointerList = getPointerList();
    callbacks.onPointerMove(existing, pointerList);

    // Detect pinch (2 active pointers)
    if (pointerList.length === 2 && callbacks.onPinch) {
      const [a, b] = pointerList;
      const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
      if (!pinchActive && dist > 10) {
        pinchInitialDist = dist;
        pinchActive = true;
      }
      if (pinchActive) {
        callbacks.onPinch({
          centerX: (a.x + b.x) / 2,
          centerY: (a.y + b.y) / 2,
          scale: dist / pinchInitialDist,
          distance: dist,
        });
      }
    }
  }

  function onPointerUp(e: PointerEvent): void {
    const existing = activePointers.get(e.pointerId);
    if (!existing) return;

    activePointers.delete(e.pointerId);
    try {
      element.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if already released
    }

    if (getPointerList().length < 2) {
      pinchActive = false;
      pinchInitialDist = 0;
    }

    callbacks.onPointerUp(existing, getPointerList());
  }

  function onWheel(e: WheelEvent): void {
    if (callbacks.onWheel) {
      callbacks.onWheel(e);
    }
  }

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerUp);
  element.addEventListener('wheel', onWheel, { passive: false });

  // Prevent context menu on long press
  const preventContext = (e: Event) => e.preventDefault();
  element.addEventListener('contextmenu', preventContext);

  // Prevent default touch behaviors. Ideally this comes from the owning
  // element's CSS (e.g. `:host { touch-action: none }` on <sfx-crop-canvas>);
  // the imperative write stays as an idempotent safety net so consumers who
  // pass a raw canvas without scoped styles still get correct behavior.
  element.style.touchAction = 'none';

  return {
    destroy() {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('contextmenu', preventContext);
      element.style.touchAction = '';
      activePointers.clear();
    },
  };
}
