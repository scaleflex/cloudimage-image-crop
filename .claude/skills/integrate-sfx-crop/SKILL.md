---
name: integrate-sfx-crop
description: Helps Claude add the @scaleflex/crop image-crop editor to your project — detecting your framework, wiring up the custom element or React wrapper, configuring shapes/theme, and bridging events to your save flow. Trigger when the user asks to integrate, install, embed, or use @scaleflex/crop, <sfx-crop>, or "the Scaleflex crop editor".
---

# Integrate `@scaleflex/crop`

Use this skill whenever the user wants to add the Scaleflex image-crop editor to their codebase. Goal: produce a working integration in their app, not a generic copy-paste.

## Detection — pick the right entry point

1. **Look at `package.json`** in the user's project:
   - `react` / `react-dom` present → use `@scaleflex/crop/react`
   - Vue / Svelte / Angular / vanilla → use `@scaleflex/crop` + `@scaleflex/crop/define`
2. **Look at the build setup** (Vite / webpack / Next.js / Remix / Astro / plain `<script>`).
   - Module bundler → ESM imports.
   - Plain HTML → ESM-CDN or UMD via `<script type="module">`.
3. **Look at how images are sourced** (Cloudinary, Cloudimage, S3, local uploads). The `src` attribute takes any URL.

## Install

```bash
npm install @scaleflex/crop
```

If a peer warning about React shows up and the project is non-React, ignore it — `react` / `react-dom` are declared optional peers.

## Vanilla / Web Component integration

```html
<script type="module">
  import '@scaleflex/crop/define';
</script>

<sfx-crop
  src="..."
  crop-shape="16:9"
  theme="light"
></sfx-crop>

<script type="module">
  const crop = document.querySelector('sfx-crop');
  crop.addEventListener('sfx-crop-ready', () => { /* enable Save button */ });
  crop.addEventListener('sfx-crop-save', async (e) => {
    const { blob, params } = e.detail;
    await fetch('/api/upload', { method: 'POST', body: blob });
  });
</script>
```

The `define` import has side-effects — only import it once at the app entry.

## React integration

```tsx
import { SfxCrop, type SfxCropElement } from '@scaleflex/crop/react';
import { useRef } from 'react';

export function CropDialog({ src, onDone }: { src: string; onDone: (b: Blob) => void }) {
  const ref = useRef<SfxCropElement>(null);
  return (
    <SfxCrop
      ref={ref}
      src={src}
      cropShape="square"
      theme="dark"
      onSave={({ blob }) => onDone(blob)}
    />
  );
}
```

For SSR frameworks (Next.js App Router, Remix), the `@scaleflex/crop/react` module is browser-only because it touches `customElements`. Either:
- mark the parent component `'use client'` (Next.js); or
- dynamically import via `next/dynamic` with `ssr: false`.

## Configuration cheatsheet

| Need | Set |
|---|---|
| Aspect ratio (e.g. cover photo)         | `crop-shape="16:9"` |
| Custom ratio                            | `crop-shape="2.35:1"` |
| Free crop                               | `crop-shape="free"` |
| Round avatar                            | `crop-shape="circle"` |
| Fixed "window" crop (avatar / phone)    | `variant="fixed"` — editor box is the frame, photo cover-fit + panned underneath, no resize handles. Combine with any `crop-shape`. Default is `variant="classic"` (movable/resizable frame). |
| Restrict the toolbar shape palette      | `availableShapes={['free','square','circle','16:9']}` |
| Pre-fill a saved crop                   | `initial-crop='{"x":0.1,"y":0.1,"width":0.8,"height":0.8}'` |
| Hide the toolbar                        | `show-toolbar="false"` (drive via `ref` instead) |
| Print bleed guides                      | `show-bleed-margin` + `bleed-margin-size="20"` |
| Disable mouse wheel zoom                | `wheel-zoom="false"` |

## Theming

Most apps need only one tweak — the brand colour:

```css
sfx-crop { --sfx-cr-primary: #ff3366; }
```

For deeper restyling, set any `--sfx-cr-*` token (see the README's *CSS Custom Properties* section). For dark UIs, pass `theme="dark"`.

## Save flow — three options

1. **Built-in `save()` event**: call `cropEl.save()` and listen for `sfx-crop-save`. You receive a `Blob`, a data URL, and a serialisable `params` object.
2. **Direct export**: `await cropEl.toBlob('image/jpeg', 0.9)` — when you don't want the event side-effect.
3. **Server-side rendering**: read `cropEl.toTransformParams()` (rotation/flip/scale/crop in original-image pixels) and POST it to a backend resizer (Cloudimage, Imgix, sharp). The component itself never has to render the full-resolution output.

## Events to bridge

All events are `bubbles: true, composed: true`:

- `sfx-crop-ready` — controller initialised; safe to call imperative methods.
- `sfx-crop-image-load` — image decoded; useful for hiding spinners.
- `sfx-crop-change` — any transform mutation; throttle if you mirror it to state.
- `sfx-crop-crop-change` — crop rect changed; useful for live previews.
- `sfx-crop-save` / `sfx-crop-cancel` — terminal states from `.save()` / `.cancel()`.
- `sfx-crop-error` — image-load or export failure.

In React, use the matching `on*` props (`onReady`, `onImageLoad`, `onChange`, `onCropChange`, `onSave`, `onCancel`, `onError`) instead of attaching listeners.

## Sizing

`<sfx-crop>` is a block element that auto-fits its parent's content box and keeps the photo's aspect ratio. To pin a max size, set CSS on the host:

```css
sfx-crop { max-width: 800px; max-height: 600px; display: block; margin: 0 auto; }
```

## TypeScript

Types ship with the package — no `@types/*` install needed. The most useful ones for integrators:

- `SfxCropElement` — the element instance type.
- `SfxCropProps` — React prop type.
- `CropRect`, `TransformState`, `TransformParams` — payload shapes for events and exports.
- `CropShapeName` — accepts both built-in presets and any `"W:H"` ratio string.

Import them from the same entry you use for the runtime:

```ts
import type { SfxCropProps, TransformParams } from '@scaleflex/crop/react';
```

## Common pitfalls — fix proactively

- **`<sfx-crop>` renders blank.** The `define` module wasn't imported. Add `import '@scaleflex/crop/define'` at the app entry, or use the React wrapper which does it for you.
- **`Cannot find name 'sfx-crop'` in JSX.** Use the `<SfxCrop>` React component, not the lowercase tag, when in `.tsx`.
- **Imperative method throws "not connected".** Wait for `sfx-crop-ready` (or `useSfxCrop().ready`) before calling methods.
- **Cropped output is the wrong size.** `outputType` defaults to PNG; pass `'image/jpeg'` + `outputQuality` for photos. Set `maxOutputWidth` / `maxOutputHeight` to cap large images.
- **SSR error about `customElements`.** Mark the importer as client-only (`'use client'` / `next/dynamic` `ssr: false`).

## What this skill should NOT do

- Don't invent attributes or methods. The full surface lives in this repo's `README.md` and `src/elements/sfx-crop.ts` — read them rather than guessing.
- Don't restyle by editing the package — always do it from the consumer side via CSS variables or `::part()` selectors.
- Don't add the React wrapper to a non-React project just because it's familiar. Use the bare custom element.
