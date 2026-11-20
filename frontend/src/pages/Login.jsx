import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import Alert from '../components/Alert'
import AuthShell from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'
import TextField from '../components/TextField'
import { cardClass, eyebrow, primaryButton } from '../components/ui'
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
      if (err.status === 403 && err.message === 'email_not_verified') {
        navigate('/verify', {
          state: { email: email.trim(), notice: 'Confirm your email address to continue.' },
        })
        return
      }
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }
  if (clinician) return <Navigate to={destination} replace />

  return (
    <AuthShell>
      <p className={eyebrow}>Clinician workspace</p>
      <h1 className="mt-1 text-3xl font-bold">Log in</h1>
      <p className="mt-1 text-muted">Access your image screening workspace.</p>

      <form onSubmit={handleSubmit} className={`${cardClass} mt-6 space-y-4`}>
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
          <p role="status" className="flex items-center gap-2 text-sm font-medium text-accent">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            Logging in…
          </p>
        )}

        <button type="submit" disabled={submitting} className={`${primaryButton} w-full`}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-center text-sm text-muted">
          No account yet?{' '}
          <Link to="/signup" className="font-medium text-accent underline">
            Sign up
          </Link>
        </p>
      </form>

      <p className="mt-4 text-xs text-muted">
        Image decision support only. This is not a patient records system.
      </p>
    </AuthShell>
  )
}

export default Login