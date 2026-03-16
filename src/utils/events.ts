type EventHandler = (...args: any[]) => void;

export class EventEmitter {
  private listeners = new Map<string, Set<EventHandler>>();
  private onceMap = new Map<EventHandler, EventHandler>();

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const wrapper = this.onceMap.get(handler);
    if (wrapper) {
      this.listeners.get(event)?.delete(wrapper);
      this.onceMap.delete(handler);
    } else {
      this.listeners.get(event)?.delete(handler);
    }
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    [...handlers].forEach((handler) => {
      try {
        handler(...args);
      } catch (err) {
        console.error(`EventEmitter: handler for "${event}" threw:`, err);
      }
    });
  }

  once(event: string, handler: EventHandler): void {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      this.onceMap.delete(handler);
      handler(...args);
    };
    this.onceMap.set(handler, wrapper);
    this.on(event, wrapper);
  }

  removeAllListeners(): void {
    this.listeners.clear();
    this.onceMap.clear();
  }
}

export function addListener(
  el: EventTarget,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions,
): () => void {
  el.addEventListener(event, handler, options);
  return () => el.removeEventListener(event, handler, options);
}

export type ThrottledFunction<T extends (...args: any[]) => void> = T & { cancel(): void };

export function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): ThrottledFunction<T> {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const throttled = function (this: any, ...args: any[]) {
    const now = Date.now();
    const remaining = ms - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn.apply(this, args);
      }, remaining);
    }
  } as ThrottledFunction<T>;

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttled;
}
