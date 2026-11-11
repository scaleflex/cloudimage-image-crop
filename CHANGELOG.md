# Changelog

All notable changes to `@cloudimage/image-crop` (formerly `@scaleflex/image-crop`, originally `js-cloudimage-crop`).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Reset next to Cancel.** `resetPlacement` (`reset-placement`) moves the
  toolbar's Reset button out of the centred tool group into the left corner,
  after Cancel when it is shown, so both "back out" actions sit together. The
  narrow-box gutter widens to fit both circles. Default `'toolbar'` keeps
  today's layout.

## [3.2.0] — 2026-11-10

### Added

- **Reopen a crop from its url.** `restoreFromCloudimageUrl(url)` on the element,
  and the pure `cropDescriptorFromCloudimageUrl(url, target)`, rebuild a `'fixed'`
  crop — zoom, pan, flips, quarter turns and free tilt — from the Cloudimage url
  a `cloudimage`-mode save produced, so an app that stores only the url can
  reopen the editor where the user left it. A crop of another shape (e.g. from an
  older editor) reopens centred on the same region. It resolves `false` instead
  of rejecting (no photo yet, a url that does not fit the photo, the photo
  changed during calibration), works for origins whose url has its own query,
  and caps the zoom at `maxScale`.
- **Styled, translatable toolbar tooltips.** `tooltips="styled"` replaces the
  browser `title` tooltips with the editor's own, themed by `--ci-crop-tooltip-*`;
  `tooltipLabels` sets their text (e.g. translations) while `aria-label`s stay
  English (so translated text and the accessible name differ — see README). Default `'native'` keeps today's behaviour.

### Changed

- **cloudimage mode no longer forces PNG; set `outputType` to keep it.**
  `outputType` has no default any more (it was `'image/png'`, which appended
  `force_format=png` to every Cloudimage URL and turned photos into heavy PNGs).
  Unset, single-pass and nested (tilt) Cloudimage URLs carry no `force_format`
  and no `q`, so the CDN delivers the original format. Setting `outputType`
  (e.g. `image/webp`) forces that format and its quality as before. Raster export
  (`toBlob`, `toDataURL`, `save()` in `blob` mode) still defaults to PNG.
- **TypeScript (source-breaking):** `CloudimageCropConfig.outputType` and the
  element's `outputType` are now optional (`string | undefined`, default
  `undefined`). Code that read them as a plain `string` needs a fallback, e.g.
  `config.outputType ?? 'image/png'`.

### Fixed

- `showRotateButton`, `showFlipButton`, `showRotateSlider` and `showShapeSelector`
  set to `false` before the first render now reach the toolbar; `showCancelButton`
  is forwarded the same way.
- React: props passed before `<cloudimage-crop>` is defined (its module loads
  asynchronously) survive the upgrade — a `false` boolean whose default is `true`,
  such as `showShapeSelector={false}`, used to be dropped. They were bound
  as boolean attributes, so a `false` never created the attribute and the toolbar
  kept its `true` default (the same fix `showDoneButton` already had).
- The canvas takes its container's layout size instead of its transformed
  bounding rect. Opened inside an animated dialog (zoom-in), it was sized at the
  animation's start scale and stayed short of the box, leaving empty strips.

### Documentation

