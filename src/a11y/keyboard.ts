export interface KeyboardCallbacks {
  onRotateLeft(): void;
  onFlipH(): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onResetZoom(): void;
  onMoveCrop(dx: number, dy: number): void;
  onRotateFine(delta: number): void;
}

export interface KeyboardHandle {
  destroy(): void;
}

export function setupKeyboard(
  container: HTMLElement,
  callbacks: KeyboardCallbacks,
): KeyboardHandle {
  function onKeyDown(e: KeyboardEvent): void {
    // Only handle when focus lives inside the editor. `document.activeElement`
    // returns the shadow host when focus is inside a shadow root, which
    // breaks nested-shadow scenarios — `composedPath()` walks through every
    // ShadowRoot boundary so the check works no matter how deeply the
    // element is embedded.
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    const focusInside =
      path.includes(container) ||
      container.contains(document.activeElement) ||
      document.activeElement === container;
    if (!focusInside) return;

    // Don't intercept if modifier keys are held (except shift)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const step = e.shiftKey ? 0.01 : 0.005; // Normalized step for crop movement

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        callbacks.onMoveCrop(-step, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        callbacks.onMoveCrop(step, 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        callbacks.onMoveCrop(0, -step);
        break;
      case 'ArrowDown':
        e.preventDefault();
        callbacks.onMoveCrop(0, step);
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        callbacks.onRotateLeft();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        callbacks.onFlipH();
        break;
      case '+':
      case '=':
        e.preventDefault();
        callbacks.onZoomIn();
        break;
      case '-':
      case '_':
        e.preventDefault();
        callbacks.onZoomOut();
        break;
      case '0':
        e.preventDefault();
        callbacks.onResetZoom();
        break;
      case '[':
        e.preventDefault();
        callbacks.onRotateFine(-1);
        break;
      case ']':
        e.preventDefault();
        callbacks.onRotateFine(1);
        break;
    }
  }

  container.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      container.removeEventListener('keydown', onKeyDown);
    },
  };
}
