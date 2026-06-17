<p align="center">
  <a href="https://www.scaleflex.com/en/home">
    <img width="350" src="https://scaleflex.cloudimg.io/v7/plugins/scaleflex/logo.png?vh=b0a502&radius=25&w=700" alt="Scaleflex logo">
  </a>
</p>

<h1 align="center">@cloudimage/image-crop</h1>

<p align="center">
  <strong>An interactive image-crop editor web component — rotation, fine tilt, flip, zoom and shape selection</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@cloudimage/image-crop">
    <img src="https://img.shields.io/npm/v/@cloudimage/image-crop.svg" alt="Release">
  </a>
  <a href="https://bundlejs.com/?q=@cloudimage/image-crop">
    <img src="https://img.shields.io/bundlejs/size/@cloudimage/image-crop" alt="Minified + gzipped size">
  </a>
  <a href="https://www.npmjs.com/package/@cloudimage/image-crop">
    <img src="https://img.shields.io/npm/dm/@cloudimage/image-crop.svg" alt="Downloads">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
  <a href="https://www.cloudimage.io/en/home">
    <img src="https://img.shields.io/badge/Powered%20by-Cloudimage-blue" alt="Cloudimage">
  </a>
</p>

<p align="center">
  <a href="https://scaleflex.github.io/cloudimage-image-crop/">View Demo</a> ·
  <a href="https://stackblitz.com/github/scaleflex/cloudimage-image-crop/tree/master/codesandbox/react">React Sandbox</a> ·
  <a href="https://stackblitz.com/github/scaleflex/cloudimage-image-crop/tree/master/codesandbox/vanilla">Vanilla Sandbox</a> ·
  <a href="https://github.com/scaleflex/cloudimage-image-crop/issues">Report Bug</a>
