<p align="center">
  <a href="https://www.scaleflex.com/en/home">
    <img width="350" src="https://scaleflex.cloudimg.io/v7/plugins/scaleflex/logo.png?vh=b0a502&radius=25&w=700" alt="Scaleflex logo">
  </a>
</p>

<h1 align="center">Scaleflex Image Crop</h1>

<p align="center">
  <strong>An interactive image-crop editor web component — rotation, fine tilt, flip, zoom and shape selection</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@scaleflex/image-crop">
    <img src="https://img.shields.io/npm/v/@scaleflex/image-crop.svg" alt="Release">
  </a>
  <a href="https://bundlephobia.com/package/@scaleflex/image-crop">
    <img src="https://img.shields.io/bundlephobia/minzip/@scaleflex/image-crop.svg" alt="Size">
  </a>
  <a href="https://www.npmjs.com/package/@scaleflex/image-crop">
    <img src="https://img.shields.io/npm/dm/@scaleflex/image-crop.svg" alt="Downloads">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
  <a href="https://www.cloudimage.io/en/home">
    <img src="https://img.shields.io/badge/Powered%20by-Cloudimage-blue" alt="Cloudimage">
  </a>
</p>

<p align="center">
  <a href="https://scaleflex.github.io/image-crop/">View Demo</a> ·
  <a href="https://stackblitz.com/github/scaleflex/image-crop/tree/master/codesandbox/react">React Sandbox</a> ·
  <a href="https://stackblitz.com/github/scaleflex/image-crop/tree/master/codesandbox/vanilla">Vanilla Sandbox</a> ·
  <a href="https://github.com/scaleflex/image-crop/issues">Report Bug</a>