- README: the new `outputType` default, and that `src` must be the original
  image (crop ops are merged onto an existing Cloudimage URL's query).

## [3.1.0] — 2026-10-12

### Added

- **Per-image free-tilt calibration (`calibrateCloudimage()` / `serverFraming`).**
  Cloudimage frames a rotated image's nested crop differently **per image** — it
  measures the outer crop either from the centred original frame or from the
  rotated-bbox corner. This is a CDN-side property that can NOT be derived from
  the crop geometry (verified against the live CDN: independent of aspect, format,
  EXIF, dimensions and rotation angle), so a free-tilt URL could otherwise land on
  the wrong region for some images. The editor now **auto-detects** the correct
  framing per image (one background CDN probe, then cached) and bakes it into the
  emitted `url`/`descriptor` for exact free-tilt parity. `save()` does this
  automatically for `cloudimage` output; `calibrateCloudimage()` (element /
  controller / React hooks) pre-warms it; `CropDescriptor.serverFraming`
  (`'centered' | 'inset'`) carries it for Node reproduction. New exports:
  `calibrateServerFraming(image, descriptor, target)`, the `ServerFraming` type,
  and a `framing` argument on `resolveServerCrop`. Non-tilt crops (0/90/180/270°)
  are exact for every image and need no calibration.
- `show-done-button` / `showDoneButton` (default `true`) — hide the toolbar's
  built-in Done button when the host commits the crop through its own action.
- `dim-toolbar-on-drag` — fade the toolbar while the user drags / resizes / pans.
- React: `<CloudimageCrop>` forwards `showDoneButton`, `showCancelButton` and
  `dimToolbarOnDrag` (they were element-only); `restoreState(descriptor)` on the
  `useCloudimageCrop` and `useCloudimageCropController` hooks.
- `TransformState.turnedBox` (classic) — records whether the editor box took
  the turned photo's aspect; serialized in descriptors so exports reproduce the
  layout. Always written by this version; **absent = a 3.0.0 state** (see
  *Fixed → 3.0.0 descriptors*).
- Headless controller callback `onBoxAspectChange(turned)` — fires whenever the
  classic box must change aspect (toolbar, keyboard `R`, `restoreState`, shape /
  variant switch). `<cloudimage-crop>` wires it to re-fit itself. Opt-in for
  headless use: without it the box is treated as fixed (see *Changed*).

### Changed

- **Classic 90° turn: the box follows the photo.** With the free shape a quarter
  turn now turns the editor box to the photo's new aspect and turns the frame
  with the photo (a full-photo frame stays the full photo; no letterbox margins).
  With a picked ratio the box and frame stay exactly as they are (16:9 stays
  16:9) and the turned photo is cover-fit behind them. Headless controllers that
  don't wire `onBoxAspectChange` get the ratio behaviour for every shape, so the
  photo is never drawn stretched into a box that didn't turn.
- **Classic free tilt keeps the frame filled.** While tilted, the photo is zoomed
  (about the frame centre) just enough to cover the frame and pan stays within
  cover, so the export has no empty corners. The zoom change is reported through
  `onScaleSync`. This auto-zoom is derived from the user's own zoom/pan, never
  accumulated: moving the frame back from the edge, or untilting, gives it back.
- Picking a ratio from the toolbar gives the largest frame of that ratio the box
  allows (instead of the 80% starting inset).
- `reset()` returns to the **configured** shape (`crop-shape` attribute / prop /
  `update({ cropShape })`), not to a shape the user picked in the toolbar
  (or via `setCropShape()`), which it now undoes.
- Classic frame corner dots are rendered in the DOM so they can overhang the
  photo edge (no longer three-quarters clipped on a full-photo frame); a press on
  one is forwarded to the canvas, with a relay fallback where an engine refuses
  pointer capture for the forwarded press.
- Narrow editor toolbar: the tools wrap onto a second centred row instead of
  being cut off (e.g. a landscape photo turned to portrait on a phone); corner
  gutters are reserved only for a shown Cancel / Done; dividers are dropped
  below a 260px box. The shape dropdown sizes itself to the measured room below
  (or beside) its trigger, so it no longer runs past the box edge.
- `toCloudimageURL()` logs a one-time console warning when it builds a
  free-tilt URL before `calibrateCloudimage()` (the uncalibrated framing can pick
  the wrong region on some images; `save()` calibrates on its own).

### Fixed

- **3.0.0 descriptors keep producing the same crop.** A state without
  `turnedBox` is rendered exactly as 3.0.0 did — an odd turn letterboxes the
  photo and flip mirrors about the crop centre — in the canvas, `toCanvas()`,
  `resolveServerCrop()` and `buildCloudimageUrlFromDescriptor()`; restoring one
  doesn't auto-zoom a tilt. Its first quarter turn in the editor moves it to the
  current layout. (Exception: a turned **and** tilted 3.0.0 crop gets the corrected
  nested-crop placement below — its 3.0.0 URL selected the wrong region.)
- `toTransformParams().crop` (and `params` in `cloudimage-crop-save`) is the
  region of the original photo under the frame again after a 90° turn and under a
  flip — it was the frame's box-normalized rect scaled by the image size, which
  mixed axes once the box turned. Zoom, pan and tilt remain ignored, as
  documented.
- Keyboard `R` in `<cloudimage-crop>` re-fits the box like the toolbar button
  (it previously left the box un-turned and drew the photo stretched).
- A photo turning 90° no longer jumps in size halfway through the animation —
  its draw size follows the target turn.
- Nested-crop inset for a near-quarter-turn tilted landscape (negative-inset
  regime) no longer pushes the outer crop past the rotated canvas.

## [3.0.0] — 2026-06-17

### Added

- **Configurable crop output — Blob or Cloudimage URL.** New `output-mode` /
  `outputMode` config (`'blob'` default, or `'cloudimage'`) selects whether
  `save()` rasterizes the crop to a `Blob`/`dataURL` (client-side, upload it
  yourself) or emits a **Cloudimage URL** that performs the transform server-side
  on delivery (non-destructive).
- **Full canvas↔URL parity (for any crop within the photo).** The Cloudimage URL
  reproduces the editor exactly — crop + flip + 90° turns + **free tilt** +
  **zoom** + **pan**, in both `classic` and `fixed` variants. Most cases emit a
  single-pass URL; free tilt uses a two-pass **nested** URL (inner rotates, outer
  crops). The pre-image is derived from the same transform matrix the canvas
  renderer uses, so they can't drift. Verified end-to-end in a real browser across
  tilt / 90° / zoom / pan / flip / both variants (mean per-channel diff 3–9 / 255).
  - **Known limit:** a crop frame that extends *beyond the photo* into empty
    margins can't be reproduced — a CDN clamps a crop to the image (it can't pad),
    so the canvas's margins are dropped. Reachable in `classic` after a 90°/270°
    turn (which letterboxes the photo) when the frame reaches into the margin. Use
    the **`fixed` variant for guaranteed parity** (it cover-fits → crop always
    inside the photo), or keep the `classic` crop within the photo.
    `resolveServerCrop(...).clamped` flags it.
