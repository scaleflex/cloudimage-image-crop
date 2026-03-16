# js-cloudimage-crop — Specification

Interactive image crop tool with rotation, flip, zoom, and shape constraints.
Inspired by Pintura's crop interface style. Part of the Scaleflex js-cloudimage-* family.

---

## Table of Contents

1. [Overview](#1-overview)
2. [UI/UX Design](#2-uiux-design)
3. [Luxury Animations](#3-luxury-animations)
4. [Technical Architecture](#4-technical-architecture)
5. [Public API](#5-public-api)
6. [Configuration](#6-configuration)
7. [Canvas Rendering Pipeline](#7-canvas-rendering-pipeline)
8. [Transform System](#8-transform-system)
9. [Interaction System](#9-interaction-system)
10. [Export System](#10-export-system)
11. [Accessibility](#11-accessibility)
12. [Project Structure](#12-project-structure)
13. [Build & Distribution](#13-build--distribution)

---

## 1. Overview

### 1.1 Purpose

A framework-agnostic JavaScript library for interactive image cropping. Provides a
canvas-based crop interface with rotation, flip, zoom, and aspect ratio constraints.

### 1.2 Goals

- Premium, Pintura-inspired visual experience with luxury animations
- Zero runtime dependencies (Canvas 2D API only)
- Framework-agnostic core with optional React wrapper
- Lightweight bundle (~15-25KB gzipped)
- Touch, mouse, keyboard, and stylus support
- WCAG 2.1 AA accessible
- TypeScript-first with full type safety

### 1.3 Tools

| Tool | Description |
|------|-------------|
| **Rotation Left** | Rotate image 90° counter-clockwise |
| **Flip Horizontal** | Mirror image horizontally |
| **Crop Shape** | Select crop shape: free, square, circle, 16:9, 4:3, 3:2 |
| **Rotation Slider** | Fine rotation -45° to +45° with snap-to-zero |
| **Scale/Zoom** | Zoom slider + mouse wheel + pinch gesture |

---

## 2. UI/UX Design

### 2.1 Overall Layout

```
┌─────────────────────────────────────────────────────────────┐
│                        Container                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │                   Canvas Area                         │  │
│  │       ┌─────────────────────────────┐                 │  │
│  │       │ ■─────────────┬──────────■  │                 │  │
│  │       │ │             │          │  │  ← dark overlay │  │
│  │       │ │─────────────┼──────────│  │    outside crop │  │
│  │       │ │             │          │  │                 │  │
│  │       │ ■─────────────┴──────────■  │                 │  │
│  │       └─────────────────────────────┘                 │  │
│  │              ■ = resize handles                        │  │
│  │              ┼ = rule of thirds grid                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  [⟲] [⇆]  │  -45° ────────●──────── +45°  │  [▭ ▾]  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          − ──────────────●────────────── +             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Sections (top to bottom):**
1. **Canvas area** — image with crop overlay, handles, grid
2. **Main toolbar** — action buttons + rotation slider + shape selector
3. **Zoom bar** — scale slider with min/max indicators

### 2.2 Visual Style

#### Color Palette (Dark Theme — Default)

| Element | Color | Usage |
|---------|-------|-------|
| Container background | `#1a1a1a` | Main background |
| Canvas background | `#111111` | Behind image |
| Overlay mask | `rgba(0, 0, 0, 0.55)` | Area outside crop |
| Crop frame | `#ffffff` | Crop border |
| Crop frame shadow | `rgba(0, 0, 0, 0.3)` | Inner shadow for contrast |
| Handle fill | `#ffffff` | Resize handles |
| Handle border | `rgba(0, 0, 0, 0.25)` | Handle outline |
| Grid lines | `rgba(255, 255, 255, 0.35)` | Rule of thirds |
| Toolbar background | `rgba(28, 28, 30, 0.92)` | Bottom toolbar |
| Toolbar text | `#f0f0f0` | Labels, values |
| Button hover | `rgba(255, 255, 255, 0.08)` | Button hover state |
| Button active | `rgba(255, 255, 255, 0.14)` | Button pressed |
| Slider track | `rgba(255, 255, 255, 0.15)` | Slider background |
| Slider fill | `#4fc3f7` | Active portion of slider |
| Slider thumb | `#ffffff` | Slider handle |
| Accent color | `#4fc3f7` | Active states, highlights |
| Dropdown bg | `rgba(38, 38, 40, 0.96)` | Shape selector dropdown |
| Dropdown hover | `rgba(255, 255, 255, 0.06)` | Dropdown item hover |
| Error color | `#ff6b6b` | Error states |
| Success color | `#69db7c` | Success feedback |

#### Color Palette (Light Theme)

| Element | Color |
|---------|-------|
| Container background | `#f5f5f7` |
| Canvas background | `#e8e8e8` |
| Overlay mask | `rgba(0, 0, 0, 0.4)` |
| Toolbar background | `rgba(255, 255, 255, 0.92)` |
| Toolbar text | `#1d1d1f` |
| Button hover | `rgba(0, 0, 0, 0.05)` |
| Slider track | `rgba(0, 0, 0, 0.12)` |
| Slider fill | `#0071e3` |
| Accent color | `#0071e3` |
| Dropdown bg | `rgba(255, 255, 255, 0.96)` |

#### Typography

- Font family: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Slider value label: `11px`, `font-variant-numeric: tabular-nums` (monospace digits)
- Dropdown items: `13px`, `font-weight: 400`
- No bold text in toolbar (lightweight feel)

#### Border Radius

| Element | Radius |
|---------|--------|
| Container | `12px` |
| Toolbar | `10px` |
| Buttons | `8px` |
| Slider thumb | `50%` (circle) |
| Dropdown | `10px` |
| Dropdown items | `6px` |
| Crop handles (corner) | `2px` |

#### Shadows

| Element | Shadow |
|---------|--------|
| Toolbar | `0 -4px 20px rgba(0, 0, 0, 0.25)` |
| Dropdown | `0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)` |
| Slider thumb (hover) | `0 0 0 4px rgba(79, 195, 247, 0.25)` |
| Crop handles (hover) | `0 0 0 3px rgba(79, 195, 247, 0.3)` |

### 2.3 Toolbar Design

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌────┐ ┌────┐   │   -45°  ─────────●─────────  +45°   │  ┌────────┐ │
│  │ ⟲  │ │ ⇆  │   │         ─12.3°                      │  │ ▭ Free▾│ │
│  └────┘ └────┘   │                                      │  └────────┘ │
│                                                                │
│   Actions         │         Rotation Slider              │  Shape      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Left section — Action Buttons:**
- **Rotate Left** button: 36×36px, SVG icon 20×20px
- **Flip Horizontal** button: 36×36px, SVG icon 20×20px
- Gap between buttons: `4px`
- Separated from center by `1px` vertical divider (`rgba(255,255,255,0.1)`)

**Center section — Rotation Slider:**
- Range: `-45°` to `+45°`, step: `0.1°`
- Labels: `-45°` left, `+45°` right, in `rgba(255,255,255,0.4)`
- Current value displayed below slider center: e.g., `−12.3°`
- Track height: `3px`, border-radius: `1.5px`
- Thumb: `14px` diameter circle
- **Snap-to-zero**: when value is within ±2° of 0, snaps to exactly 0° with haptic-like feedback
- **Double-click** on track resets to 0°
- Center tick mark: subtle `1px` vertical line at 0° position

**Right section — Shape Selector:**
- Dropdown trigger button: icon + label (e.g., `▭ Free`)
- Min-width: `80px`, height: `36px`
- Chevron indicator `▾` right-aligned
- Opens dropdown upward (above toolbar)

#### Button States

| State | Visual |
|-------|--------|
| **Default** | Transparent bg, white icon at 80% opacity |
| **Hover** | `rgba(255,255,255,0.08)` bg, icon at 100% opacity, scale: 1.02 |
| **Active/Pressed** | `rgba(255,255,255,0.14)` bg, scale: 0.96 |
| **Disabled** | Icon at 30% opacity, no hover effect, `cursor: not-allowed` |
| **Focus-visible** | `2px` outline `#4fc3f7`, `2px` offset |

### 2.4 Crop Overlay

#### Mask
- Entire canvas covered with `rgba(0, 0, 0, 0.55)`
- Crop area is cut out (fully transparent)
- Smooth transition: mask opacity animates from 0 → 0.55 on first render

#### Crop Frame
- **Border**: `2px` solid white with `1px` inner dark shadow (for contrast on bright images)
- **Corner handles**: `12×12px` white squares, `2px` border-radius, positioned at corners
- **Edge handles**: `24×6px` (horizontal) or `6×24px` (vertical) white rectangles at edge midpoints
- Handle hit area: minimum `44×44px` (invisible, for touch accessibility)

#### Circle Crop Mode
- Same overlay logic but crop area is cut as an ellipse
- Handles are still at bounding rect corners/edges
- Visible circular guideline inside the crop area: `1px` dashed `rgba(255,255,255,0.3)`

### 2.5 Grid (Rule of Thirds)

- **2 horizontal + 2 vertical** lines dividing crop area into 9 equal cells
- Color: `rgba(255, 255, 255, 0.35)`, width: `0.5px`
- **Visibility behavior**:
  - Hidden by default (opacity: 0)
  - Fades in when user starts dragging/resizing crop (opacity → 0.35 over 150ms)
  - Fades out 400ms after interaction ends (opacity → 0 over 200ms)
- Grid can be set to always visible via config (`showGrid: true`)

### 2.6 Zoom Bar

```
┌────────────────────────────────────────────────────────────┐
│     −   ════════════════════●════════════════════   +      │
└────────────────────────────────────────────────────────────┘
```

- Range: `minScale` (default 0.5) to `maxScale` (default 5.0)
- **Logarithmic feel**: more precision at lower zoom values
- Track height: `3px`
- Thumb: `14px` circle
- `−` / `+` icons at ends: `16px`, `rgba(255,255,255,0.5)`, clickable (step ±0.1)
- Current scale percentage shown on thumb hover tooltip: e.g., `150%`
- Background: `rgba(28, 28, 30, 0.6)` — slightly more transparent than main toolbar

### 2.7 Shape Selector Dropdown

```
┌──────────────────┐
│  ▭  Free         │  ← current selection (highlighted)
│  ■  Square       │
│  ●  Circle       │
│  ▬  16:9         │
│  ▬  4:3          │
│  ▬  3:2          │
│  ▬  2:3          │
│  ▬  9:16         │
└──────────────────┘
```

- Opens **upward** from the shape button (dropdown appears above toolbar)
- Width: `160px`
- Item height: `36px`
- Each item: icon (20×20px) + label text
- Current selection: `rgba(79, 195, 247, 0.12)` background + accent color icon
- Hover: `rgba(255, 255, 255, 0.06)` background
- **Opening animation**: scale from 0.95 → 1.0 + opacity 0 → 1, 180ms ease-out
- **Closing animation**: scale 1.0 → 0.95 + opacity 1 → 0, 120ms ease-in
- Click outside or Escape to close
- Keyboard: arrow up/down to navigate, Enter to select

### 2.8 Cursor States

| Zone | Cursor |
|------|--------|
| Inside crop area (idle) | `move` |
| Inside crop area (dragging) | `grabbing` |
| Outside crop area (on image) | `crosshair` |
| Corner handle NW / SE | `nwse-resize` |
| Corner handle NE / SW | `nesw-resize` |
| Edge handle N / S | `ns-resize` |
| Edge handle E / W | `ew-resize` |
| Handle hover | resize cursor + handle glow effect |
| Outside image | `default` |
| Rotate slider dragging | `ew-resize` |
| Zoom slider dragging | `ew-resize` |
| Toolbar buttons | `pointer` |
| Disabled button | `not-allowed` |

Note: When image is rotated, cursor angles adjust to match the rotation.

### 2.9 Interface States

#### Loading State
- Canvas shows pulsing placeholder: rounded rect with gradient shimmer animation
- Toolbar buttons disabled (30% opacity)
- Optional progress bar at top of canvas

#### Idle State (image loaded, no interaction)
- Image displayed with crop overlay
- Grid hidden
- Handles visible at normal size
- All toolbar controls active

#### Interaction State (user dragging/resizing)
- Grid fades in (150ms)
- Active handle scales up 1.2x
- Crop frame gets subtle blue glow: `0 0 0 2px rgba(79, 195, 247, 0.3)`
- Live dimension display: e.g., `1920 × 1080` in small label above crop area

#### Export State
- Brief overlay flash (white, 100ms) — "shutter" effect
- Success: green checkmark toast (auto-dismiss 2s)
- Error: red toast with message (auto-dismiss 5s)

#### Empty State (no image)
- Canvas shows: dashed border + "Drop image here or click to upload" text
- Upload icon centered, 48×48px, `rgba(255,255,255,0.3)`
- Toolbar hidden or disabled

#### Error State (image failed to load)
- Canvas shows: error icon + "Failed to load image" text
- Retry button centered

### 2.10 Responsive Behavior

#### Desktop (>768px)
- Full layout as described above
- All toolbar elements visible
- Handles at standard size

#### Tablet (480-768px)
- Toolbar wraps: action buttons on first row, slider on second row
- Shape selector becomes icon-only (no text label)
- Handles slightly larger (16×16px corners) for better touch targets

#### Mobile (<480px)
- Toolbar becomes compact:
  ```
  ┌──────────────────────────────┐
  │ [⟲] [⇆]  [▭▾]             │
  │ -45° ─────●───── +45°       │
  │ −  ──────────●────────  +   │
  └──────────────────────────────┘
  ```
- Action buttons smaller: 32×32px
- Handles larger: 18×18px (easier to grab)
- Minimum canvas height: 200px
- Zoom bar can be hidden via config

### 2.11 Touch Interactions

| Gesture | Action |
|---------|--------|
| **Single tap** on crop area | Select for keyboard control |
| **Single drag** inside crop | Move crop area |
| **Single drag** on handle | Resize crop |
| **Single drag** outside crop | Create new crop selection |
| **Two-finger pinch** | Zoom in/out on pinch center |
| **Two-finger rotate** | Fine rotation (optional, if enabled) |
| **Double-tap** | Reset zoom to fit |
| **Long-press** on handle | Haptic feedback (if available) + start resize |

Touch targets: All interactive elements have minimum `44×44px` touch area.

---

## 3. Luxury Animations

All animations are driven by a spring/lerp system in the render loop, not CSS transitions.
This gives complete frame-level control and avoids layout thrashing.

### 3.1 Animation Engine

```typescript
interface SpringConfig {
  stiffness: number;   // Spring stiffness (default: 200)
  damping: number;     // Damping ratio (default: 20)
  mass: number;        // Mass (default: 1)
  precision: number;   // Settle threshold (default: 0.01)
}

interface LerpConfig {
  factor: number;      // Interpolation factor per frame (0-1, default: 0.15)
  precision: number;   // Snap threshold (default: 0.001)
}
```

Two animation modes:
- **Spring**: for physical-feeling animations (rotate, flip, bounce handles)
- **Lerp**: for smooth transitions (opacity fades, scale changes)

### 3.2 Smooth Rotate 90°

- **Trigger**: Click "Rotate Left" button
- **Animation**: Spring-based rotation from current angle to target angle
- **Spring config**: `{ stiffness: 180, damping: 22, mass: 1 }`
- **Behavior**: Slight overshoot (~3°) past target, then settles back
- **Duration**: ~400ms to visual settle
- **Image stays sharp**: renders at target angle once settled (no sub-pixel blur)
- **Crop rect**: smoothly rotates and reshapes to maintain coverage

### 3.3 3D Flip with Perspective

- **Trigger**: Click "Flip Horizontal" button
- **Animation**: Simulated perspective flip on Y axis
  1. Image scales X from `1.0 → 0.0` (first 150ms, ease-in)
  2. At scale 0 (edge-on): swap to flipped image
  3. Image scales X from `0.0 → 1.0` (next 200ms, ease-out with slight overshoot)
- **Enhancement**: During flip, slight Y-axis tilt (2-3px parallax shift)
- **Canvas**: Brief brightness increase at the "fold point" (flash effect)
- **Duration**: ~350ms total

### 3.4 Zoom with Inertia

- **Trigger**: Mouse wheel or pinch gesture
- **Behavior**: Scale change has momentum that decays over time
- **Deceleration**: `velocity *= 0.92` per frame
- **Threshold**: Stop when `|velocity| < 0.001`
- **Boundary bounce**: If zoom goes past min/max, elastic bounce back with spring
- **Center**: Zoom centers on cursor/pinch midpoint, not canvas center

### 3.5 Morph Crop Shape

- **Trigger**: Change crop shape (e.g., Free → 16:9, Square → Circle)
- **Animation**: Crop rect smoothly morphs from current to target dimensions
- **Lerp config**: `{ factor: 0.12 }`
- **Duration**: ~300ms
- **Behavior**: All four edges animate simultaneously to new positions
- **Circle transition**: Corner radius animates from 0 → 50% (or vice versa)
- **Aspect ratio**: Intermediate frames maintain smooth interpolated ratio

### 3.6 Fade Grid

- **Show trigger**: Start of any crop drag/resize interaction
- **Hide trigger**: 400ms after interaction ends
- **Fade in**: Opacity `0 → 0.35` over `150ms`, ease-out
- **Fade out**: Opacity `0.35 → 0` over `200ms`, ease-in
- **Implementation**: Grid alpha value animated via lerp in render loop

### 3.7 Parallax Image Shift

- **Trigger**: Moving crop area (drag)
- **Effect**: Image shifts in the opposite direction of crop drag by `factor: 0.03`
- **Result**: Subtle depth perception — crop "slides over" the image
- **Implementation**: Small pan offset applied to image transform during crop drag
- **Reset**: When drag ends, image smoothly returns to normal position (lerp, 200ms)

### 3.8 Bounce Handles

- **Trigger**: Mouse hover over a resize handle
- **Animation**: Handle scales `1.0 → 1.25 → 1.15` (elastic settle)
- **Spring config**: `{ stiffness: 400, damping: 15, mass: 0.5 }`
- **Duration**: ~250ms
- **Enhancement**: Subtle glow ring appears: `0 0 0 3px rgba(79, 195, 247, 0.3)`
- **Leave**: Reverse animation, handle scales back to 1.0 (lerp, 150ms)

### 3.9 Entry/Exit Toolbar

- **Entry** (on component init / image loaded):
  1. Toolbar starts `12px` below final position, opacity `0`
  2. Slides up to final position with opacity → `1`
  3. Lerp factor: `0.12`, duration: ~250ms
  4. Stagger: zoom bar appears 60ms after main toolbar

- **Exit** (on destroy / before image change):
  1. Reverse of entry: slides down `8px`, opacity → `0`
  2. Duration: ~150ms (faster than entry)

### 3.10 Additional Micro-Animations

- **Slider thumb grab**: Scale `1.0 → 1.2` on mousedown, `1.2 → 1.0` on mouseup
- **Rotation snap-to-zero**: When snapping, brief pulse effect on the 0° tick mark
- **Button click**: Scale `1.0 → 0.94 → 1.0` (40ms down, 120ms up)
- **Dropdown items**: Staggered fade-in, 20ms delay between items
- **Crop creation**: New crop area scales from center `0 → 1`, 200ms spring
- **Image load**: Fade in from 0 → 1 opacity, 300ms

### 3.11 Reduced Motion

When `prefers-reduced-motion: reduce` is active:
- All spring/lerp animations complete instantly (snap to target)
- Opacity transitions reduced to 50ms max
- No parallax effect
- No bounce on handles
- Grid appears/disappears instantly
- Toolbar appears instantly (no slide)

---

## 4. Technical Architecture

### 4.1 Core Patterns (from Scaleflex conventions)

| Pattern | Implementation |
|---------|---------------|
| Instance Registry | Static `Map<HTMLElement, CICropView>` prevents duplicates |
| Factory Functions | `createElement()`, `createToolbar()` for DOM creation |
| CSS Ref-Counting | `injectStyles()` / `removeStyles()` — inject once, cleanup on last destroy |
| Config Merging | `DEFAULT_CONFIG` + deep merge + validate + data-attribute parsing |
| Handle Pattern | Factory returns `{ element, methods, destroy() }` |
| Destroy Pattern | Guard → cancel async → dispose children → remove DOM → release CSS |
| Dirty-Flag Rendering | rAF loop renders only when `dirty === true` |
| Immutable State | Pure functions produce new `TransformState` objects |

### 4.2 Data Flow

```
User Action (click/drag/keyboard)
  → Interaction handler
  → Pure transform function → new TransformState
  → CICropView stores new state
  → renderer.markDirty()
  → Next rAF: render(image, animatedState)
  → Fire onChange callback
```

### 4.3 Animation Data Flow

```
State Change → Set targetState
  → Each rAF frame:
    → displayState = spring/lerp(displayState, targetState)
    → render(image, displayState)
    → if (displayState ≈ targetState) → snap & stop animation
```

### 4.4 Coordinate Spaces

| Space | Description | Used For |
|-------|-------------|----------|
| **Original Image** | Full resolution pixels (e.g., 4000×3000) | Export |
| **Canvas** | Displayed pixels on screen | Rendering, hit testing |
| **Normalized [0,1]** | Fraction of (transformed) image bounds | Storing crop rect |

Conversion functions: `imageToCanvas()`, `canvasToImage()`, `normalizedToCanvas()`, `canvasToNormalized()`

---

## 5. Public API

### 5.1 Constructor

```typescript
const crop = new CICropView(element: HTMLElement | string, config?: Partial<CICropViewConfig>);
```

- `element`: DOM element or CSS selector string
- If an instance already exists on this element, it is destroyed first

### 5.2 Static Methods

```typescript
CICropView.autoInit(root?: HTMLElement): CICropView[];
```
Scans for `[data-ci-crop-src]` elements and creates instances.

### 5.3 Instance Methods

```typescript
// Image
loadImage(src: string): Promise<void>;

// Transforms
rotateLeft(): void;                          // Rotate 90° CCW (animated)
flipHorizontal(): void;                      // Flip H (animated)
setRotation(degrees: number): void;          // Fine rotation (-45 to +45)
setScale(scale: number): void;               // Set zoom level

// Crop
setCropShape(shape: string): void;           // 'free' | 'square' | 'circle' | '16:9' | etc.
setCropRect(rect: CropRect): void;           // Programmatically set crop region
getCropRect(): CropRect;                     // Get crop in original image coordinates
getTransformState(): TransformState;         // Get full transform parameters

// Export
toCanvas(): HTMLCanvasElement;               // Export cropped image as canvas
toBlob(type?: string, quality?: number): Promise<Blob>;
toDataURL(type?: string, quality?: number): string;
toTransformParams(): TransformParams;        // For server-side processing

// Lifecycle
reset(): void;                               // Reset all transforms to initial
update(config: Partial<CICropViewConfig>): void;  // Update config dynamically
destroy(): void;                             // Full cleanup
```

### 5.4 Events / Callbacks

```typescript
onChange?: (state: TransformState) => void;   // Any state change
onCropChange?: (crop: CropRect) => void;      // Crop rect changed
onImageLoad?: (image: HTMLImageElement) => void;
onError?: (error: Error) => void;
onReady?: (instance: CICropViewInstance) => void;
```

### 5.5 Types

```typescript
interface CropRect {
  x: number;       // Left edge (original image pixels)
  y: number;       // Top edge (original image pixels)
  width: number;   // Width (original image pixels)
  height: number;  // Height (original image pixels)
}

interface TransformState {
  rotation: number;        // Fine rotation degrees (-45 to 45)
  quarterTurns: number;    // 90° rotation count (0-3)
  flipH: boolean;          // Horizontal flip
  scale: number;           // Zoom level (1.0 = fit)
  panX: number;            // Horizontal pan offset (canvas px)
  panY: number;            // Vertical pan offset (canvas px)
  cropRect: NormalizedRect; // Crop in [0,1] space
}

interface NormalizedRect {
  x: number;   // 0-1
  y: number;   // 0-1
  width: number;  // 0-1
  height: number; // 0-1
}

interface TransformParams {
  rotation: number;        // Total rotation in degrees
  flipH: boolean;
  scale: number;
  crop: CropRect;          // In original image coordinates
}

type CropShapeName = 'free' | 'square' | 'circle' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';

interface CropShape {
  type: 'free' | 'rect' | 'circle';
  ratio?: number;  // width/height ratio for 'rect' type
}

type HandlePosition = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface HitTarget {
  type: 'handle' | 'crop-area' | 'outside' | 'none';
  position?: HandlePosition;
}

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}
```

---

## 6. Configuration

### 6.1 Full Config Interface

```typescript
interface CICropViewConfig {
  // Source
  src: string;

  // Initial state
  initialCrop?: CropRect;
  initialRotation?: number;          // -45 to 45
  initialScale?: number;

  // Crop constraints
  cropShape?: CropShapeName;         // Default: 'free'
  customAspectRatios?: Array<{ name: string; ratio: number }>;
  minCropSize?: number;              // Min pixels, default: 20
  availableShapes?: CropShapeName[]; // Default: ['free','square','circle','16:9','4:3','3:2']

  // Scale constraints
  minScale?: number;                 // Default: 0.5
  maxScale?: number;                 // Default: 5

  // Theme
  theme?: 'light' | 'dark';         // Default: 'dark'

  // UI toggles
  showGrid?: boolean | 'interaction'; // Default: 'interaction'
  showRotateSlider?: boolean;         // Default: true
  showZoomSlider?: boolean;           // Default: true
  showShapeSelector?: boolean;        // Default: true
  showRotateButton?: boolean;         // Default: true
  showFlipButton?: boolean;           // Default: true
  toolbarPosition?: 'bottom' | 'top'; // Default: 'bottom'

  // Overlay
  overlayColor?: string;             // Default: 'rgba(0, 0, 0, 0.55)'

  // Handles
  handleSize?: number;               // Default: 12
  handleColor?: string;              // Default: '#ffffff'

  // Export defaults
  outputType?: string;               // Default: 'image/png'
  outputQuality?: number;            // Default: 0.92

  // Animations
  enableAnimations?: boolean;         // Default: true
  animationSpeed?: number;            // Multiplier, default: 1.0

  // Callbacks
  onChange?: (state: TransformState) => void;
  onCropChange?: (crop: CropRect) => void;
  onImageLoad?: (image: HTMLImageElement) => void;
  onError?: (error: Error) => void;
  onReady?: (instance: CICropViewInstance) => void;
}
```

### 6.2 Data Attributes

```html
<div
  data-ci-crop-src="/images/photo.jpg"
  data-ci-crop-shape="16:9"
  data-ci-crop-theme="dark"
  data-ci-crop-show-grid="interaction"
  data-ci-crop-min-scale="0.5"
  data-ci-crop-max-scale="5"
  data-ci-crop-enable-animations="true"
></div>
```

### 6.3 Default Configuration

```typescript
const DEFAULT_CONFIG: CICropViewConfig = {
  src: '',
  cropShape: 'free',
  minCropSize: 20,
  minScale: 0.5,
  maxScale: 5,
  theme: 'dark',
  showGrid: 'interaction',
  showRotateSlider: true,
  showZoomSlider: true,
  showShapeSelector: true,
  showRotateButton: true,
  showFlipButton: true,
  availableShapes: ['free', 'square', 'circle', '16:9', '4:3', '3:2'],
  toolbarPosition: 'bottom',
  overlayColor: 'rgba(0, 0, 0, 0.55)',
  handleSize: 12,
  handleColor: '#ffffff',
  outputType: 'image/png',
  outputQuality: 0.92,
  enableAnimations: true,
  animationSpeed: 1.0,
};
```

---

## 7. Canvas Rendering Pipeline

### 7.1 Renderer Architecture

Single `<canvas>` with `CanvasRenderingContext2D`. Uses dirty-flag rAF loop.

```typescript
class CanvasRenderer {
  private dirty = true;
  private animating = false;
  private animationId: number | null = null;

  markDirty(): void;       // Set dirty flag
  startLoop(): void;       // Begin rAF loop
  stopLoop(): void;        // Cancel rAF
  destroy(): void;

  // Called each frame when dirty or animating
  private render(image, displayState, options): void;
}
```

### 7.2 Layer Drawing Order (each frame)

1. **Clear** — `ctx.clearRect(0, 0, w, h)`
2. **Background** — fill with container bg color
3. **Image Layer** — draw source image with all transforms applied
4. **Overlay Layer** — semi-transparent mask with crop cutout
5. **Crop Frame** — border + handles
6. **Grid Layer** — rule of thirds (if visible)
7. **UI Overlays** — dimension labels, angle indicator (during rotation)

### 7.3 Image Layer Transform Sequence

```typescript
ctx.save();
ctx.translate(canvasWidth / 2, canvasHeight / 2);   // Center on canvas
ctx.scale(displayState.scale, displayState.scale);   // Apply zoom
ctx.translate(displayState.panX, displayState.panY); // Apply pan
ctx.rotate(totalRotationRad);                         // Quarter turns + fine rotation
if (displayState.flipH) ctx.scale(-1, 1);            // Flip
ctx.drawImage(img, -imgW/2, -imgH/2, imgW, imgH);   // Draw centered
ctx.restore();
```

### 7.4 Overlay Layer (Dark Mask with Cutout)

```typescript
ctx.save();
ctx.fillStyle = overlayColor;
ctx.fillRect(0, 0, canvasW, canvasH);               // Fill entire canvas
ctx.globalCompositeOperation = 'destination-out';
// For rectangle:
ctx.fillRect(cropX, cropY, cropW, cropH);            // Cut out crop area
// For circle:
ctx.beginPath();
ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
```

### 7.5 Resize Handling

- `ResizeObserver` on container element
- Debounced (16ms) to avoid layout thrashing
- Updates canvas size: `canvas.width = container.clientWidth * dpr`
- Recalculates image fit and crop position
- Caps `devicePixelRatio` at `2` for performance

---

## 8. Transform System

### 8.1 State Management

All transforms stored as immutable `TransformState` objects.
Mutations via pure functions:

```typescript
function createInitialState(imageSize: Size, canvasSize: Size): TransformState;
function applyRotateLeft(state: TransformState): TransformState;
function applyFlipH(state: TransformState): TransformState;
function applyRotation(state: TransformState, degrees: number): TransformState;
function applyScale(state: TransformState, scale: number, center?: Point): TransformState;
function applyCropMove(state: TransformState, dx: number, dy: number): TransformState;
function applyCropResize(state: TransformState, handle: HandlePosition, dx: number, dy: number): TransformState;
function applyShapeChange(state: TransformState, shape: CropShape): TransformState;
```

### 8.2 Transform Matrix

```typescript
function buildTransformMatrix(
  state: TransformState,
  canvasSize: Size,
  imageSize: Size
): DOMMatrix;

function imageToCanvas(point: Point, matrix: DOMMatrix): Point;
function canvasToImage(point: Point, matrix: DOMMatrix): Point;
```

### 8.3 Constraints

```typescript
function clampCropToImage(crop: NormalizedRect): NormalizedRect;
function enforceAspectRatio(crop: NormalizedRect, ratio: number, anchor: HandlePosition): NormalizedRect;
function enforceMinSize(crop: NormalizedRect, minSize: number, imageSize: Size): NormalizedRect;
function computeMinScale(imageSize: Size, canvasSize: Size, rotation: number): number;
function snapRotation(degrees: number, threshold?: number): number; // Snap near 0
```

---

## 9. Interaction System

### 9.1 Pointer Tracker

Unified input handling for mouse, touch, pointer, and stylus:

```typescript
class PointerTracker {
  constructor(element: HTMLElement, callbacks: PointerCallbacks);
  destroy(): void;
}

interface PointerCallbacks {
  onPointerDown(e: NormalizedPointerEvent): void;
  onPointerMove(e: NormalizedPointerEvent): void;
  onPointerUp(e: NormalizedPointerEvent): void;
  onPinch(e: PinchEvent): void;
  onWheel(e: WheelEvent): void;
}

interface NormalizedPointerEvent {
  x: number;        // Canvas-relative x
  y: number;        // Canvas-relative y
  pressure: number;
  pointerType: 'mouse' | 'touch' | 'pen';
}
```

### 9.2 Interaction Flow

```
PointerDown:
  1. Hit test → determine target (handle, crop area, outside)
  2. Store: dragStart, initialState, activeTarget
  3. Set cursor

PointerMove (if dragging):
  4. Compute delta from dragStart
  5. Based on activeTarget:
     - handle → applyCropResize(initialState, handle, dx, dy)
     - crop-area → applyCropMove(initialState, dx, dy)
     - outside → (optional: create new crop)
  6. Apply constraints
  7. Update state → markDirty()

PointerUp:
  8. Clear drag state
  9. Reset cursor
  10. Fire onCropChange callback
```

### 9.3 Resize Handle Logic

- Each handle affects 1 or 2 edges (e.g., NW → top + left)
- When aspect ratio locked: resize preserves ratio from opposite corner
- Minimum crop size enforced (default 20px in canvas space)
- Shift key: temporarily lock aspect ratio (in free mode)
- Alt key: resize from center

---

## 10. Export System

### 10.1 Export to Canvas

1. Create offscreen canvas at original image resolution (or crop region size)
2. Apply all transforms (rotation, flip)
3. Draw only the crop region
4. For circle shape: apply circular clip path
5. Return the canvas element

### 10.2 Export to Blob/DataURL

Wrapper around canvas export:
```typescript
toBlob(type = 'image/png', quality = 0.92): Promise<Blob>
toDataURL(type = 'image/png', quality = 0.92): string
```

### 10.3 Export to Transform Params

Returns a plain object describing the transforms for server-side processing:
```typescript
toTransformParams(): {
  rotation: number;     // Total degrees
  flipH: boolean;
  crop: { x, y, width, height };  // Original image pixels
  outputWidth: number;
  outputHeight: number;
}
```

---

## 11. Accessibility

### 11.1 ARIA

- Container: `role="application"`, `aria-roledescription="image crop tool"`, `tabindex="0"`
- Canvas: `role="img"`, dynamic `aria-label` describing crop state
- Toolbar buttons: `aria-label` for each action
- Shape selector: `role="listbox"` with `aria-activedescendant`
- Sliders: `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`
- Live region: `aria-live="polite"` announces crop changes to screen readers

### 11.2 Keyboard

| Key | Action |
|-----|--------|
| Arrow keys | Nudge crop area by 1px (5px with Shift) |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `R` | Rotate left 90° |
| `F` | Flip horizontal |
| `0` | Reset all transforms |
| `Escape` | Close dropdown / deselect |
| `Tab` | Move focus between controls |
| `Enter` / `Space` | Activate focused button |

### 11.3 Focus Management

- Focus-visible ring: `2px` outline `#4fc3f7`, `2px` offset
- Focus trapped inside dropdown when open
- Return focus to trigger button after dropdown close
- Screen reader only text for current crop state

---

## 12. Project Structure

```
js-cloudimage-crop/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── .eslintrc.cjs
├── .gitignore
├── vitest.config.ts
├── SPECIFICATION.md              ← this file
├── config/
│   ├── vite.config.ts            # ESM + CJS + UMD build
│   ├── vite.react.config.ts      # React wrapper build
│   └── vite.demo.config.ts       # Demo dev server
├── demo/
│   ├── index.html
│   └── demo.ts
├── src/
│   ├── index.ts                  # export CICropView + types
│   ├── vite-env.d.ts
│   ├── core/
│   │   ├── ci-crop-view.ts       # Main class (lifecycle, public API)
│   │   ├── config.ts             # DEFAULT_CONFIG, mergeConfig, validateConfig
│   │   └── types.ts              # All TypeScript interfaces
│   ├── canvas/
│   │   ├── renderer.ts           # rAF loop with dirty flag + animation tracking
│   │   ├── image-layer.ts        # Draw image with transforms
│   │   ├── overlay-layer.ts      # Semi-transparent mask outside crop
│   │   ├── crop-frame.ts         # Crop border + 8 handles
│   │   ├── grid-layer.ts         # Rule of thirds
│   │   └── hit-test.ts           # Determine what's under cursor
│   ├── transforms/
│   │   ├── transform-state.ts    # Immutable state + pure mutation functions
│   │   ├── matrix.ts             # 2D matrix math + coordinate conversion
│   │   └── constrain.ts          # Aspect ratio, bounds, min scale constraints
│   ├── interactions/
│   │   ├── pointer-tracker.ts    # Unified mouse + touch + pointer events
│   │   ├── drag-crop.ts          # Move crop area
│   │   ├── resize-handles.ts     # Corner + edge resize with aspect lock
│   │   ├── pinch-zoom.ts         # Two-finger zoom (touch)
│   │   └── wheel-zoom.ts         # Mouse wheel zoom
│   ├── animation/
│   │   ├── spring.ts             # Spring physics animation
│   │   └── lerp.ts               # Linear interpolation animation
│   ├── ui/
│   │   ├── toolbar.ts            # createToolbar() → ToolbarHandle
│   │   ├── rotate-slider.ts      # Fine rotation slider -45°..+45°
│   │   ├── zoom-slider.ts        # Scale slider
│   │   ├── shape-selector.ts     # Custom dropdown for crop shapes
│   │   └── icons.ts              # SVG icon strings
│   ├── export/
│   │   └── exporter.ts           # toCanvas, toBlob, toDataURL, toParams
│   ├── a11y/
│   │   ├── keyboard.ts           # Keyboard handler
│   │   └── aria.ts               # ARIA attribute helpers
│   ├── utils/
│   │   ├── dom.ts                # createElement, injectStyles, addClass
│   │   ├── events.ts             # EventEmitter, throttle
│   │   └── math.ts               # clamp, lerp, degreesToRadians, etc.
│   ├── styles/
│   │   └── index.css             # All CSS with ci-crop- prefix
│   └── react/
│       ├── index.ts
│       ├── ci-crop-viewer.tsx     # forwardRef wrapper component
│       └── use-ci-crop-view.ts    # Hook with lifecycle management
└── tests/
    ├── setup.ts
    ├── transform-state.test.ts
    ├── matrix.test.ts
    ├── constrain.test.ts
    ├── hit-test.test.ts
    ├── config.test.ts
    ├── math.test.ts
    └── exporter.test.ts
```

---

## 13. Build & Distribution

### 13.1 Output Formats

| Format | File | Global |
|--------|------|--------|
| ESM | `dist/js-cloudimage-crop.esm.js` | — |
| CJS | `dist/js-cloudimage-crop.cjs.js` | — |
| UMD | `dist/js-cloudimage-crop.min.js` | `CICropView` |
| Types | `dist/index.d.ts` | — |
| React ESM | `dist/react/index.js` | — |
| React Types | `dist/react/index.d.ts` | — |

### 13.2 Usage Examples

**CDN / UMD:**
```html
<script src="https://cdn.jsdelivr.net/npm/js-cloudimage-crop/dist/js-cloudimage-crop.min.js"></script>
<div id="crop-container"></div>
<script>
  const crop = new CICropView('#crop-container', {
    src: '/photos/landscape.jpg',
    cropShape: '16:9',
    theme: 'dark',
  });
</script>
```

**ESM:**
```typescript
import { CICropView } from 'js-cloudimage-crop';

const crop = new CICropView(document.getElementById('crop'), {
  src: '/photos/landscape.jpg',
  cropShape: 'free',
  onChange: (state) => console.log('State changed:', state),
});

// Later: export result
const blob = await crop.toBlob('image/jpeg', 0.9);
```

**React:**
```tsx
import { CICropViewer } from 'js-cloudimage-crop/react';

function App() {
  const cropRef = useRef(null);

  const handleExport = async () => {
    const blob = await cropRef.current?.toBlob('image/jpeg', 0.9);
    // ...
  };

  return (
    <CICropViewer
      ref={cropRef}
      src="/photos/landscape.jpg"
      cropShape="16:9"
      theme="dark"
      onChange={(state) => console.log(state)}
    />
  );
}
```

**Data Attributes (auto-init):**
```html
<div
  data-ci-crop-src="/photos/landscape.jpg"
  data-ci-crop-shape="16:9"
  data-ci-crop-theme="dark"
></div>
<script src="js-cloudimage-crop.min.js"></script>
<script>CICropView.autoInit();</script>
```

### 13.3 Bundle Size Target

- Core bundle: < 20KB gzipped
- With React wrapper: < 25KB gzipped
- Zero runtime dependencies