</p>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Variants](#variants)
- [Public Methods](#public-methods)
- [Events](#events)
- [React API](#react-api)
- [Theming](#theming)
- [Types Reference](#types-reference)
- [Browser Support](#browser-support)
- [Release](#release)
- [Claude Code Integration](#claude-code-integration)
- [License](#license)

## Overview

`@scaleflex/image-crop` ships `<sfx-crop>`, a Lit-based custom element that renders a canvas-backed crop editor with rotation, fine tilt (±45°), horizontal/vertical flip, zoom, pan, and a configurable shape palette (free, square, circle, rounded-rect, plus arbitrary `W:H` ratio strings). The same engine is exposed three ways:

- a ready-to-mount custom element (`<sfx-crop>`);
- a React component (`<SfxCrop>`) plus hooks (`useSfxCrop`, `useSfxCropController`);
- a headless `createCropController({ canvas, host, config })` factory that drives a consumer-owned `<canvas>` with zero built-in UI.

## Features

- Two display variants: `classic` (movable / resizable crop frame over the photo) and `fixed` (the editor box *is* the crop frame — the photo is cover-fit and panned underneath, e.g. avatar / phone-style cropping). See [Variants](#variants).
- Rotation in 90° increments and fine tilt slider (-45°…+45°), horizontal flip, pinch / wheel / button zoom, keyboard shortcuts.
- Built-in shape presets (`free`, `square`, `circle`, `rounded-rect`, `16:9`, `4:3`, `3:2`, `5:4`, `2:1`, `9:16`, `3:4`, `2:3`, `4:5`, `1:2`) plus on-the-fly `"W:H"` ratios.
- Optional bleed-margin guides for print workflows.
- Themeable via a single `theme="light|dark"` attribute or fine-grained `--sfx-cr-*` CSS custom properties (~50 tokens).
- Per-icon SVG overrides via the `icons` property.
- Export to `HTMLCanvasElement`, `Blob`, data URL, or a serialisable `TransformParams` object suitable for server-side processing.
- Three packaging entry points so consumers pay for only what they use.

## Requirements

Modern evergreen browsers with Canvas 2D, Pointer Events, ResizeObserver, CSS container queries, and Custom Elements v1. React 18+ for the React entry. Node 18+ recommended for tooling.

## Installation

### npm / yarn / pnpm

```bash
npm install @scaleflex/image-crop
# or
yarn add @scaleflex/image-crop
# or
pnpm add @scaleflex/image-crop
```

### CDN

The official Scaleflex CDN serves a single self-contained bundle that registers
`<sfx-crop>` on load (plain `<script>`, no build step):

```html
<script src="https://cdn.scaleflex.com/image-crop/2.0.2/image-crop.min.js"></script>
```

Or load the ESM build straight from npm via jsDelivr's auto-bundling `+esm`
endpoint (resolves `lit` for the browser):

```html
<script type="module"
        src="https://cdn.jsdelivr.net/npm/@scaleflex/image-crop/dist/define.js/+esm"></script>
```

### Package exports

| Specifier | Purpose |
|---|---|
| `@scaleflex/image-crop`         | Side-effect-free entry. Exports `SfxCropElement`, `createCropController`, `mergeConfig`, `DEFAULT_CONFIG`, and all public types. |
| `@scaleflex/image-crop/define`  | Side-effectful — registers the `<sfx-crop>` custom element. Import once at bootstrap. |
| `@scaleflex/image-crop/react`   | React component `<SfxCrop>`, `useSfxCrop` / `useSfxCropController` hooks, plus re-exports of `createCropController`, `mergeConfig`, `DEFAULT_CONFIG`, and the public types. |

## Quick Start

### Vanilla JS / Web Component

```html
<script type="module">
  import '@scaleflex/image-crop/define';
</script>

<sfx-crop
  src="https://cdn.example.com/photo.jpg"
  crop-shape="16:9"
  theme="light"
  show-bleed-margin
></sfx-crop>

<script type="module">
  const crop = document.querySelector('sfx-crop');
  crop.addEventListener('sfx-crop-ready', () => console.log('ready'));
  crop.addEventListener('sfx-crop-save', (e) => {
    const { blob, dataURL, params } = e.detail;
    // upload `blob` or POST `params` to your backend
  });
</script>
```

### React

```tsx
import { SfxCrop, type SfxCropElement } from '@scaleflex/image-crop/react';
import { useRef } from 'react';

export function Editor() {
  const ref = useRef<SfxCropElement>(null);
  return (
    <SfxCrop
      ref={ref}
      src="https://cdn.example.com/photo.jpg"
      cropShape="square"
      theme="dark"
      onReady={({ element }) => console.log('ready', element)}
      onSave={({ blob, params }) => upload(blob, params)}
    />
  );
}
```

### CDN

```html
<!-- Self-contained bundle from the Scaleflex CDN -->
<script src="https://cdn.scaleflex.com/image-crop/2.0.2/image-crop.min.js"></script>
<sfx-crop src="https://cdn.example.com/photo.jpg" crop-shape="square"></sfx-crop>
```

## Configuration

All options below are exposed as both HTML attributes (kebab-case) and DOM properties (camelCase) on `<sfx-crop>`. Object/array options should be set as DOM properties; primitives can be set either way.

### Attributes / Properties

#### Image & shape

| Attribute / Property | Type | Default | Description |
|---|---|---|---|
| `src`             | `string`                | `''`        | Image URL to load. Setting after mount triggers a re-load. |
| `variant`         | `'classic' \| 'fixed'`  | `'classic'` | Display mode. `classic` = movable/resizable crop frame over the photo. `fixed` = the editor box itself is the crop frame (sized to `crop-shape`), photo cover-fit and panned underneath, toolbar overlaid. Switchable at runtime. See [Variants](#variants). |
| `crop-shape` / `cropShape` | `CropShapeName` | `'16:9'` | Built-in preset or any `"W:H"` ratio string. |
| `available-shapes` / `availableShapes` | `CropShapeName[] \| string` | `['free','square','16:9','4:3','3:2','5:4','2:1','9:16','3:4','2:3','4:5','1:2']` | Restricts the shape palette in the toolbar. JSON-stringified array works as an attribute. `circle` and `rounded-rect` are valid built-ins but omitted from the default — pass them explicitly to enable. |
| `initial-crop` / `initialCrop` | `CropRect \| string \| null` | `null` | Starting crop rect in normalised `[0,1]` image coords. |
| `initial-rotation` / `initialRotation` | `number` | `0`  | Starting fine rotation, degrees. |
| `initial-scale`    / `initialScale`    | `number` | `1`  | Starting zoom level. |

#### Constraints

| Attribute / Property | Type | Default | Description |
|---|---|---|---|
| `min-scale` / `minScale`           | `number` | `0.5` | Minimum zoom level. |
| `max-scale` / `maxScale`           | `number` | `5`   | Maximum zoom level. |
| `min-crop-size` / `minCropSize`    | `number` | `20`  | Minimum crop edge in canvas pixels. |
| `handle-size` / `handleSize`       | `number` | `12`  | Resize-handle radius. |
| `border-radius` / `borderRadius`   | `number` | `20`  | Corner radius for the `rounded-rect` shape. |

#### Theme & colours

| Attribute / Property | Type | Default | Description |
|---|---|---|---|
| `theme`                            | `'light' \| 'dark'`       | `'light'`             | Switches the bundled palette. Override individual tokens via CSS variables. |
| `handle-color` / `handleColor`     | `string`                  | `'#ffffff'`           | Frame handle fill. |
| `overlay-color` / `overlayColor`   | `string`                  | `'rgba(0,0,0,0.55)'`  | Mask covering the area outside the crop. |
| `bleed-margin-color` / `bleedMarginColor` | `string`           | `'rgba(255,0,0,0.5)'` | Print bleed guide colour. |
| `bleed-margin-size` / `bleedMarginSize`   | `number`           | `10`                  | Bleed inset in pixels. |
| `show-bleed-margin` / `showBleedMargin`   | `boolean`          | `false`               | Toggles the print bleed guides. |

> **Print bleed guides.** In print, artwork is printed slightly larger than the
> final size and trimmed at the cut line; the *bleed* is the strip near the edge
> that gets cut off. `show-bleed-margin` draws a dashed **safe-area** rectangle
> inset `bleed-margin-size` pixels from every edge of the crop, so important
> content (faces, text, logos) can be kept clear of the trim. It is a
> **visual guide only** — it is *not* baked into the output: `toCanvas()`,
> `toBlob()`, `toDataURL()`, and the `sfx-crop-save` payload never contain the
> dashed line and the crop is not inset by it.

#### UI toggles

| Attribute / Property | Type | Default | Description |
|---|---|---|---|
| `show-toolbar` / `showToolbar`               | `boolean`                  | `true` | Renders the built-in toolbar. |
| `toolbar-position` / `toolbarPosition`       | `'top' \| 'bottom'`        | `'top'` | Toolbar placement. |
| `show-rotate-button` / `showRotateButton`    | `boolean`                  | `true` | 90° rotate-left button. |
| `show-flip-button` / `showFlipButton`        | `boolean`                  | `true` | Horizontal flip button. |
| `show-rotate-slider` / `showRotateSlider`    | `boolean`                  | `true` | Fine tilt slider (±45°). |
| `show-zoom-slider` / `showZoomSlider`        | `boolean`                  | `true` | Zoom slider. |
| `show-shape-selector` / `showShapeSelector`  | `boolean`                  | `true` | Shape dropdown. |
| `show-grid` / `showGrid`                     | `boolean \| 'interaction'` | `'interaction'` | Rule-of-thirds overlay; `'interaction'` shows it only while dragging. |

#### Output

| Attribute / Property | Type | Default | Description |
|---|---|---|---|
| `output-type` / `outputType`           | `string` | `'image/png'` | MIME type for `toBlob` / `toDataURL`. |
| `output-quality` / `outputQuality`     | `number` | `0.92`        | Quality 0–1 for lossy types. |
| `max-output-width` / `maxOutputWidth`  | `number` | `0`           | `0` = original. |
| `max-output-height` / `maxOutputHeight`| `number` | `0`           | `0` = original. |

#### Behaviour

| Attribute / Property | Type | Default | Description |
|---|---|---|---|
| `keyboard`                          | `boolean` | `true` | Arrow-key nudge / shift-zoom. |
| `pinch-zoom` / `pinchZoom`          | `boolean` | `true` | Two-finger touch zoom. |
| `wheel-zoom` / `wheelZoom`          | `boolean` | `true` | Mouse-wheel zoom. |
| `enable-animations` / `enableAnimations` | `boolean` | `true` | Spring/lerp transitions. |
| `animation-speed` / `animationSpeed`     | `number`  | `1.0`  | Multiplier on the default spring. |
| `icons` (property only)             | `CropIconOverrides` | `{}` | SVG-string slot overrides — see `CropIconOverrides` in `src/core/types.ts`. |

## Variants

The `variant` attribute switches how the crop is presented. Both share the same engine, tools, events, and export.

### `classic` (default)

The photo fills the editor at its own aspect ratio and a **movable / resizable crop frame** floats over it (resize handles + a move-handle), with the area outside the frame dimmed by `overlay-color`. Drag inside the frame to pan the photo, drag the handles to resize.

### `fixed`

The **editor box itself is the crop frame**, sized to the `crop-shape` aspect and centred (portrait, landscape, square, circle, rounded-rect — anything). The photo is **cover-fit** and panned/zoomed/rotated underneath; there are no resize handles, and the toolbar is overlaid on the frame. This is the avatar- / phone-style "fixed window, moving photo" pattern.

```html
<sfx-crop src="/photo.jpg" variant="fixed" crop-shape="1:1"></sfx-crop>
```

### Cover guarantee

In **both** variants the photo is constrained to always fully cover the crop frame — zoom and pan are clamped (and the minimum zoom is raised) so the exported image never contains transparent gaps. The one exception is a 90°/270° turn in `classic`, which intentionally letterboxes the rotated photo to fit the frame.

### Built-in "Done" button

The toolbar renders a primary **Done** button pinned to the right edge. It calls [`save()`](#public-methods) — building `blob` + `dataURL` + `params` and dispatching `sfx-crop-save` — so a host app can commit the crop without wiring its own button. Handle `sfx-crop-save` to upload / persist / close. (Hide the whole toolbar with `show-toolbar="false"` if you prefer to drive everything imperatively.)

## Public Methods

All methods live on the `<sfx-crop>` element instance. They throw if invoked before `sfx-crop-ready` fires.

| Method | Returns | Description |
|---|---|---|
| `loadImage(src)`                    | `Promise<void>`         | Load (or re-load) an image URL. |
| `getTransformState()`               | `TransformState`        | Snapshot of rotation, flip, scale, pan, crop. |
| `getCropRect()`                     | `CropRect`              | Current crop in normalised `[0,1]` coords. |
| `setCropRect(rect)`                 | `void`                  | Programmatic crop update. |
| `setCropShape(shape)`               | `void`                  | Built-in preset or `"W:H"` ratio. |
| `rotateLeft()`                      | `void`                  | 90° counter-clockwise. |
| `flipHorizontal()`                  | `void`                  | Mirror around vertical axis. |
| `setRotation(deg)`                  | `void`                  | Fine tilt -45…+45. |
| `setScale(scale)`                   | `void`                  | Zoom level (clamped to `min`/`max-scale`). |
| `reset()`                           | `void`                  | Restore initial state. |
| `toCanvas()`                        | `HTMLCanvasElement`     | Render the current crop into a fresh canvas. |
| `toBlob(type?, quality?)`           | `Promise<Blob>`         | Like `HTMLCanvasElement.toBlob` for the cropped output. |
| `toDataURL(type?, quality?)`        | `string`                | Like `HTMLCanvasElement.toDataURL`. |
| `toTransformParams()`               | `TransformParams`       | Serialisable description of the transform — pass to a server-side resizer. |
| `save(type?, quality?)`             | `Promise<void>`         | Convenience: builds blob + dataURL + params and dispatches `sfx-crop-save`. |
| `cancel()`                          | `void`                  | Dispatches `sfx-crop-cancel`. |

## Events

All events bubble and cross shadow boundaries (`bubbles: true, composed: true`).

| Event | `detail` | Fires on |
|---|---|---|
| `sfx-crop-ready`        | `{ element: SfxCropElement }`              | Controller initialised. |
| `sfx-crop-image-load`   | `{ image: HTMLImageElement }`              | Image decoded and rendered. |
| `sfx-crop-change`       | `TransformState`                           | Any transform mutation. |
| `sfx-crop-crop-change`  | `CropRect`                                 | Crop rect changed. |
| `sfx-crop-save`         | `{ blob, dataURL, params }`                | `.save()` resolved. |
| `sfx-crop-cancel`       | `undefined`                                | `.cancel()` invoked. |
| `sfx-crop-error`        | `{ error: Error }`                         | Image-load or export error. |

## React API

### `<SfxCrop>` component

`forwardRef` component that mirrors the element's attributes as camelCase props and bridges every `sfx-crop-*` event into a matching `on*` callback.

```tsx
import { SfxCrop } from '@scaleflex/image-crop/react';

<SfxCrop
  src="..."
  cropShape="circle"
  theme="dark"
  showBleedMargin
  availableShapes={['free', 'square', 'circle', '16:9']}
  onReady={({ element }) => {}}
  onImageLoad={({ image }) => {}}
  onChange={(state) => {}}
  onCropChange={(crop) => {}}
  onSave={({ blob, dataURL, params }) => {}}
  onCancel={() => {}}
  onError={({ error }) => {}}
/>
```

The `ref` resolves to the underlying `SfxCropElement`, so every imperative method above is callable directly.

### `useSfxCrop()` hook

For consumers who prefer to render `<sfx-crop>` themselves and pull stable callables off a hook:

```tsx
import { useSfxCrop } from '@scaleflex/image-crop/react';

const { ref, ready, save, reset, toBlob, getTransformState } = useSfxCrop();

return <sfx-crop ref={ref} src="..." />;
```

`ready` flips to `true` after `sfx-crop-ready`. All callables are no-ops before then.

### `useSfxCropController()` hook (headless)

Drives the same controller against a consumer-owned `<canvas>`. Use this when the built-in toolbar isn't a fit and you need to render every UI affordance yourself. See `CropControllerState`, `CropControllerActions`, and `CropControllerApi` in `src/react/use-sfx-crop-controller.ts`.

## Theming

### Brand colour

The fastest way to recolour the editor is to override one variable on the host:

```html
<sfx-crop style="--sfx-cr-primary:#ff3366"></sfx-crop>
```

### CSS Custom Properties

Every visual surface is keyed off `--sfx-cr-*` tokens. The full list (see `src/styles/shared.css.ts` for the canonical defaults):

#### Colours

`--sfx-cr-primary`, `--sfx-cr-primary-hover`, `--sfx-cr-primary-mid`, `--sfx-cr-primary-bg`, `--sfx-cr-primary-glow`, `--sfx-cr-success`, `--sfx-cr-error`, `--sfx-cr-text`, `--sfx-cr-text-secondary`, `--sfx-cr-text-muted`, `--sfx-cr-border`, `--sfx-cr-border-light`, `--sfx-cr-bg`, `--sfx-cr-surface`, `--sfx-cr-canvas-bg`.

#### Canvas & frame

`--sfx-cr-overlay-color`, `--sfx-cr-frame-color`, `--sfx-cr-frame-shadow`, `--sfx-cr-handle-fill`, `--sfx-cr-handle-stroke`, `--sfx-cr-ruler-ink`, `--sfx-cr-ruler-halo`, `--sfx-cr-ring`, `--sfx-cr-shadow`.

`--sfx-cr-ruler-ink` and `--sfx-cr-ruler-halo` colour the fine-tilt ruler (ticks, centre indicator, degree readout). The ruler floats directly over the photo, whose brightness is unknown, so it can't track the theme: the ink defaults to a near-white core and the halo to a dark glow wrapped around it, so the white core reads over dark images while the halo reads over bright ones (the trick subtitles use). Override both together if you want a different ink/halo pairing.

#### Toolbar & controls

`--sfx-cr-toolbar-bg`, `--sfx-cr-toolbar-color`, `--sfx-cr-toolbar-border`, `--sfx-cr-toolbar-shadow`, `--sfx-cr-btn-size`, `--sfx-cr-btn-radius`, `--sfx-cr-btn-hover-bg`, `--sfx-cr-btn-active-bg`, `--sfx-cr-separator-color`, `--sfx-cr-slider-track`, `--sfx-cr-slider-fill`, `--sfx-cr-slider-thumb`, `--sfx-cr-dropdown-bg`, `--sfx-cr-dropdown-hover`, `--sfx-cr-dropdown-shadow`, `--sfx-cr-zoom-bar-bg`.

#### Typography & radius

`--sfx-cr-font`, `--sfx-cr-radius`, `--sfx-cr-card-shadow`, `--sfx-cr-transition`.

A `[theme="dark"]` selector on the host re-binds the same variables to the dark palette — no other configuration needed.

### Shadow parts

Style internal regions from light DOM:

```css
sfx-crop::part(toolbar) { /* ... */ }
sfx-crop::part(canvas-host) { /* ... */ }
sfx-crop::part(loading) { /* ... */ }
sfx-crop::part(error) { /* ... */ }
sfx-crop::part(container) { /* ... */ }
```

## Types Reference

All types live in `src/core/types.ts` and are re-exported from both `@scaleflex/image-crop` and `@scaleflex/image-crop/react`.

- `CropShapeName` — `'free' | 'square' | 'circle' | 'rounded-rect' | '16:9' | …` plus any `"W:H"` string.
- `CropRect` — `{ x, y, width, height }` in normalised `[0,1]` image coordinates.
- `TransformState` — full runtime state (`quarterTurns`, `rotation`, `flipH`, `flipV`, `scale`, `panX/Y`, `cropRect`, `rotationPivot?`).
- `TransformParams` — serialisable export shape (`rotation`, `flipH`, `flipV`, `scale`, `crop` in original-image pixels, `outputWidth`, `outputHeight`).
- `CropIconOverrides` — per-slot SVG-string overrides for toolbar icons.
- `SfxCropConfig` — the internal config shape consumed by `createCropController`. Element attributes mirror this 1:1.

## Browser Support

Latest two versions of Chrome, Firefox, Safari, and Edge. Requires Custom Elements v1, Canvas 2D, Pointer Events, ResizeObserver, and CSS container queries. No IE11 support.

## Release

See [`CHANGELOG.md`](./CHANGELOG.md) for version history. The project follows [Semantic Versioning](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/) format. The full technical specification lives in [`SPECIFICATION.md`](./SPECIFICATION.md).

### npm scripts

| Script | Purpose |
|---|---|
| `npm run dev`           | Vite dev server for the demo SPA at `http://localhost:5173`. |
| `npm run build`         | Build the bundle and the React wrapper. |
| `npm run build:bundle`  | Web-component bundle only (`dist/`). |
| `npm run build:react`   | React wrapper only (`dist/react/`). |
| `npm run build:demo`    | Production demo site. |
| `npm run typecheck`     | `tsc --noEmit`. |
| `npm test`              | Vitest run. |
| `npm run test:watch`    | Vitest watch. |
| `npm run test:coverage` | Vitest with coverage. |
| `npm run lint`          | ESLint over `src/` and `tests/`. |

## Claude Code Integration

This repository ships rules and prompts that make [Claude Code](https://claude.ai/code) productive on the codebase out of the box.

### Option 1: Project-level (recommended)

Drop a `CLAUDE.md` at the repo root describing the project conventions, then add project-scoped rules under `.claude/` (gitignored). Anyone with Claude Code installed picks them up automatically when they `cd` into the repo.

### Option 2: Global (personal)

Add personal rules at `~/.claude/CLAUDE.md` so they apply across every project you open.

### Usage

Once configured, run Claude Code from the repo root:

```bash
claude
```

Then ask things like *"add a `setFlipVertical()` public method"* or *"explain how the controller settles after a 90° rotation"* and Claude will follow the project's conventions.

## License

[MIT](./LICENSE) © 2026 Scaleflex
