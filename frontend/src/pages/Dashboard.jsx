import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  FileImage,
  FolderOpen,
  Lightbulb,
  LoaderCircle,
  ScanLine,
  Trash2,
  Upload,
} from 'lucide-react'
import Alert from '../components/Alert'
import { cardClass, ghostButton, primaryButton, secondaryButton } from '../components/ui'
import { useAuth } from '../auth/AuthContext'
import { apiRequest } from '../api/client'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max (1, Math.round(bytes / 1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function typeLabel(type) {
  return type === 'image/png' ? 'PNG' : 'JPEG'
}

function qualityText(issues = []) {
  const blurry = issues.includes('blurry')
  const dark = issues.includes('too_dark')
  const bright = issues.includes('too_bright')
  const lighting = dark ? 'too dark' : bright ? 'too bright' : null

  if (blurry && lighting) {
    return {
      title: `This image may be blurry and ${lighting}`,
      body: 'A clearer, better-lit image may help the model review. You can replace this image or continue with caution.',
    }
  }
  if (blurry) {
    return {
      title: 'This image may be blurry',
      body: 'A clearer image may help the model review. You can replace this image or continue with caution.',
    }
  }
  if (lighting) {
    return {
      title: `This image may be ${lighting}`,
      body: 'Better lighting may help the model review. You can replace this image or continue with caution.',
    }
  }
  return {
    title: 'This image may be low quality',
    body: 'You can replace this image or continue with caution.',
  }
}

function Dashboard() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState('')
  const [serverDown, setServerDown] = useState(false)
  const [warning, setWarning] = useState(null)
  const [analysing, setAnalysing] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function openPicker() {
    inputRef.current?.click()
  }

  function acceptFile(candidate) {
    setError('')
    setServerDown(false)
    setWarning(null)
    if (!candidate) return

    if (!ALLOWED_TYPES.includes(candidate.type)) {
      setFile(null)
      setError('This file type is not supported. Choose a JPEG or PNG image.')
      return
    }
    if (candidate.size > MAX_BYTES) {
      setFile(null)
      setError('This image is too large. Choose an image up to 5 MB.')
      return
    }
    setFile(candidate)
  }

  function handleInputChange(event) {
    acceptFile(event.target.files[0])
    event.target.value = ''
  }

  function handleDragOver(event) {
    event.preventDefault()
    if (!analysing) setDragging(true)
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (analysing) return
    const dropped = event.dataTransfer.files
    if (dropped.length > 1) {
      setFile(null)
      setWarning(null)
      setServerDown(false)
      setError('Choose one image at a time.')
      return
    }
    acceptFile(dropped[0])
  }

  function removeFile() {
    setFile(null)
    setError('')
    setServerDown(false)
    setWarning(null)
  }

  function retake() {
    setWarning(null)
    openPicker()
  }

  async function analyse(ignoreWarning = false) {
    if (!file) return
    setError('')
    setServerDown(false)
    setWarning(null)
    setAnalysing(true)

    const formData = new FormData()
    formData.append('file', file)
    if (ignoreWarning) formData.append('ignore_quality_warning', 'true')

    try {
      const result = await apiRequest('/images', { method: 'POST', token, formData })
      navigate(`/results/${result.image_id}`)
    } catch (err) {
      if (err.status === 401) {
        logout()
        navigate('/login', {
          replace: true,
          state: { notice: 'Your session has expired. Please log in again.' },
        })
        return
      }
      if (err.status === 422 && err.detail?.code === 'quality_warning') {
        setWarning(err.detail)
      } else {
        setError(err.message)
        setServerDown(err.status === 0)
      }
    } finally {
      setAnalysing(false)
    }
  }

  const quality = warning ? qualityText(warning.issues) : null

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
        Screening workspace
      </p>
      <h1 className="mt-1 text-2xl font-bold text-teal-700">Upload image</h1>
      <p className="mt-1 text-slate-600">Choose one colposcopy image for model-assisted review.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className={`${cardClass} lg:col-span-2`} aria-labelledby="choose-heading">
          <h2 id="choose-heading" className="text-sm font-semibold text-slate-800">
            Choose an image
          </h2>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleInputChange}
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose an image file"
          />

          {error && (
            <div className="mt-3">
              <Alert variant="error" title={error} />
            </div>
          )}

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`mt-3 rounded-lg border-2 border-dashed p-8 text-center ${
                dragging ? 'border-teal-600 bg-teal-100' : 'border-teal-300 bg-teal-50'
              }`}
            >
              <Upload aria-hidden="true" className="mx-auto h-6 w-6 text-teal-700" />
              <p className="mt-3 font-medium text-slate-800">
                Drag an image here or choose a file
              </p>
              <p className="mt-1 text-sm text-slate-600">
                JPEG or PNG, up to 5 MB. One image at a time.
              </p>
              <button type="button" onClick={openPicker} className={`${secondaryButton} mt-4`}>
                <FolderOpen aria-hidden="true" className="h-4 w-4" />
                Choose a file
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex max-h-80 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview of the selected image"
                    className="max-h-80 w-auto max-w-full object-contain"
                  />
                )}
              </div>
              <div className="mt-3 flex items-start gap-2">
                <FileImage aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                <div className="min-w-0">
                  <p className="break-all font-medium text-slate-800">{file.name}</p>
                  <p className="text-sm text-slate-600">
                    {typeLabel(file.type)} · {formatSize(file.size)} · One image
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {analysing && (
              <div role="status" className="flex items-start gap-2">
                <LoaderCircle
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-teal-700 motion-reduce:animate-none"
                />
                <div>
                  <p className="font-medium text-teal-700">Analysing image…</p>
                  <p className="text-sm text-slate-600">
                    Please keep this page open while the image is reviewed.
                  </p>
                </div>
              </div>
            )}

            {quality && !analysing && (
              <>
                <Alert variant="warning" title={quality.title}>
                  {quality.body}
                </Alert>
                <button type="button" onClick={retake} className={`${secondaryButton} w-full`}>
                  <Camera aria-hidden="true" className="h-4 w-4" />
                  Retake / choose another image
                </button>
                <button
                  type="button"
                  onClick={() => analyse(true)}
                  className={`${primaryButton} w-full`}
                >
                  Continue anyway
                </button>
              </>
            )}

            {!quality && (
              <button
                type="button"
                onClick={() => analyse(false)}
                disabled={!file || analysing}
                className={`${primaryButton} w-full`}
              >
                <ScanLine aria-hidden="true" className="h-4 w-4" />
                {analysing ? 'Analysing image…' : 'Analyse image'}
              </button>
            )}

            {file && (
              <button
                type="button"
                onClick={removeFile}
                disabled={analysing}
                className={`${ghostButton} w-full`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Remove
              </button>
            )}

            {serverDown && file && (
              <p className="text-sm text-slate-600">
                Your selected image is still here. Try Analyse image again when the connection
                is available.
              </p>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-teal-100 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Lightbulb aria-hidden="true" className="h-4 w-4 text-teal-700" />
              Before you upload
            </h2>
            <p className="mt-2 text-slate-800">Use a well-lit, in-focus image of the cervix.</p>
            <p className="mt-1 text-sm text-slate-600">
              Avoid shadows and glare. Centre the cervix and check focus before choosing your
              image.
            </p>
          </section>

          <Alert variant="info" title="No patient information">
            Upload only the image. Do not include names, labels or identifying details in the
            image.
          </Alert>
        </aside>
      </div>
    </div>
  )
}

export default Dashboard