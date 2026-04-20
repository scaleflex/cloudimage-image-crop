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

export type CropShapeName = 'free' | 'square' | 'circle' | 'rounded-rect' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';

/** @deprecated Use CropShapeName instead */
export type CropShape = CropShapeName;

/** @deprecated Renamed to `SfxCropConfig` in 2.0.0. */
export type CICropViewConfig = SfxCropConfig;

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
  gridOpacity: number;
}

// === Hit Test ===

export interface HitTarget {
  type: 'handle' | 'crop-area' | 'outside' | 'none';
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
 * Internal config shape. Consumers interact with `<sfx-crop>` via attributes
 * and properties — see the element's `@property` declarations in
 * `src/elements/sfx-crop.ts` for the authoritative public API. This interface
 * is shared with `crop-controller` so attribute deltas and defaults stay
 * aligned with the element.
 */
export interface SfxCropConfig {
  /** Image source URL */
  src: string;

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
  /** Show vertical flip button */
  showFlipVButton: boolean;
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
// `SfxCropElement` in `src/elements/sfx-crop.ts`. The former `CICropViewInstance`
// interface was removed in 2.0.0 because consumers now hold an element ref.