</p>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Variants](#variants)
- [Server-side crop (Cloudimage)](#server-side-crop-cloudimage)
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

`@cloudimage/image-crop` ships `<cloudimage-crop>`, a Lit-based custom element that renders a canvas-backed crop editor with rotation, fine tilt (±45°), horizontal/vertical flip, zoom, pan, and a configurable shape palette (free, square, circle, rounded-rect, plus arbitrary `W:H` ratio strings). The same engine is exposed three ways:

- a ready-to-mount custom element (`<cloudimage-crop>`);
- a React component (`<CloudimageCrop>`) plus hooks (`useCloudimageCrop`, `useCloudimageCropController`);
- a headless `createCropController({ canvas, host, config })` factory that drives a consumer-owned `<canvas>` with zero built-in UI.

## Features

- Two display variants: `classic` (movable / resizable crop frame over the photo) and `fixed` (the editor box *is* the crop frame — the photo is cover-fit and panned underneath, e.g. avatar / phone-style cropping). See [Variants](#variants).
- Rotation in 90° increments and fine tilt slider (-45°…+45°), horizontal flip, pinch / wheel / button zoom, keyboard shortcuts.
- Built-in shape presets (`free`, `square`, `circle`, `rounded-rect`, `16:9`, `4:3`, `3:2`, `5:4`, `2:1`, `9:16`, `3:4`, `2:3`, `4:5`, `1:2`) plus on-the-fly `"W:H"` ratios.
- Optional bleed-margin guides for print workflows.
- Themeable via a single `theme="light|dark"` attribute or fine-grained `--ci-crop-*` CSS custom properties (~50 tokens).
- Per-icon SVG overrides via the `icons` property.
- Export to `HTMLCanvasElement`, `Blob`, data URL, a serialisable `TransformParams` object — or a ready-made **[Cloudimage URL](#server-side-crop-cloudimage)** that runs the crop server-side on delivery, with full parity to the canvas (crop + flip + 90° + free tilt + zoom + pan, both variants). Persist a `CropDescriptor` to rebuild the URL in Node.
- Three packaging entry points so consumers pay for only what they use.

## Requirements

Modern evergreen browsers with Canvas 2D, Pointer Events, ResizeObserver, CSS container queries, and Custom Elements v1. React 18+ for the React entry. Node 18+ recommended for tooling.

## Installation

### npm / yarn / pnpm

```bash
npm install @cloudimage/image-crop
# or
yarn add @cloudimage/image-crop
# or
pnpm add @cloudimage/image-crop
```

### CDN

The official Cloudimage CDN serves a single self-contained bundle that registers
`<cloudimage-crop>` on load (plain `<script>`, no build step):

```html
<script src="https://cdn.cloudimage.io/image-crop/2.0.3/image-crop.min.js"></script>
```

Or load the ESM build straight from npm via jsDelivr's auto-bundling `+esm`
endpoint (resolves `lit` for the browser):

```html
<script type="module"
        src="https://cdn.jsdelivr.net/npm/@cloudimage/image-crop/dist/define.js/+esm"></script>
```

### Package exports

| Specifier | Purpose |
|---|---|
| `@cloudimage/image-crop`         | Side-effect-free entry. Exports `CloudimageCropElement`, `createCropController`, `mergeConfig`, `DEFAULT_CONFIG`, and all public types. |
| `@cloudimage/image-crop/define`  | Side-effectful — registers the `<cloudimage-crop>` custom element. Import once at bootstrap. |
| `@cloudimage/image-crop/react`   | React component `<CloudimageCrop>`, `useCloudimageCrop` / `useCloudimageCropController` hooks, plus re-exports of `createCropController`, `mergeConfig`, `DEFAULT_CONFIG`, and the public types. |

## Quick Start

### Vanilla JS / Web Component

```html
<script type="module">
  import '@cloudimage/image-crop/define';
</script>

<cloudimage-crop
  src="https://cdn.example.com/photo.jpg"
  crop-shape="16:9"
  theme="light"
  show-bleed-margin
></cloudimage-crop>

<script type="module">
  const crop = document.querySelector('cloudimage-crop');
  crop.addEventListener('cloudimage-crop-ready', () => console.log('ready'));
  crop.addEventListener('cloudimage-crop-save', (e) => {
    const { blob, dataURL, params } = e.detail;
    // upload `blob` or POST `params` to your backend
  });
</script>
```

### React

```tsx
import { CloudimageCrop, type CloudimageCropElement } from '@cloudimage/image-crop/react';
import { useRef } from 'react';

export function Editor() {
  const ref = useRef<CloudimageCropElement>(null);
  return (
    <CloudimageCrop
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
<!-- Self-contained bundle from the Cloudimage CDN -->
<script src="https://cdn.cloudimage.io/image-crop/2.0.3/image-crop.min.js"></script>
<cloudimage-crop src="https://cdn.example.com/photo.jpg" crop-shape="square"></cloudimage-crop>
```

## Configuration

All options below are exposed as both HTML attributes (kebab-case) and DOM properties (camelCase) on `<cloudimage-crop>`. Object/array options should be set as DOM properties; primitives can be set either way.

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
> `toBlob()`, `toDataURL()`, and the `cloudimage-crop-save` payload never contain the
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
| `output-mode` / `outputMode`           | `'blob' \| 'cloudimage'` | `'blob'` | What `save()` emits — a rasterized blob, or a Cloudimage URL (server-side crop). See [Server-side crop](#server-side-crop-cloudimage). |
| `cloudimage-token` / `cloudimageToken` | `string` | `''`          | Cloudimage token (`<token>.cloudimg.io`) used to build server-side URLs. |
| `cloudimage-domain` / `cloudimageDomain` | `string` | `''`        | Custom Cloudimage domain (default `cloudimg.io`). |
| `cloudimage-bg-color` / `cloudimageBgColor` | `string` | `''`     | Hex fill (no `#`) for corners exposed by a non-90° rotation in URL mode. |

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
<cloudimage-crop src="/photo.jpg" variant="fixed" crop-shape="1:1"></cloudimage-crop>
```

### Cover guarantee

In **both** variants the photo is constrained to always fully cover the crop frame — zoom and pan are clamped (and the minimum zoom is raised) so the exported image never contains transparent gaps. The one exception is a 90°/270° turn in `classic`, which intentionally letterboxes the rotated photo to fit the frame.

### Built-in "Done" button

The toolbar renders a primary **Done** button pinned to the right edge. It calls [`save()`](#public-methods) — building `blob` + `dataURL` + `params` and dispatching `cloudimage-crop-save` — so a host app can commit the crop without wiring its own button. Handle `cloudimage-crop-save` to upload / persist / close. (Hide the whole toolbar with `show-toolbar="false"` if you prefer to drive everything imperatively.)

## Server-side crop (Cloudimage)

Instead of rasterising the crop in the browser, `<cloudimage-crop>` can emit a
**[Cloudimage](https://www.cloudimage.io/) URL** that carries the crop as
transformation parameters — crop / flip / rotate / **free tilt** / **zoom** /
**pan** are then performed on the CDN, on the fly, when the image is requested,
with full parity to the canvas in both variants. No new file is produced or
uploaded; you store one original plus a URL. Non-destructive, and ideal for
responsive delivery.

### Output mode

`output-mode` selects what `save()` (and the `cloudimage-crop-save` event) produces:

| `output-mode` | Result | Crop runs | Use it to |
|---|---|---|---|
| `'blob'` (default) | `blob` + `dataURL` (+ `url` when a token is set) | in the browser (canvas) | upload a new cropped file |
| `'cloudimage'`     | `url` (+ `params`); `blob`/`dataURL` are `null` | on the Cloudimage CDN | store a non-destructive transform URL |

### Configure the target

```html
<cloudimage-crop
  src="https://example.com/photo.jpg"
  output-mode="cloudimage"
  cloudimage-token="mytoken"
></cloudimage-crop>

<script type="module">
  document.querySelector('cloudimage-crop').addEventListener('cloudimage-crop-save', (e) => {
    const { url, params } = e.detail;   // blob / dataURL are null in this mode
    // e.g. <img src={url}> — Cloudimage crops on delivery
  });
</script>
```

If `src` is **already** a Cloudimage / Filerobot URL (`*.cloudimg.io` or
`*.filerobot.com`), the crop ops are appended to it (preserving its existing
query) and no token is needed. Otherwise the raw origin URL is wrapped as
`https://<token>.cloudimg.io/<src>?…` (Cloudimage's fetch-from-origin form).

### Build a URL on demand

`toCloudimageURL(options?)` returns the URL string directly, with full parity to
the canvas. Pass `options` to override any target field (`src`, `token`,
`domain`, `bgColor`, `format`, `quality`, `maxWidth`, `maxHeight`) for that call.

```ts
const url = crop.toCloudimageURL();                 // uses the element's config
const webp = crop.toCloudimageURL({ format: 'image/webp', quality: 0.8 });
```

#### Reproduce a crop server-side / in Node

Persist `toCropDescriptor()` (or the `descriptor` field on the `cloudimage-crop-save`
event) — a fully serializable snapshot of the transform — and rebuild the URL
later with the pure `buildCloudimageUrlFromDescriptor(descriptor, target)`. No
browser or canvas needed; ideal for a backend that stores edits and renders URLs:

```ts
import { buildCloudimageUrlFromDescriptor } from '@cloudimage/image-crop';

// 1) in the browser — capture + persist the descriptor (JSON-safe)
const descriptor = crop.toCropDescriptor();
await fetch('/api/edits', { method: 'POST', body: JSON.stringify(descriptor) });

// 2) later, on the server — rebuild the exact same URL
const url = buildCloudimageUrlFromDescriptor(descriptor, { src, token: 'mytoken' });
```

#### React

```tsx
import { CloudimageCrop } from '@cloudimage/image-crop/react';

<CloudimageCrop
  src="https://example.com/photo.jpg"
  outputMode="cloudimage"
  cloudimageToken="mytoken"
  onSave={({ url, descriptor }) => {
    setPreview(url);              // <img src={url}> — cropped on delivery
    persist(descriptor);         // store to rebuild server-side later
  }}
/>;
```

#### Detect a crop that can't be reproduced server-side (advanced)

A crop frame that reaches **beyond the photo** (see [the limit below](#mapping--fidelity))
can't be matched by a CDN crop. `resolveServerCrop(...)` exposes a `clamped` flag
so you can fall back to `blob` mode for those:

```ts
import { resolveServerCrop } from '@cloudimage/image-crop';

const d = crop.toCropDescriptor();
const { clamped } = resolveServerCrop(d.state, d.imageWidth, d.imageHeight, d.containerWidth, d.containerHeight, d.variant);
const result = clamped ? await crop.toBlob() : crop.toCloudimageURL();
```

> ⚠️ A simpler `buildCloudimageUrl(params, target)` (taking `toTransformParams()`)
> also exists, but it is **lossy** — it ignores zoom/pan and only does best-effort
> rotation. Prefer `buildCloudimageUrlFromDescriptor` for faithful parity.

### Mapping & fidelity

Editor state maps to Cloudimage v7 ops in pipeline order
(`flip → rotate → crop → resize → format`):

| Editor | Cloudimage |
|---|---|
| crop rect                         | `tl_px` / `br_px` (original-image pixels) |
| flip H/V                          | `flip=h` / `v` / `hv` |
| rotation (90° turns + tilt)       | `r=<deg>` (CCW) + `bg_color` for non-90° |
| `max-output-*`                    | `w` / `h` + `func=bound` |
| `output-type` / `output-quality`  | `force_format` + `q` |

> **Fidelity — full parity for any crop within the photo.** Crop, flip, resize,
> format/quality, **90° turns, free tilt (±45°), zoom and pan** all reproduce the
> canvas exactly, in both `classic` and `fixed` variants — the crop window's
> pre-image is derived from the very same transform matrix `renderToCanvas` uses
> (`resolveDisplay`), so the two can't drift. **Free tilt** is reproduced via a
> **two-pass nested URL** (an inner pass rotates the photo, an outer pass crops the
> rotated result) because Cloudimage crops before it rotates. Geometry is exact;
> only the resize kernel differs from the canvas. *Cost:* tilt uses two CDN passes;
> everything else is one. *(Verified end-to-end in a real browser across tilt /
> 90° / zoom / pan / flip / both variants — mean per-channel diff 3–9 / 255.)*
>
> **The one limit — empty margins can't be reproduced.** If the crop frame extends
> *beyond the photo* into empty/background margins, a Cloudimage URL cannot match
> the canvas there: a CDN **clamps a crop to the image** (it can't pad a crop), so
> those margins are dropped. This happens in `classic` after a **90°/270° turn**,
> which letterboxes the photo smaller than the frame, when the crop frame reaches
> into the margin. **For guaranteed server-side parity use the `fixed` variant**
> (it cover-fits, so the crop is always inside the photo — every combination
> matches), or in `classic` keep the crop within the photo. The geometry of the
> in-photo region stays exact; `resolveServerCrop(...).clamped` flags when a crop
> spilled past the image.

## Public Methods

All methods live on the `<cloudimage-crop>` element instance. They throw if invoked before `cloudimage-crop-ready` fires.

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
| `toCloudimageURL(options?)`         | `string`                | Build a Cloudimage URL reproducing the full transform (crop/flip/90°/tilt/zoom/pan) server-side. See [Server-side crop](#server-side-crop-cloudimage). |
| `toCropDescriptor()`                | `CropDescriptor`        | Serializable snapshot (state + dims + variant) to rebuild the Cloudimage URL later/server-side. |
| `save(type?, quality?)`             | `Promise<void>`         | Convenience: builds the result for the current `output-mode` (blob + dataURL + params, or a Cloudimage `url`) and dispatches `cloudimage-crop-save`. |
| `cancel()`                          | `void`                  | Dispatches `cloudimage-crop-cancel`. |

## Events

All events bubble and cross shadow boundaries (`bubbles: true, composed: true`).

| Event | `detail` | Fires on |
|---|---|---|
| `cloudimage-crop-ready`        | `{ element: CloudimageCropElement }`              | Controller initialised. |
| `cloudimage-crop-image-load`   | `{ image: HTMLImageElement }`              | Image decoded and rendered. |
| `cloudimage-crop-change`       | `TransformState`                           | Any transform mutation. |
| `cloudimage-crop-crop-change`  | `CropRect`                                 | Crop rect changed. |
| `cloudimage-crop-save`         | `{ blob, dataURL, params, url, descriptor }` | `.save()` resolved. `blob`/`dataURL` are `null` when `output-mode="cloudimage"`; `url` is the Cloudimage URL (or `null` when no token is configured); `descriptor` is the serializable [`CropDescriptor`](#types-reference) to rebuild that URL server-side. |
| `cloudimage-crop-cancel`       | `undefined`                                | `.cancel()` invoked. |
| `cloudimage-crop-error`        | `{ error: Error }`                         | Image-load or export error. |

## React API

### `<CloudimageCrop>` component

`forwardRef` component that mirrors the element's attributes as camelCase props and bridges every `cloudimage-crop-*` event into a matching `on*` callback.

```tsx
import { CloudimageCrop } from '@cloudimage/image-crop/react';

<CloudimageCrop
  src="..."
  cropShape="circle"
  theme="dark"
  showBleedMargin
  availableShapes={['free', 'square', 'circle', '16:9']}
  onReady={({ element }) => {}}
  onImageLoad={({ image }) => {}}
  onChange={(state) => {}}
  onCropChange={(crop) => {}}
  onSave={({ blob, dataURL, params, url, descriptor }) => {}}
  onCancel={() => {}}
  onError={({ error }) => {}}
/>
```

The `ref` resolves to the underlying `CloudimageCropElement`, so every imperative method above is callable directly.

### `useCloudimageCrop()` hook

For consumers who prefer to render `<cloudimage-crop>` themselves and pull stable callables off a hook:

```tsx
import { useCloudimageCrop } from '@cloudimage/image-crop/react';

const { ref, ready, save, reset, toBlob, getTransformState } = useCloudimageCrop();

return <cloudimage-crop ref={ref} src="..." />;
```

`ready` flips to `true` after `cloudimage-crop-ready`. All callables are no-ops before then.

### `useCloudimageCropController()` hook (headless)

Drives the same controller against a consumer-owned `<canvas>`. Use this when the built-in toolbar isn't a fit and you need to render every UI affordance yourself. See `CropControllerState`, `CropControllerActions`, and `CropControllerApi` in `src/react/use-cloudimage-crop-controller.ts`.

## Theming

### Brand colour

The fastest way to recolour the editor is to override one variable on the host:

```html
<cloudimage-crop style="--ci-crop-primary:#ff3366"></cloudimage-crop>
```

### CSS Custom Properties

Every visual surface is keyed off `--ci-crop-*` tokens. The full list (see `src/styles/shared.css.ts` for the canonical defaults):

#### Colours

`--ci-crop-primary`, `--ci-crop-primary-hover`, `--ci-crop-primary-mid`, `--ci-crop-primary-bg`, `--ci-crop-primary-glow`, `--ci-crop-success`, `--ci-crop-error`, `--ci-crop-text`, `--ci-crop-text-secondary`, `--ci-crop-text-muted`, `--ci-crop-border`, `--ci-crop-border-light`, `--ci-crop-bg`, `--ci-crop-surface`, `--ci-crop-canvas-bg`.

#### Canvas & frame

`--ci-crop-overlay-color`, `--ci-crop-frame-color`, `--ci-crop-frame-shadow`, `--ci-crop-handle-fill`, `--ci-crop-handle-stroke`, `--ci-crop-ruler-ink`, `--ci-crop-ruler-halo`, `--ci-crop-ring`, `--ci-crop-shadow`.

`--ci-crop-ruler-ink` and `--ci-crop-ruler-halo` colour the fine-tilt ruler (ticks, centre indicator, degree readout). The ruler floats directly over the photo, whose brightness is unknown, so it can't track the theme: the ink defaults to a near-white core and the halo to a dark glow wrapped around it, so the white core reads over dark images while the halo reads over bright ones (the trick subtitles use). Override both together if you want a different ink/halo pairing.

#### Toolbar & controls

`--ci-crop-toolbar-bg`, `--ci-crop-toolbar-color`, `--ci-crop-toolbar-border`, `--ci-crop-toolbar-shadow`, `--ci-crop-btn-size`, `--ci-crop-btn-radius`, `--ci-crop-btn-hover-bg`, `--ci-crop-btn-active-bg`, `--ci-crop-separator-color`, `--ci-crop-slider-track`, `--ci-crop-slider-fill`, `--ci-crop-slider-thumb`, `--ci-crop-dropdown-bg`, `--ci-crop-dropdown-hover`, `--ci-crop-dropdown-shadow`, `--ci-crop-zoom-bar-bg`.

#### Typography & radius

`--ci-crop-font`, `--ci-crop-radius`, `--ci-crop-card-shadow`, `--ci-crop-transition`.

A `[theme="dark"]` selector on the host re-binds the same variables to the dark palette — no other configuration needed.

### Shadow parts

Style internal regions from light DOM:

```css
cloudimage-crop::part(toolbar) { /* ... */ }
cloudimage-crop::part(canvas-host) { /* ... */ }
cloudimage-crop::part(loading) { /* ... */ }
cloudimage-crop::part(error) { /* ... */ }
cloudimage-crop::part(container) { /* ... */ }
```

## Types Reference

All types live in `src/core/types.ts` and are re-exported from both `@cloudimage/image-crop` and `@cloudimage/image-crop/react`.

- `CropShapeName` — `'free' | 'square' | 'circle' | 'rounded-rect' | '16:9' | …` plus any `"W:H"` string.
- `CropRect` — `{ x, y, width, height }` in normalised `[0,1]` image coordinates.
- `TransformState` — full runtime state (`quarterTurns`, `rotation`, `flipH`, `flipV`, `scale`, `panX/Y`, `cropRect`, `rotationPivot?`).
- `TransformParams` — serialisable export shape (`rotation`, `flipH`, `flipV`, `scale`, `crop` in original-image pixels, `outputWidth`, `outputHeight`).
- `CropIconOverrides` — per-slot SVG-string overrides for toolbar icons.
- `CloudimageCropConfig` — the internal config shape consumed by `createCropController`. Element attributes mirror this 1:1.
- `CloudimageTarget` (alias `CloudimageUrlOptions`) — the Cloudimage delivery target for `toCloudimageURL` / `buildCloudimageUrlFromDescriptor` (`src`, `token`, `domain`, `bgColor`, `format`, `quality`, `maxWidth`, `maxHeight`).
- `CropDescriptor` — serializable parity snapshot (`state`, `imageWidth/Height`, `containerWidth/Height`, `variant`) returned by `toCropDescriptor()`; pass to `buildCloudimageUrlFromDescriptor` to reproduce the crop server-side.
- `ServerCrop` — the lower-level crop plan returned by the exported `resolveServerCrop(state, iw, ih, containerW, containerH, variant)`; carries `cropPx`, `rotateCCW`, `flip*`, `tilted`, and **`clamped`** (true when the crop reaches outside the photo, so a CDN URL can't reproduce its background margins).

The package also exports these **functions**: `buildCloudimageUrlFromDescriptor`, `buildCloudimageUrl` (lossy shim), and `resolveServerCrop` — all from both `@cloudimage/image-crop` and `@cloudimage/image-crop/react`.

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
