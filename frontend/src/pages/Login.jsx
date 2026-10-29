import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import Alert from '../components/Alert'
import PasswordInput from '../components/PasswordInput'
import TextField from '../components/TextField'
import { useAuth } from '../auth/AuthContext'


function Login() {
  const { login, clinician } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const notice = location.state?.notice
  const destination = location.state?.from ?? '/dashboard'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }
  if(clinician) return <Navigate to={destination} replace />

  return (
    <div className="mx-auto max-w-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
        Clinician workspace
      </p>
      <h1 className="text-2xl font-bold text-teal-700">Log in</h1>
      <p className="mt-1 text-slate-600">Access your image screening workspace.</p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-teal-100 bg-white p-6 shadow-sm"
      >
        {notice && <Alert variant="info" title={notice} />}
        {error && <Alert variant="error" title={error} />}


        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@hospital.org"
          required
        />

        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Enter your password"
        />

        {submitting && (
          <p role="status" className="flex items-center gap-2 text-sm font-medium text-teal-700">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            Logging in…
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-center text-sm text-slate-600">
          No account yet?{' '}
          <Link to="/signup" className="font-medium text-teal-700 underline">
            Sign up
          </Link>
        </p>
      </form>

      <p className="mt-4 text-xs text-slate-600">
        Image decision support only. This is not a patient records system.
      </p>
    </div>
  )
}

export default Login