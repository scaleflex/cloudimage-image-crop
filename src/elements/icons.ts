// SVG icons as inline strings (24×24 viewBox, stroke-based).
//
// INVARIANT: these strings are injected into element innerHTML without
// escaping — they MUST stay as static, maintainer-authored content. Never
// concatenate user input, attribute values, or template variables into
// anything exported from this file.

import type { CropIconOverrides } from '../core/types';

// Lucide `rotate-ccw-square` — square with a ccw arrow curling onto it.
export const ICON_ROTATE_LEFT = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V7a2 2 0 0 0-2-2h-6"/><path d="m15 8-3-3 3-3"/><path d="M4 14a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2Z"/></svg>';

// Lucide `flip-horizontal` — two mirrored panels with dashed central axis.
export const ICON_FLIP_H = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M12 20v2"/><path d="M12 15v2"/><path d="M12 10v2"/><path d="M12 5v2"/></svg>';

// Lucide `crop` — classic crop-tool corner hooks.
export const ICON_CROP_CUSTOM = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>';

// Lucide `monitor` / `smartphone` — orientation toggles at the top of the
// shape dropdown. Reads as "landscape device" vs. "portrait device".
export const ICON_ORIENT_LANDSCAPE = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>';
export const ICON_ORIENT_PORTRAIT = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>';

export const ICON_CROP_CIRCLE = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>';

// Rounded square — Lucide style, radius 5 (between `square` rx=2 and a full
// pill) to read as "rounded-rect" crop preset.
export const ICON_CROP_ROUNDED_RECT = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="5"/></svg>';

// Lucide `ratio` — two overlapping rectangles (portrait + landscape). Used on
// the shape-selector trigger as a generic "aspect / crop shape" indicator so
// the icon stays stable regardless of which specific ratio is active.
export const ICON_CROP_ASPECT = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="12" height="20" x="6" y="2" rx="2"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>';

// Lucide `chevron-down`.
export const ICON_CHEVRON_DOWN = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

// Fine-tilt trigger — custom "straighten" icon authored in Lucide style: a
// horizon line near the bottom + a large rectangle leaning slightly above it.
// Reads as "tilt this image within ±45° (manual angle adjustment)".
export const ICON_TILT = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"/><rect x="3" y="6" width="18" height="14" rx="2" transform="rotate(-10 12 13)"/></svg>';

// Lucide `zoom-in` — magnifier with "+".
export const ICON_ZOOM_IN = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>';

// Lucide `zoom-out` — magnifier with "−".
export const ICON_ZOOM_OUT = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>';

// Lucide `zoom-in` — magnifier with "+". Used on the collapsed zoom trigger
// in the toolbar to signal "open zoom control".
export const ICON_LOUPE = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>';

// Lucide `rotate-ccw` — counter-clockwise reset arrow.
export const ICON_RESET = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';

/**
 * Map from slot name to built-in SVG. {@link resolveIcon} consults a
 * consumer-supplied `CropIconOverrides` first, falling through to this table.
 * Any additions here must also be added to `CropIconOverrides` in `types.ts`.
 */
const DEFAULT_ICONS: Record<keyof CropIconOverrides, string> = {
  rotateLeft:      '', // populated below via a second block to avoid TDZ on const order
  flipHorizontal:  '',
  tilt:            '',
  loupe:           '',
  zoomIn:          '',
  zoomOut:         '',
  cropAspect:      '',
  cropCustom:      '',
  cropCircle:      '',
  cropRoundedRect: '',
  orientLandscape: '',
  orientPortrait:  '',
  chevronDown:     '',
  reset:           '',
};
// Assigned after every ICON_* const in this module has been initialized.
DEFAULT_ICONS.rotateLeft      = ICON_ROTATE_LEFT;
DEFAULT_ICONS.flipHorizontal  = ICON_FLIP_H;
DEFAULT_ICONS.tilt            = ICON_TILT;
DEFAULT_ICONS.loupe           = ICON_LOUPE;
DEFAULT_ICONS.zoomIn          = ICON_ZOOM_IN;
DEFAULT_ICONS.zoomOut         = ICON_ZOOM_OUT;
DEFAULT_ICONS.cropAspect      = ICON_CROP_ASPECT;
DEFAULT_ICONS.cropCustom      = ICON_CROP_CUSTOM;
DEFAULT_ICONS.cropCircle      = ICON_CROP_CIRCLE;
DEFAULT_ICONS.cropRoundedRect = ICON_CROP_ROUNDED_RECT;
DEFAULT_ICONS.orientLandscape = ICON_ORIENT_LANDSCAPE;
DEFAULT_ICONS.orientPortrait  = ICON_ORIENT_PORTRAIT;
DEFAULT_ICONS.chevronDown     = ICON_CHEVRON_DOWN;
DEFAULT_ICONS.reset           = ICON_RESET;

/**
 * Resolve an icon slot. Returns the consumer's override when present, else
 * the library's default SVG. `overrides` is typically the `icons` property
 * prop passed down from `<cloudimage-crop>` to each toolbar / popover sub-element.
 */
export function resolveIcon(
  key: keyof CropIconOverrides,
  overrides?: CropIconOverrides,
): string {
  const custom = overrides?.[key];
  return typeof custom === 'string' && custom.length > 0 ? custom : DEFAULT_ICONS[key];
}
