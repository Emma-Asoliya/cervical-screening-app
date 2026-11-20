import { useState } from 'react'
import { Columns2, Layers } from 'lucide-react'
import ProtectedImage from './ProtectedImage'
import { useProtectedImage } from '../hooks/useProtectedImage'

const UPLOADED_ALT = 'The uploaded colposcopy image'
const HEATMAP_ALT = 'The uploaded image with a heatmap overlay marking highlighted areas'

function Overlay({ imageId, strength }) {
  const base = useProtectedImage(imageId, 'file')
  const heat = useProtectedImage(imageId, 'heatmap')
  const failed = base.status === 'error' || heat.status === 'error'

  return (
    <div className="relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-xl bg-surface-2">
      {base.status === 'ready' && (
        <img src={base.url} alt={UPLOADED_ALT} className="absolute inset-0 h-full w-full object-contain" />
      )}
      {heat.status === 'ready' && (
        <img
          src={heat.url}
          alt={HEATMAP_ALT}
          style={{ opacity: strength / 100 }}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
      {failed && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-danger">
          Image could not be loaded.
        </p>
      )}
    </div>
  )
}

function ImageCompare({ imageId, heatmapCaption }) {
  const [mode, setMode] = useState('side')
  const [strength, setStrength] = useState(100)

  const tab = (value, Icon, label) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === value}
      onClick={() => setMode(value)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        mode === value ? 'bg-brand text-on-brand' : 'text-muted hover:text-ink'
      }`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  )

  return (
    <div>
      <div role="tablist" aria-label="Image view" className="inline-flex gap-1 rounded-xl border border-line bg-surface-2 p-1 print:hidden">
        {tab('side', Columns2, 'Side by side')}
        {tab('overlay', Layers, 'Overlay')}
      </div>

      {mode === 'side' ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <figure>
            <ProtectedImage imageId={imageId} kind="file" alt={UPLOADED_ALT} />
            <figcaption className="mt-2 text-sm text-muted">Uploaded image</figcaption>
          </figure>
          <figure>
            <ProtectedImage imageId={imageId} kind="heatmap" alt={HEATMAP_ALT} />
            <figcaption className="mt-2 text-sm text-muted">{heatmapCaption}</figcaption>
          </figure>
        </div>
      ) : (
        <div className="mt-4">
          <Overlay imageId={imageId} strength={strength} />
          <div className="mx-auto mt-4 flex max-w-lg items-center gap-3">
            <label htmlFor="heat-strength" className="shrink-0 text-sm font-medium text-ink">
              Heatmap strength
            </label>
            <input
              id="heat-strength"
              type="range"
              min="0"
              max="100"
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-brand"
            />
            <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted">{strength}%</span>
          </div>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{heatmapCaption}</p>
        </div>
      )}
    </div>
  )
}

export default ImageCompare