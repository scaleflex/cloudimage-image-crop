import { LitElement } from 'lit';

/**
 * Shared base class for all @cloudimage/image-crop Lit elements.
 *
 * Provides:
 * - Safe guard for double custom-element registration (StrictMode-safe).
 * - A hook point for future cross-cutting concerns (telemetry, theme, etc.).
 *
 * Scaleflex convention — every public element extends this.
 */
export class CloudimageCropBaseElement extends LitElement {}

/**
 * Idempotent custom-element registration — safe under React StrictMode
 * double-mount and repeated `import '.../define.js'` calls.
 */
export function safeDefine(tagName: string, ctor: CustomElementConstructor): void {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get(tagName)) {
    customElements.define(tagName, ctor);
  }
}
