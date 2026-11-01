import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { History as HistoryIcon, Info, LoaderCircle, RotateCw, Upload } from 'lucide-react'
import Alert from '../components/Alert'
import ProtectedImage from '../components/ProtectedImage'
import ResultBadge from '../components/ResultBadge'
import { cardClass, primaryButton, secondaryButton } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { apiRequest } from '../api/client'
import { formatDateTime, formatSize, mimeLabel } from '../lib/format'

function Result() {
  const { imageId } = useParams()
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  const [state, setState] = useState({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

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
      <p role="status" className="flex items-center gap-2 text-slate-600">
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
        <h1 className="text-2xl font-bold text-teal-700">
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

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Image review</p>
      <h1 className="mt-1 text-2xl font-bold text-teal-700">Screening support result</h1>
      <p className="mt-1 text-slate-600">
        Review the image and model output alongside your clinical assessment.
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

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        <div className="order-1 space-y-4 lg:order-2">
          <section className={cardClass} aria-labelledby="classification-heading">
            <h2
              id="classification-heading"
              className="text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Model classification
            </h2>

            <div className="mt-3">
              <ResultBadge result={result.predicted_class} size="lg" />
            </div>

            <div className="mt-4">
              <p className={`text-lg font-semibold ${isNormal ? 'text-teal-800' : 'text-amber-900'}`}>
                {result.certainty_level} certainty
              </p>
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200"
                aria-hidden="true"
              >
                <div
                  className={`h-full rounded-full ${isNormal ? 'bg-teal-600' : 'bg-amber-600'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-slate-600">
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

            <h3 className="mt-4 font-semibold text-slate-800">What this means</h3>
            <p className="mt-1 text-slate-700">{result.explanation}</p>

            <dl className="mt-4 text-sm">
              <dt className="text-slate-600">Reviewed at</dt>
              <dd className="font-semibold text-slate-800">
                {formatDateTime(result.generated_at)}
              </dd>
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
          <h2 id="images-heading" className="text-sm font-semibold text-slate-800">
            Image and model highlights
          </h2>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <figure>
              <ProtectedImage
                imageId={result.image_id}
                kind="file"
                alt="The uploaded colposcopy image"
              />
              <figcaption className="mt-2 text-sm text-slate-600">Uploaded image</figcaption>
            </figure>
            <figure>
              <ProtectedImage
                imageId={result.image_id}
                kind="heatmap"
                alt="The uploaded image with a heatmap overlay marking highlighted areas"
              />
              <figcaption className="mt-2 text-sm text-slate-600">
                {isPlaceholder
                  ? 'Illustrative heatmap, not model output.'
                  : "Highlighted areas influenced the model's result."}
              </figcaption>
            </figure>
          </div>

          {!isPlaceholder && (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Info aria-hidden="true" className="h-4 w-4 shrink-0 text-teal-700" />
              The heatmap is a review aid. It does not show a diagnosis.
            </p>
          )}

          <p className="mt-3 text-sm text-slate-600">
            Image: {mimeLabel(result.mime_type)} · {formatSize(result.file_size_bytes)}
          </p>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/dashboard" className={primaryButton}>
          <Upload aria-hidden="true" className="h-4 w-4" />
          Upload another image
        </Link>
        <Link to="/history" className={secondaryButton}>
          <HistoryIcon aria-hidden="true" className="h-4 w-4" />
          View history
        </Link>
      </div>
    </div>
  )
}

export default Result