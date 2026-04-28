import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from 'react';
import type { SfxCropElement } from '../elements/sfx-crop';
import type {
  CropShapeName,
  CropRect,
  TransformState,
  TransformParams,
  CropIconOverrides,
} from '../core/types';

// Auto-register the custom element as soon as this module loads in the
// browser. Guarded for SSR.
if (typeof customElements !== 'undefined') {
  void import('../define');
}

export type { SfxCropElement };

export interface SfxCropSaveDetail {
  blob: Blob;
  dataURL: string;
  params: TransformParams;
}

export interface SfxCropProps {
  // --- Core config ---
  src?: string;
  cropShape?: CropShapeName;
  theme?: 'light' | 'dark';
  initialCrop?: CropRect | null;
  initialRotation?: number;
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
  minCropSize?: number;
  availableShapes?: CropShapeName[];
  /** Per-slot icon overrides — see `CropIconOverrides` in the core types. */
  icons?: CropIconOverrides;
  handleSize?: number;
  handleColor?: string;
  borderRadius?: number;
  overlayColor?: string;
  outputType?: string;
  outputQuality?: number;
  maxOutputWidth?: number;
  maxOutputHeight?: number;

  // --- UI toggles ---
  showGrid?: boolean | 'interaction';
  showToolbar?: boolean;
  showRotateSlider?: boolean;
  showZoomSlider?: boolean;
  showShapeSelector?: boolean;
  showRotateButton?: boolean;
  showFlipButton?: boolean;
  toolbarPosition?: 'top' | 'bottom';
  showBleedMargin?: boolean;
  bleedMarginSize?: number;
  bleedMarginColor?: string;

  // --- Behaviour ---
  enableAnimations?: boolean;
  animationSpeed?: number;
  keyboard?: boolean;
  pinchZoom?: boolean;
  wheelZoom?: boolean;

  // --- Event callbacks (bridged from CustomEvent.detail) ---
  onReady?: (detail: { element: SfxCropElement }) => void;
  onImageLoad?: (detail: { image: HTMLImageElement }) => void;
  onChange?: (state: TransformState) => void;
  onCropChange?: (crop: CropRect) => void;
  onSave?: (detail: SfxCropSaveDetail) => void;
  onCancel?: () => void;
  onError?: (detail: { error: Error }) => void;

  // --- Layout passthrough ---
  className?: string;
  style?: CSSProperties;
  id?: string;
}

/**
 * Writes a property on the underlying element *if* the property key exists on
 * the custom-element class. Falls back to setAttribute for values that survive
 * as strings.
 *
 * Using properties (not attributes) for arrays/objects keeps identity intact
 * so Lit's diff doesn't thrash.
 */
function applyPropOrAttr(el: SfxCropElement, key: string, value: unknown): void {
  if (value === undefined) return;

  if (key in el) {
    (el as unknown as Record<string, unknown>)[key] = value;
    return;
  }

  const attr = key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  if (value === null || value === false) {
    el.removeAttribute(attr);
  } else if (value === true) {
    el.setAttribute(attr, '');
  } else {
    el.setAttribute(attr, String(value));
  }
}

/**
 * Property names (camelCase) that `<sfx-crop>` reads directly. Listed once so
 * the React wrapper stays in sync with the element class. `src` is omitted on
 * purpose — it's applied separately AFTER this loop so a src change kicks off
 * `loadImage()` with all other config already in place.
 */
const FORWARDED_PROPS: readonly (keyof SfxCropProps)[] = [
  'cropShape', 'theme', 'initialRotation', 'initialScale', 'initialCrop',
  'minScale', 'maxScale', 'minCropSize', 'availableShapes', 'handleSize', 'handleColor',
  'borderRadius', 'overlayColor', 'outputType', 'outputQuality', 'maxOutputWidth',
  'maxOutputHeight', 'showGrid',
  'showToolbar', 'showRotateSlider', 'showZoomSlider', 'showShapeSelector',
  'showRotateButton', 'showFlipButton', 'toolbarPosition',
  'showBleedMargin', 'bleedMarginSize', 'bleedMarginColor', 'enableAnimations',
  'animationSpeed', 'keyboard', 'pinchZoom', 'wheelZoom',
  'icons',
];

/**
 * `<SfxCrop>` — React wrapper around the `<sfx-crop>` custom element.
 *
 * Pattern follows `@scaleflex/uploader`'s React wrapper: hand-rolled
 * `forwardRef` + dynamic `import('../define')` at module load to auto-register
 * the element, + `useEffect` bridges from CustomEvent to prop callbacks.
 *
 * Stale-closure avoidance: the latest props sit in a mutable ref updated on
 * every render. The event-bridge `useEffect` attaches listeners once and
 * reads `cbRef.current.on*` at fire time — no re-subscription on re-render.
 *
 * Prop sync: runs on every render without a deps array. Operations are
 * idempotent (Lit compares before assigning), so the cost is a cheap walk
 * of FORWARDED_PROPS.
 *
 * The ref is the bare element. The factory runs after React's commit phase,
 * so `ref.current` is non-null once a parent component can actually read it.
 * If you need to access methods before the first commit (e.g. during render),
 * guard with `ref.current?.method?.()` or wait for `sfx-crop-ready`.
 */
export const SfxCrop = forwardRef<SfxCropElement, SfxCropProps>(function SfxCrop(
  props,
  forwardedRef,
) {
  const elRef = useRef<SfxCropElement | null>(null);
  const cbRef = useRef<SfxCropProps>(props);
  cbRef.current = props;

  useImperativeHandle(forwardedRef, () => elRef.current as SfxCropElement, []);

  // --- Event bridge (attached once; reads latest callbacks via cbRef) ---
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const handlers: Array<[string, EventListener]> = [
      ['sfx-crop-ready',       (e) => cbRef.current.onReady?.((e as CustomEvent).detail)],
      ['sfx-crop-image-load',  (e) => cbRef.current.onImageLoad?.((e as CustomEvent).detail)],
      ['sfx-crop-change',      (e) => cbRef.current.onChange?.((e as CustomEvent).detail)],
      ['sfx-crop-crop-change', (e) => cbRef.current.onCropChange?.((e as CustomEvent).detail)],
      ['sfx-crop-save',        (e) => cbRef.current.onSave?.((e as CustomEvent).detail)],
      ['sfx-crop-cancel',      () => cbRef.current.onCancel?.()],
      ['sfx-crop-error',       (e) => cbRef.current.onError?.((e as CustomEvent).detail)],
    ];

    for (const [name, h] of handlers) el.addEventListener(name, h);
    return () => {
      for (const [name, h] of handlers) el.removeEventListener(name, h);
    };
  }, []);

  // --- Property sync (every render; idempotent) ---
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    for (const k of FORWARDED_PROPS) applyPropOrAttr(el, k as string, props[k]);
    // `src` last so a change triggers `loadImage` after other config applies.
    applyPropOrAttr(el, 'src', props.src);
  });

  return createElement('sfx-crop', {
    ref: elRef,
    className: props.className,
    style: props.style,
    id: props.id,
  });
});