- `toCloudimageURL(options?)` and `toCropDescriptor()` on the `<cloudimage-crop>`
  element, the headless controller, and the React `useCloudimageCrop` /
  `useCloudimageCropController` hooks.
- `buildCloudimageUrlFromDescriptor(descriptor, target)` — exported pure,
  parity-complete helper (also from `@cloudimage/image-crop/react`) to build the
  URL from a stored `CropDescriptor` in Node / on a server. `buildCloudimageUrl`
  (lossy single-pass) is retained for the basic case. New `CropDescriptor` and
  `CloudimageTarget` types.
- `resolveServerCrop(state, iw, ih, containerW, containerH, variant)` and its
  `ServerCrop` type are exported so consumers can inspect the crop plan —
  notably `clamped` — and fall back to `blob` mode when a crop can't be
  reproduced server-side. It throws on a non-positive image size or scale
  (degenerate / corrupted descriptor) instead of emitting a `NaN` URL.
- `cloudimage-token`, `cloudimage-domain`, `cloudimage-bg-color` config to point
  the editor at a Cloudimage account (token form, custom domain, or appending to
  an `src` that is already a Cloudimage URL). Cloudimage (`*.cloudimg.io`) and
  Filerobot (`*.filerobot.com`) URLs are auto-detected → ops are appended with no
  token needed.

### Changed

- **Renamed to `@cloudimage/image-crop`** (from `@scaleflex/image-crop`), moving
  the plugin into the Cloudimage plugin family (alongside `@cloudimage/360-view`,
  `@cloudimage/hotspot`, …). This renames the public surface:
  - npm package `@scaleflex/image-crop` → `@cloudimage/image-crop` (and
    `/define`, `/react` sub-paths);
  - custom element `<sfx-crop>` → `<cloudimage-crop>`;
  - React component `SfxCrop` → `CloudimageCrop` (+ `CloudimageCropElement`,
    `CloudimageCropProps`, `CloudimageCropSaveDetail`, `useCloudimageCrop`,
    `useCloudimageCropController`);
  - events `sfx-crop-*` → `cloudimage-crop-*`;
  - CSS custom properties `--sfx-cr-*` → `--ci-crop-*`;
  - CDN bundle served from `/plugins/cloudimage/image-crop/`.
  Update imports, the tag, event names, and CSS variable names accordingly.
