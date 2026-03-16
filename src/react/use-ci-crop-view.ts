import { useEffect, useRef, useState } from 'react';
import type { CICropViewConfig, CICropViewInstance } from '../core/types';

export interface UseCICropViewOptions extends Partial<CICropViewConfig> {
  src: string;
}

export interface UseCICropViewReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  instance: React.RefObject<CICropViewInstance | null>;
  ready: boolean;
}

export function useCICropView(options: UseCICropViewOptions): UseCICropViewReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instance = useRef<CICropViewInstance | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    setReady(false);

    import('../core/ci-crop-view').then(({ CICropView }) => {
      if (destroyed || !containerRef.current) return;

      const init = () => {
        if (destroyed || !containerRef.current) return;
        instance.current = new CICropView(containerRef.current, optionsRef.current);
        setReady(true);
      };

      if (containerRef.current.isConnected) {
        init();
      } else {
        requestAnimationFrame(init);
      }
    });

    return () => {
      destroyed = true;
      instance.current?.destroy();
      instance.current = null;
      setReady(false);
    };
  }, [options.src]);

  useEffect(() => {
    if (!instance.current) return;
    const { src: _src, ...updatableProps } = optionsRef.current;
    instance.current.update(updatableProps);
  }, [
    options.cropShape,
    options.showGrid,
    options.minScale,
    options.maxScale,
  ]);

  return { containerRef, instance, ready };
}
