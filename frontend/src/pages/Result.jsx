import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { History as HistoryIcon, Info, LoaderCircle, Printer, RotateCw, Trash2, Upload } from 'lucide-react'
import Alert from '../components/Alert'
import ImageCompare from '../components/ImageCompare'
import ResultBadge from '../components/ResultBadge'
import { cardClass, dangerButton, eyebrow, ghostButton, pageTitle, primaryButton, secondaryButton } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { apiRequest } from '../api/client'
import { formatDateTime, formatSize, mimeLabel } from '../lib/format'

function Result() {
  const { imageId } = useParams()
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  const [state, setState] = useState({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      await apiRequest(`/images/${imageId}`, { method: 'DELETE', token })
      navigate('/history', { replace: true, state: { notice: 'Image and result deleted.' } })
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!/^\d+$/.test(imageId)) {
      setState({ status: 'error', code: 404, message: 'Result not found.' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })

    apiRequest(`/images/${imageId}`, { token })
      .then((result) => {
        if (!cancelled) setState({ status: 'ready', result })
      })
      .catch((err) => {
        if (cancelled) return
        if (err.status === 401) {
          logout()
          navigate('/login', {
            replace: true,
            state: { notice: 'Your session has expired. Please log in again.' },
          })
          return
        }
        setState({ status: 'error', code: err.status, message: err.message })
      })

    return () => {
      cancelled = true
    }
  }, [imageId, token, attempt, logout, navigate])

  if (state.status === 'loading') {
    return (
      <p role="status" className="flex items-center gap-2 text-muted">
        <LoaderCircle
          aria-hidden="true"
          className="h-5 w-5 animate-spin motion-reduce:animate-none"
        />
        Loading result…
      </p>
    )
  }

  if (state.status === 'error') {
    const notFound = state.code === 404
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold text-ink">
          {notFound ? 'Result not found' : 'Could not load the result'}
        </h1>
        <div className="mt-4">
          <Alert variant="error" title={state.message} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!notFound && (
            <button
              type="button"
              onClick={() => setAttempt((count) => count + 1)}
              className={secondaryButton}
            >
              <RotateCw aria-hidden="true" className="h-4 w-4" />
              Try again
            </button>
          )}
          <Link to="/history" className={secondaryButton}>
            View history
          </Link>
          <Link to="/dashboard" className={primaryButton}>
            Upload an image
          </Link>
        </div>
      </div>
    )
  }

  const { result } = state
  const isNormal = result.predicted_class === 'Normal'
  const isPlaceholder = result.model_status === 'placeholder'
  const isLow = result.certainty_level === 'Low'
  const percent = Math.min(100, Math.max(0, Math.round(result.confidence_score * 100)))
  const heatmapCaption = isPlaceholder
    ? 'Illustrative heatmap, not model output.'
    : "Highlighted areas influenced the model's result."

  return (
    <div>
      <p className={eyebrow}>Image review</p>
      <h1 className={pageTitle}>Screening support result</h1>
      <p className="mt-1 text-muted">
        Review the image and model output alongside your clinical assessment.
      </p>
      <p className="mt-1 hidden text-sm text-muted print:block">
        Reviewed {formatDateTime(result.generated_at)}. Research prototype, decision support only.
      </p>

      <div className="mt-6 space-y-3">
        <Alert
          variant="info"
          title="Decision support only. Not a diagnosis. The clinician's judgement decides the next step."
        />
        {isPlaceholder && (
          <Alert
            variant="warning"
            title="Placeholder result: the model is not connected yet. Do not use for patient care."
          />
        )}
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-3">
        <div className="order-1 space-y-4 lg:order-2">
          <section className={cardClass} aria-labelledby="classification-heading">
            <h2
              id="classification-heading"
              className="text-xs font-semibold uppercase tracking-widest text-muted"
            >
              Model classification
            </h2>

            <div className="mt-3">
              <ResultBadge result={result.predicted_class} size="lg" />
            </div>

            <div className="mt-5">
              <p className={`text-lg font-semibold ${isNormal ? 'text-accent' : 'text-warn'}`}>
                {result.certainty_level} certainty
              </p>
              <div
                className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-line"
                aria-hidden="true"
              >
                <div
                  className={`h-full rounded-full ${isNormal ? 'bg-brand' : 'bg-warn'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-muted">
                {percent}% model confidence. This is not accuracy.
              </p>
            </div>

            {isLow && (
              <div className="mt-4">
                <Alert variant="warning" title="Low certainty: review with caution">
                  Check image quality before interpreting this result.
                </Alert>
              </div>
            )}

            <h3 className="mt-5 font-semibold text-ink">What this means</h3>
            <p className="mt-1 text-sm text-ink">{result.explanation}</p>

            <dl className="mt-4 text-sm">
              <dt className="text-muted">Reviewed at</dt>
              <dd className="font-semibold text-ink">{formatDateTime(result.generated_at)}</dd>
            </dl>
          </section>

          <Alert variant="info" title="Clinical review comes first">
            The classification and highlights do not replace a clinical assessment or determine a
            care plan.
          </Alert>
        </div>

        <section
          className={`${cardClass} order-2 lg:order-1 lg:col-span-2`}
          aria-labelledby="images-heading"
        >
          <h2 id="images-heading" className="mb-3 text-sm font-semibold text-ink">
            Image and model highlights
          </h2>

          <ImageCompare imageId={result.image_id} heatmapCaption={heatmapCaption} />

          {!isPlaceholder && (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted">
              <Info aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
              The heatmap is a review aid. It does not show a diagnosis.
            </p>
          )}

          <p className="mt-2 text-sm text-muted">
            Image: {mimeLabel(result.mime_type)} · {formatSize(result.file_size_bytes)}
          </p>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
        <Link to="/dashboard" className={primaryButton}>
          <Upload aria-hidden="true" className="h-4 w-4" />
          Upload another image
        </Link>
        <Link to="/history" className={secondaryButton}>
          <HistoryIcon aria-hidden="true" className="h-4 w-4" />
          View history
        </Link>
        <button type="button" onClick={() => window.print()} className={secondaryButton}>
          <Printer aria-hidden="true" className="h-4 w-4" />
          Print
        </button>
        {!confirming && (
          <button type="button" onClick={() => setConfirming(true)} className={`${ghostButton} sm:ml-auto`}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Delete
          </button>
        )}
      </div>

      {confirming && (
        <div role="alertdialog" aria-label="Confirm delete" className="mt-4 rounded-2xl border border-danger-line bg-danger-soft p-4 print:hidden">
          <p className="font-semibold text-danger">Delete this image and its result?</p>
          <p className="mt-1 text-sm text-danger">
            The photo, heatmap and result are removed from this app. This cannot be undone.
          </p>
          {deleteError && <p className="mt-2 text-sm font-medium text-danger">{deleteError}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={handleDelete} disabled={deleting} className={dangerButton}>
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setDeleteError('') }}
              disabled={deleting}
              className={secondaryButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Result