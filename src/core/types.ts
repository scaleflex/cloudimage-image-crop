// === Geometry ===

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// === Crop Shapes ===

/**
 * Built-in shape presets. `CropShapeName` below widens this to accept any
 * free-form `"W:H"` string while keeping autocomplete on the known values
 * — the classic `T | (string & {})` idiom preserves IntelliSense but lets
 * consumers pass ad-hoc ratios like `'7:2'` or `'11:8'` without extending
 * the library.
 */
export type CropShapeBuiltin =
  // Geometry (not aspect-driven)
  | 'free'
  | 'square'
  | 'circle'
  | 'rounded-rect'
  // Canonical ratio set. Anything else — `"2.35:1"`, `"11:8"`, `"21:9"` —
  // is passed in via `availableShapes` and parsed on the fly.
  // Landscape
  | '16:9'
  | '4:3'
  | '3:2'
  | '5:4'
  | '2:1'
  // Portrait
  | '9:16'
  | '3:4'
  | '2:3'
  | '4:5'
  | '1:2';

/**
 * The full shape-name API — a built-in preset OR any consumer-supplied
 * `"W:H"` string. Runtime validation lives in `parseRatio()` and
 * `isValidShape()`.
 */
export type CropShapeName = CropShapeBuiltin | (string & {});

/**
 * Named icon slots a consumer can override. Values are raw SVG strings —
 * they're inserted via `unsafeHTML`, so treat them the same way as the
 * built-in icons: static, author-trusted content. Never pass user input.
 * Any slot left undefined falls back to the library's default SVG.
 *
 * Use from React:
 * ```tsx
 * <SfxCrop icons={{ rotateLeft: '<svg>…</svg>', loupe: '<svg>…</svg>' }} />
 * ```
 * From HTML:
 * ```js
 * document.querySelector('sfx-crop').icons = { rotateLeft: '<svg>…</svg>' };
 * ```
 */
export type CropIconOverrides = Partial<{
  /** 90° counter-clockwise rotate button in the toolbar. */
  rotateLeft: string;
  /** Flip horizontal button in the toolbar. */
  flipHorizontal: string;
  /** Collapsed fine-rotation (±45°) trigger. */
  tilt: string;
  /** Collapsed zoom trigger (magnifying glass). */
  loupe: string;
  /** `+` button inside the expanded zoom popover. */
  zoomIn: string;
  /** `−` button inside the expanded zoom popover. */
  zoomOut: string;
  /** Shape-selector trigger (generic "aspect / crop shape"). */
  cropAspect: string;
  /** "Custom" (Free) option icon in the shape dropdown. */
  cropCustom: string;
  /** Circle shape option icon. */
  cropCircle: string;
  /** Rounded-rect shape option icon. */
  cropRoundedRect: string;
  /** Landscape orientation tab icon. */
  orientLandscape: string;
  /** Portrait orientation tab icon. */
  orientPortrait: string;
  /** Chevron used on the shape-selector trigger. */
  chevronDown: string;
  /** "Reset" button in the toolbar. */
  reset: string;
}>;

/** @deprecated Use CropShapeName instead */
export type CropShape = CropShapeName;

export interface CropShapeConfig {
  type: 'free' | 'rect' | 'circle' | 'rounded-rect';
  ratio?: number; // width/height ratio for 'rect' type
}

export interface AspectRatioPreset {
  label: string;
  ratio: number | null; // null = free
  shape: 'rect' | 'ellipse';
}

// === Transform State ===

export type HandlePosition = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

export interface NormalizedRect {
  x: number;   // 0-1
  y: number;   // 0-1
  width: number;  // 0-1
  height: number; // 0-1
}

export interface CropRect {
  /** Normalized [0,1] coordinates relative to the original image */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformState {
  /** Rotation in 90° increments (0, 90, 180, 270) */
  quarterTurns: number;
  /** Fine rotation in degrees (-45 to +45) */
  rotation: number;
  /** Horizontal flip */
  flipH: boolean;
  /** Vertical flip */
  flipV: boolean;
  /** Scale / zoom level (1 = fit) */
  scale: number;
  /** Image pan offset (in canvas pixels, relative to center) */
  panX: number;
  panY: number;
  /** Crop rectangle in normalized coordinates */
  cropRect: NormalizedRect;
  /**
   * Pivot for fine-rotation, in normalized image-space. Captured when the
   * user tilts from 0°; kept stable across crop-rect edits so resizing
   * the frame does not drag the tilted photo along. Cleared on reset to 0°.
   */
  rotationPivot?: { x: number; y: number };
}

// === Display State (animated) ===

export interface DisplayState {
  quarterTurns: number;
  rotation: number;
  flipH: number; // 1 or -1, animated through 0
  flipV: number; // 1 or -1, animated through 0
  scale: number;
  panX: number;
  panY: number;
  cropRect: NormalizedRect;
  rotationPivot?: { x: number; y: number };
  gridOpacity: number;
  /**
   * True while the user is actively dragging/resizing/panning. The renderer
   * snaps cropRect and pan directly to target instead of lerping, so the
   * frame follows the cursor 1:1 instead of drifting behind it.
   */
  interactive?: boolean;
}

// === Hit Test ===

export interface HitTarget {
  type: 'handle' | 'crop-area' | 'move-handle' | 'outside' | 'none';
  position?: HandlePosition;
}

export type CursorStyle = 'default' | 'move' | 'grab' | 'grabbing' | 'crosshair'
  | 'nwse-resize' | 'nesw-resize' | 'ns-resize' | 'ew-resize' | 'not-allowed';

// === Animation ===

export interface SpringConfig {
  stiffness: number;   // Spring stiffness (default: 200)
  damping: number;     // Damping ratio (default: 20)
  mass: number;        // Mass (default: 1)
  precision: number;   // Settle threshold (default: 0.01)
}

export interface LerpConfig {
  factor: number;      // Interpolation factor per frame (0-1, default: 0.15)
  precision: number;   // Snap threshold (default: 0.001)
}

// === Config ===

/**
 * @internal
 *
 * Internal config shape shared with {@link import('./crop-controller').createCropController}
 * so attribute deltas and defaults stay aligned with the element. Consumers
 * interact with `<sfx-crop>` via HTML attributes and DOM properties — see the
 * `@property` declarations in `src/elements/sfx-crop.ts` for the public API.
 */
export interface SfxCropConfig {
  /** Image source URL */
  src: string;