- `cloudimage-crop-save` event detail gains `url` and `descriptor` fields, and
  `blob`/`dataURL` are now `null` when `output-mode="cloudimage"` (previously
  always present). The React `CloudimageCropSaveDetail` type widens
  `blob`/`dataURL` to `… | null` accordingly.

## [2.0.3] — 2026-06-12

### Fixed

- `LICENSE` now uses the canonical Scaleflex MIT text (`Copyright (c) 2022
  SCALEFLEX SAS`) plus the **Publicity** clause, matching the other Scaleflex
  plugins.

## [2.0.2] — 2026-06-12

### Changed

- **Renamed the npm package `@scaleflex/crop` → `@scaleflex/image-crop`.** The
  old `@scaleflex/crop` name was unpublished; update imports accordingly. The
  HTML tag (`<sfx-crop>`) and events are unchanged.
- CDN bundle moved to
  `https://cdn.scaleflex.com/image-crop/<version>/image-crop.min.js`
  (was `/crop/<version>/crop.min.js`).
- Public titles: README → "Scaleflex Image Crop"; demo landing hero → "Image Crop".

### Removed

- "Also by Scaleflex" carousel section on the demo landing page.

### Fixed

- Demo footer restructured into Resources / Examples / Support columns with a
  centered bottom bar and corrected link colors.
- "Download PNG" button text was unreadable on hover (global `a:hover` recolor) —
  now keeps white text with reduced opacity.

## [2.0.0] — 2026-04-21

