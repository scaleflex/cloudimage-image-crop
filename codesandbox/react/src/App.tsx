import { useRef, useState } from 'react';
import { CloudimageCrop, type CloudimageCropElement } from '@cloudimage/image-crop/react';

const IMAGE =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2400&q=80';

export default function App() {
  const ref = useRef<CloudimageCropElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <main
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        color: '#111',
      }}
    >
      <h1>@cloudimage/image-crop — React example</h1>
      <p>
        Drag to pan, use the toolbar to rotate / flip / zoom / change the shape,
        then hit <strong>Crop &amp; preview</strong>.
      </p>

      <div style={{ height: 460 }}>
        <CloudimageCrop
          ref={ref}
          src={IMAGE}
          cropShape="16:9"
          theme="light"
          onReady={() => console.log('crop ready')}
          onSave={({ dataURL, params }) => {
            console.log('crop params', params);
            setPreview(dataURL);
          }}
        />
      </div>

      <p style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => ref.current?.save()}>Crop &amp; preview</button>
        <button onClick={() => ref.current?.reset()}>Reset</button>
      </p>

      {preview && (
        <section>
          <h2>Result</h2>
          <img
            src={preview}
            alt="cropped result"
            style={{ maxWidth: '100%', borderRadius: 8 }}
          />
        </section>
      )}
    </main>
  );
}