  /**
   * Display variant.
   * - `'classic'` (default): photo fills the editor at its own aspect; a
   *   movable / resizable crop frame floats over it, dimmed outside.
   * - `'fixed'`: the editor area itself IS the crop frame — sized to the
   *   `cropShape` aspect and centered. The photo pans/zooms/rotates UNDER it
   *   and always covers it (no empty gaps). No resize handles; toolbar overlays
   *   the frame.
   */
  variant: 'classic' | 'fixed';

  // Initial state
  /** Initial crop rect (normalized 0-1) */
  initialCrop?: CropRect | null;
  /** Initial fine rotation degrees (-45 to 45) */
  initialRotation?: number;
  /** Initial scale/zoom level */
  initialScale?: number;

  // Crop constraints
  /** Initial crop shape */
  cropShape: CropShapeName;
  /** Custom aspect ratio presets */
  customAspectRatios?: Array<{ name: string; ratio: number }>;
  /** Minimum crop size in pixels */
  minCropSize: number;
  /** Available shapes in the selector */
  availableShapes: CropShapeName[];

  // Scale constraints
  /** Minimum zoom level */
  minScale: number;
  /** Maximum zoom level */
  maxScale: number;

  // Theme
  /** Color theme */
  theme: 'light' | 'dark';

  // UI toggles
  /** Show grid overlay during interaction */
  showGrid: boolean | 'interaction';
  /** Show rotation slider */
  showRotateSlider: boolean;
  /** Show zoom slider */
  showZoomSlider: boolean;
  /** Show shape selector */
  showShapeSelector: boolean;
  /** Show rotate button */
  showRotateButton: boolean;
  /** Show flip button */
  showFlipButton: boolean;
  /** Toolbar position */
  toolbarPosition: 'bottom' | 'top';
  /** Show toolbar */
  showToolbar: boolean;

  // Overlay
  /** Overlay mask color */
  overlayColor: string;

  // Handles
  /** Handle size in pixels */
  handleSize: number;
  /** Handle color */
  handleColor: string;
  /** Border radius for rounded-rect crop shape (in pixels) */
  borderRadius: number;

  // Export
  /** Output format for toBlob/toDataURL */
  outputType: string;
  /** Output quality (0-1) for lossy formats */
  outputQuality: number;
  /** Maximum output width (0 = original) */
  maxOutputWidth: number;
  /** Maximum output height (0 = original) */
  maxOutputHeight: number;

  // Output target
  /**
   * What `save()` emits and how a crop is meant to be consumed:
   * - `'blob'` (default): rasterize the crop on a canvas → `Blob`/`dataURL`
   *   (destructive, upload it yourself).
   * - `'cloudimage'`: skip rasterizing and emit a Cloudimage URL with the
   *   transform params (non-destructive, server-side crop on delivery).
   */
  outputMode: 'blob' | 'cloudimage';
  /** Cloudimage token (the `<token>` in `<token>.cloudimg.io`) for URL building. */
  cloudimageToken: string;
  /** Custom Cloudimage domain (default `cloudimg.io`). */
  cloudimageDomain: string;
  /** Hex fill (no `#`) for corners exposed by non-90° rotation in URL mode. */
  cloudimageBgColor: string;

  // Animations
  /** Show print bleed margin guides inside crop area */
  showBleedMargin: boolean;
  /** Bleed margin offset in pixels */
  bleedMarginSize: number;
  /** Bleed margin line color */
  bleedMarginColor: string;

  /** Enable animations */
  enableAnimations: boolean;
  /** Animation speed multiplier */
  animationSpeed: number;

  // Input toggles
  /** Enable keyboard navigation */
  keyboard: boolean;
  /** Enable pinch-to-zoom */
  pinchZoom: boolean;
  /** Enable mouse wheel zoom */
  wheelZoom: boolean;
}

// === Export ===

export interface TransformParams {
  /** Total rotation in degrees */
  rotation: number;
  /** Whether flipped horizontally */
  flipH: boolean;
  /** Whether flipped vertically */
  flipV: boolean;
  /** Scale level */
  scale: number;
  /** Crop in original image pixel coordinates */
  crop: { x: number; y: number; width: number; height: number };
  /** Output width in pixels */
  outputWidth: number;
  /** Output height in pixels */
  outputHeight: number;
}

/** @deprecated Use TransformParams instead */
export type CropResult = TransformParams;

// === Instance ===
//
// The public imperative instance is the `<sfx-crop>` element itself — see
// `SfxCropElement` in `src/elements/sfx-crop.ts`. No separate interface is
// needed because consumers hold an element ref.