Major release. The package is renamed to `@scaleflex/image-crop` and rewritten on
top of Lit 3 Web Components, matching the architecture of
[`@scaleflex/uploader`](https://www.npmjs.com/package/@scaleflex/uploader) and
[`@scaleflex/asset-picker`](https://www.npmjs.com/package/@scaleflex/asset-picker).

### Added

- `<sfx-crop>` custom element with an open shadow root.
- Sub-elements `<sfx-crop-canvas>`, `<sfx-crop-toolbar>`, `<sfx-crop-zoom>`,
  `<sfx-crop-rotate>`, `<sfx-crop-shapes>`, each with its own shadow DOM and
  `static styles`.
- Side-effect registration entry `@scaleflex/image-crop/define` — importing it
  registers every tag idempotently (safe under React StrictMode and repeated
  imports).
- React wrapper at `@scaleflex/image-crop/react` — `<SfxCrop>` (`forwardRef`) and
  `useSfxCrop()` hook. Auto-imports `../define` on module load (SSR-guarded).
- `::part(container|canvas-host|toolbar|zoom|loading|error)` for scoped
  light-DOM styling.
- `--sfx-cr-*` CSS custom properties for theming (declared on `:host`, cascade
  through shadow boundaries).
- `theme="light"` / `theme="dark"` attribute.
- Event API (all `bubbles: true`, `composed: true`): `sfx-crop-ready`,
  `sfx-crop-image-load`, `sfx-crop-change`, `sfx-crop-crop-change`,
  `sfx-crop-save`, `sfx-crop-cancel`, `sfx-crop-error`.
- Imperative methods on the element: `loadImage`, `rotateLeft`,
  `flipHorizontal`, `setRotation`, `setScale`, `setCropShape`, `setCropRect`,
  `getCropRect`, `getTransformState`, `toCanvas`, `toBlob`, `toDataURL`,
  `toTransformParams`, `reset`, `save`, `cancel`.
- TypeScript helpers `imageToCanvas`, `canvasToImage`, `buildTransformMatrix`
  remain exported from `.` for advanced consumers.

### Changed (breaking)

- **Package rename**: `js-cloudimage-crop` → `@scaleflex/image-crop`. Update your
  `package.json` dependency. CDN users: switch from the `unpkg` UMD build to
  ESM via `https://esm.sh/@scaleflex/image-crop/define`.
- **Exports map** is now the sole entry contract — `main`/`module`/`unpkg`
  fields are gone. Consume via subpath imports:
  - `@scaleflex/image-crop` — types + helpers, no side effects
  - `@scaleflex/image-crop/define` — registers custom elements
  - `@scaleflex/image-crop/react` — React wrapper (also auto-registers)
- **UMD build dropped.** ESM-only distribution via npm/CDN. Use `esm.sh` /
  `unpkg` with `?module` for CDN consumption.
- **API surface** replaced — see migration guide below. In particular:
  - `new CICropView(el, config)` is removed.
  - `CICropViewInstance` and `CICropViewConfig` are removed (a deprecated
    `CICropViewConfig = SfxCropConfig` alias stays for one release).
  - The `CICropViewer` React component is replaced by `SfxCrop`; the
    `useCICropView` hook is replaced by `useSfxCrop`.
  - Callback-style `config.onChange` / `onCropChange` / `onReady` fields are
    gone — use DOM CustomEvents or the React callback props.
  - `parseDataAttributes` + `data-ci-crop-*` auto-init helper is removed;
    native HTML attributes on `<sfx-crop>` replace it (`src="…"`,
    `crop-shape="…"`, `theme="…"`, `show-grid="…"`, …).
- **CSS tokens renamed** `--ci-crop-*` → `--sfx-cr-*`. The legacy prefix no
  longer exists.
- **Theme application** — use the `theme` attribute instead of toggling
  `.ci-crop-theme-light` / `.ci-crop-theme-dark` classes.
- **Vertical flip** keyboard shortcut (`V` key) and `showFlipVButton` /
  `flipVertical()` APIs are removed (they were no-ops in 1.x).
- **Peer-dep bump**: React / React-DOM minimum is now `>=18`.
- **Decorator semantics** — the package builds with
  `useDefineForClassFields: false`. Consumers don't need to match, but if
  you're embedding source via Vite/esbuild and override that flag, Lit
  `@property` init will break. Stick to bundled artifacts.

### Removed

- `CICropView` class (`src/core/ci-crop-view.ts`)
- `CICropViewInstance` interface
- `CICropViewer` React component, `useCICropView` React hook
- `src/ui/` directory (legacy imperative toolbar / slider / shape-selector
  factories)
- `src/utils/dom.ts` (`injectStyles`, `removeStyles`, `getElement`,
  `createElement`, `addClass`, `removeClass` — no consumers after the
  element rewrite)
- `parseDataAttributes` + `data-ci-crop-*` helpers
- `flipVertical()` / `showFlipVButton` (dead surface)
- UMD bundle

### Fixed

- Pointer-capture and non-passive `wheel` listeners stay stable across Lit
  renders — the `<canvas>` node is rendered once and never recreated.
- `<sfx-crop>` guards against `@scaleflex/image-crop/define` missing with a branded
  error instead of a cryptic null-dereference.
- Fast mount/unmount (StrictMode, router transitions) no longer leaks a
  controller for a detached host — `firstUpdated` re-checks `isConnected`
  after awaiting the child's first render.
- `setCropShape` now fires change/cropChange events exactly once per value
  transition.
- Zero-dimension container doesn't throw `drawImage: canvas with 0 width/
  height` — the render loop early-returns and re-marks dirty for the next
  ResizeObserver tick.

---

## Migration guide (1.x → 2.0)

### Install

```bash
npm remove js-cloudimage-crop
npm install @scaleflex/image-crop
```

### Replace the JS entry

**Before (1.x)**:

```html
<div id="viewer"></div>

<script type="module">
  import { CICropView } from 'js-cloudimage-crop';

  const viewer = new CICropView('#viewer', {
    src: '/photo.jpg',
    cropShape: 'free',
    theme: 'dark',
    showGrid: true,
    onChange: (state) => console.log(state),
    onCropChange: (crop) => console.log(crop),
  });

  // Imperative controls on the instance
  viewer.rotateLeft();
  const blob = await viewer.toBlob();
</script>
```

**After (2.0)**:

```html
<sfx-crop
  id="viewer"
  src="/photo.jpg"
  crop-shape="free"
  theme="dark"
  show-grid="true"
></sfx-crop>

<script type="module">
  import '@scaleflex/image-crop/define';

  const viewer = document.getElementById('viewer');
  viewer.addEventListener('sfx-crop-change', (e) => console.log(e.detail));
  viewer.addEventListener('sfx-crop-crop-change', (e) => console.log(e.detail));

  // Imperative controls on the element itself
  viewer.rotateLeft();
  const blob = await viewer.toBlob();
</script>
```

### Config field → attribute / property mapping

Every `CICropViewConfig` field now maps to an HTML attribute (kebab-case) or a
DOM property (camelCase). Both work:

```html
<sfx-crop
  src="..."
  crop-shape="16:9"
  theme="light"
  min-scale="0.5"
  max-scale="8"
  show-grid="interaction"
  show-toolbar
  enable-animations
  border-radius="20"
  bleed-margin-size="10"
  bleed-margin-color="rgba(255,0,0,.5)"
></sfx-crop>
```

```ts
const el = document.querySelector('sfx-crop');
el.cropShape = '16:9';
el.minScale = 0.5;
el.availableShapes = ['free', 'circle', '16:9'];
```

### Callback → CustomEvent mapping

| 1.x `config.*` callback | 2.0 event                  | `detail` payload |
|---|---|---|
| `onReady(instance)`     | `sfx-crop-ready`           | `{ element }` |
| `onImageLoad(img)`      | `sfx-crop-image-load`      | `{ image }` |
| `onChange(state)`       | `sfx-crop-change`          | `TransformState` |
| `onCropChange(crop)`    | `sfx-crop-crop-change`     | `CropRect` (image-pixel coords) |
| `onError(err)`          | `sfx-crop-error`           | `{ error }` |
| _(new)_                 | `sfx-crop-save`            | `{ blob, dataURL, params }` (from `.save()`) |
| _(new)_                 | `sfx-crop-cancel`          | `void` (from `.cancel()`) |

All events are `bubbles: true, composed: true` — listen on `document` or any
ancestor, not only the element itself.

### React migration

**Before (1.x)**:

```tsx
import { CICropViewer } from 'js-cloudimage-crop/react';

<CICropViewer
  ref={ref}
  src="/photo.jpg"
  cropShape="free"
  onChange={(state) => ...}
/>
```

**After (2.0)**:

```tsx
import { SfxCrop, type SfxCropElement } from '@scaleflex/image-crop/react';

const ref = useRef<SfxCropElement>(null);

<SfxCrop
  ref={ref}
  src="/photo.jpg"
  cropShape="free"
  onChange={(state) => ...}
  onSave={({ blob, params }) => ...}
/>
```

The hook variant (`useCICropView` → `useSfxCrop`) still returns a `ref` plus
stable imperative callables — wire it the same way.

### CSS token rename

Replace every `--ci-crop-*` with `--sfx-cr-*`. Example:

```css
/* 1.x */
.ci-crop-container { --ci-crop-bg: #0a0a0a; }

/* 2.0 — tokens are set on the host, internals are encapsulated */
sfx-crop { --sfx-cr-bg: #0a0a0a; }
sfx-crop::part(toolbar) { border: 1px solid gold; }
```

### `data-ci-crop-*` auto-init

The declarative auto-init (`CICropView.autoInit()` scanning for
`data-ci-crop-src`) is gone. Native HTML attributes on `<sfx-crop>` cover the
same use case — no JS call needed beyond importing `/define`.

### CDN

UMD is dropped. The recommended CDN-over-ESM path:

```html
<script type="module" src="https://esm.sh/@scaleflex/image-crop/define"></script>
<sfx-crop src="/photo.jpg"></sfx-crop>
```

---

## [1.0.0] — 2026-03-17

Last `js-cloudimage-crop` release. See git history up to
`cb8c3b6 feat: add rounded-rect crop shape, vertical flip, and print bleed margins`.
