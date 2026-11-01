import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  History as HistoryIcon,
  LoaderCircle,
  RotateCw,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import Alert from '../components/Alert'
import ProtectedImage from '../components/ProtectedImage'
import ResultBadge from '../components/ResultBadge'
import { cardClass, primaryButton, secondaryButton } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { apiRequest } from '../api/client'
import { formatDateTime } from '../lib/format'

const PAGE_SIZE = 20
const ROW_GRID = 'md:grid-cols-[4rem_9rem_1fr_13rem_6rem]'

function History() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setMoreError('')

    apiRequest(`/images?limit=${PAGE_SIZE}&offset=0`, { token })
      .then((rows) => {
        if (cancelled) return
        setItems(rows)
        setHasMore(rows.length === PAGE_SIZE)
        setStatus('ready')
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
        setError(err.message)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [token, attempt, logout, navigate])

  async function loadMore() {
    setLoadingMore(true)
    setMoreError('')
    try {
      const rows = await apiRequest(`/images?limit=${PAGE_SIZE}&offset=${items.length}`, { token })
      setItems((current) => {
        const known = new Set(current.map((row) => row.image_id))
        return [...current, ...rows.filter((row) => !known.has(row.image_id))]
      })
      setHasMore(rows.length === PAGE_SIZE)
    } catch (err) {
      if (err.status === 401) {
        logout()
        navigate('/login', {
          replace: true,
          state: { notice: 'Your session has expired. Please log in again.' },
        })
        return
      }
      setMoreError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  const hasPlaceholder = items.some((row) => row.model_status === 'placeholder')

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            Screening workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold text-teal-700">History</h1>
          <p className="mt-1 text-slate-600">
            Review previous image classifications. No patient information is stored here.
          </p>
        </div>
        <Link to="/dashboard" className={`${primaryButton} w-full sm:w-auto`}>
          <Upload aria-hidden="true" className="h-4 w-4" />
          Upload image
        </Link>
      </div>

      {hasPlaceholder && (
        <div className="mt-6">
          <Alert variant="warning" title="Some results are placeholder results">
            They were created while the model was not connected. Do not use them for patient care.
          </Alert>
        </div>
      )}

      {status === 'loading' && (
        <section className={`${cardClass} mt-6`} aria-busy="true">
          <p role="status" className="flex items-center gap-2 font-medium text-teal-700">
            <LoaderCircle
              aria-hidden="true"
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
            />
            Loading history…
          </p>
          <div
            className="mt-4 animate-pulse divide-y divide-teal-100 motion-reduce:animate-none"
            aria-hidden="true"
          >
            {[0, 1, 2].map((n) => (
              <div key={n} className="flex items-center gap-4 py-4">
                <div className="h-16 w-16 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-slate-200" />
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {status === 'error' && (
        <div className="mt-6 space-y-4">
          <Alert variant="error" title={error} />
          <button
            type="button"
            onClick={() => setAttempt((count) => count + 1)}
            className={secondaryButton}
          >
            <RotateCw aria-hidden="true" className="h-4 w-4" />
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <section className={`${cardClass} mt-6 text-center`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
            <HistoryIcon aria-hidden="true" className="h-6 w-6 text-teal-700" />
          </div>
          <p className="mt-3 font-semibold text-slate-800">
            No images yet. Upload your first image.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Image reviews will appear here after an upload.
          </p>
          <Link to="/dashboard" className={`${primaryButton} mt-4`}>
            <Upload aria-hidden="true" className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </section>
      )}

      {status === 'ready' && items.length > 0 && (
        <>
          <p className="mt-6 text-sm text-slate-600">
            {hasMore
              ? `Showing the latest ${items.length} image reviews`
              : `${items.length} image ${items.length === 1 ? 'review' : 'reviews'}`}
          </p>

          <section
            className="mt-2 overflow-hidden rounded-xl border border-teal-100 bg-white shadow-sm"
            aria-label="Image reviews"
          >
            <div
              className={`hidden gap-4 border-b border-teal-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 md:grid ${ROW_GRID}`}
              aria-hidden="true"
            >
              <span>Image</span>
              <span>Classification</span>
              <span>Certainty</span>
              <span>Reviewed at</span>
              <span>Action</span>
            </div>

            <ul className="divide-y divide-teal-100">
              {items.map((row) => {
                const percent = Math.min(100, Math.max(0, Math.round(row.confidence_score * 100)))
                const when = formatDateTime(row.generated_at)
                return (
                  <li
                    key={row.image_id}
                    className={`grid grid-cols-[4rem_1fr] gap-x-4 gap-y-1 p-4 md:items-center md:gap-y-0 ${ROW_GRID}`}
                  >
                    <ProtectedImage
                      imageId={row.image_id}
                      kind="file"
                      alt="Thumbnail of the uploaded image"
                      compact
                      className="row-span-3 h-16 w-16 md:row-span-1"
                    />

                    <div>
                      <ResultBadge result={row.predicted_class} />
                    </div>

                    <div>
                      <p className="font-semibold text-slate-800">
                        {row.certainty_level} certainty
                      </p>
                      <p className="text-sm text-slate-600">{percent}% model confidence</p>
                      {row.model_status === 'placeholder' && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-900">
                          <TriangleAlert aria-hidden="true" className="h-3 w-3 shrink-0" />
                          Placeholder result
                        </p>
                      )}
                    </div>

                    <p className="text-sm text-slate-700">{when}</p>

                    <Link
                      to={`/results/${row.image_id}`}
                      aria-label={`View result from ${when}`}
                      className={`${secondaryButton} col-span-2 mt-2 w-full md:col-span-1 md:mt-0`}
                    >
                      View
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>

          {hasMore && (
            <div className="mt-4 text-center">
              {moreError && (
                <div className="mb-3">
                  <Alert variant="error" title={moreError} />
                </div>
              )}
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className={secondaryButton}
              >
                {loadingMore ? (
                  <>
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    />
                    Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}

          <p className="mt-4 text-sm text-slate-600">
            Certainty is model confidence, not accuracy. Always use your clinical judgement.
          </p>
        </>
      )}
    </div>
  )
}

export default History