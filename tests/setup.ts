import '@testing-library/jest-dom';

// ResizeObserver polyfill — jsdom ships without it and the crop controller
// observes its layout container on boot. A no-op implementation is enough:
// the observer never fires in tests, which is correct because layout doesn't
// happen in jsdom.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}

// DOMMatrix/DOMPoint polyfill for JSDOM
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    a: number; b: number; c: number; d: number; e: number; f: number;
    constructor(init?: number[]) {
      if (init && init.length >= 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      } else {
        this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      }
    }
    transformPoint(point: { x: number; y: number }) {
      return {
        x: this.a * point.x + this.c * point.y + this.e,
        y: this.b * point.x + this.d * point.y + this.f,
      };
    }
    inverse() {
      const det = this.a * this.d - this.b * this.c;
      if (Math.abs(det) < 1e-10) return new DOMMatrixPolyfill();
      const invDet = 1 / det;
      return new DOMMatrixPolyfill([
        this.d * invDet, -this.b * invDet,
        -this.c * invDet, this.a * invDet,
        (this.c * this.f - this.d * this.e) * invDet,
        (this.b * this.e - this.a * this.f) * invDet,
      ]);
    }
  }
  (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
  (globalThis as any).DOMPoint = class { constructor(public x = 0, public y = 0) {} };
}
