import { forwardRef, useImperativeHandle } from 'react';
import { useCICropView } from './use-ci-crop-view';
import type { CICropViewConfig, CICropViewInstance } from '../core/types';

export interface CICropViewerProps extends Partial<CICropViewConfig> {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}

export type CICropViewerRef = CICropViewInstance;

const defaultState = {
  quarterTurns: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
  scale: 1,
  panX: 0,
  panY: 0,
  cropRect: { x: 0, y: 0, width: 1, height: 1 },
};

const defaultParams = {
  rotation: 0,
  flipH: false,
  flipV: false,
  scale: 1,
  crop: { x: 0, y: 0, width: 0, height: 0 },
  outputWidth: 0,
  outputHeight: 0,
};

export const CICropViewer = forwardRef<CICropViewerRef, CICropViewerProps>(
  function CICropViewer(props, ref) {
    const { className, style, ...options } = props;
    const { containerRef, instance } = useCICropView(options);

    useImperativeHandle(
      ref,
      () => ({
        loadImage: (src) => instance.current?.loadImage(src) ?? Promise.resolve(),
        getTransformState: () => instance.current?.getTransformState() ?? defaultState,
        setCropShape: (shape) => instance.current?.setCropShape(shape),
        setCropRect: (rect) => instance.current?.setCropRect(rect),
        getCropRect: () => instance.current?.getCropRect() ?? { x: 0, y: 0, width: 0, height: 0 },
        rotateLeft: () => instance.current?.rotateLeft(),
        flipHorizontal: () => instance.current?.flipHorizontal(),
        flipVertical: () => instance.current?.flipVertical(),
        setRotation: (deg) => instance.current?.setRotation(deg),
        setScale: (scale) => instance.current?.setScale(scale),
        reset: () => instance.current?.reset(),
        toCanvas: () => instance.current?.toCanvas() ?? document.createElement('canvas'),
        toBlob: (type, quality) => instance.current?.toBlob(type, quality) ?? Promise.reject(new Error('Not ready')),
        toDataURL: (type, quality) => instance.current?.toDataURL(type, quality) ?? '',
        toTransformParams: () => instance.current?.toTransformParams() ?? defaultParams,
        update: (config) => instance.current?.update(config),
        destroy: () => instance.current?.destroy(),
      }),
      [],
    );

    return <div ref={containerRef} className={className} style={style} />;
  },
);
