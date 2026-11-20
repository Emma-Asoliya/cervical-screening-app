import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import Alert from '../components/Alert'
import AuthShell from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'
import TextField from '../components/TextField'
import { cardClass, eyebrow, primaryButton } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

function Signup() {
  const { clinician, register } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [agreed, setAgreed] = useState(false)

  function change(setter, field) {
    return (event) => {
      setter(event.target.value)
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const next = {}
    if (password.length < 8) {
      next.password = 'Password must be at least 8 characters long.'
    } else if (new TextEncoder().encode(password).length > 72) {
      next.password = 'Password is too long (maximum 72 characters).'
    }
    if (password !== confirm) {
      next.confirm = 'Passwords do not match.'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      const outcome = await register(fullName.trim(), email.trim(), password)
      if (outcome.needsVerification) {
        navigate('/verify', { replace: true, state: { email: email.trim(), fresh: true } })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      if (err.accountCreated) {
        navigate('/login', { replace: true, state: { notice: err.message } })
        return
      }
      if (err.status === 409) {
        setErrors({ email: err.message })
      } else {
        setFormError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }
  if (clinician) return <Navigate to="/dashboard" replace />

  return (
    <AuthShell>
      <p className={eyebrow}>Clinician workspace</p>
      <h1 className="mt-1 text-3xl font-bold">Create an account</h1>
      <p className="mt-1 text-muted">
        For doctors and nurses using the screening decision support tool.
      </p>

      <form onSubmit={handleSubmit} className={`${cardClass} mt-6 space-y-4`}>
        {formError && <Alert variant="error" title={formError} />}

        <TextField
          label="Full Name"
          id="full-name"
          hint="Clinician name only. Do not enter patient details."
          value={fullName}
          onChange={change(setFullName, 'fullName')}
          placeholder="Enter your full name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={90}
        />

        <TextField
          id="email"
          label="Email"
          type="email"
          hint="We will send a 6-digit code to confirm this address."
          error={errors.email}
          value={email}
          onChange={change(setEmail, 'email')}
          placeholder="you@hospital.org"
          autoComplete="email"
          required
        />

        <PasswordInput
          id="password"
          label="Password"
          hint="At least 8 characters."
          error={errors.password}
          value={password}
          onChange={change(setPassword, 'password')}
          placeholder="Enter your password"
          autoComplete="new-password"
        />

        <PasswordInput
          id="confirm-password"
          label="Confirm Password"
          error={errors.confirm}
          value={confirm}
          onChange={change(setConfirm, 'confirm')}
          placeholder="Enter your password again"
          autoComplete="new-password"
        />

                <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            required
            className="mt-1 h-4 w-4"
          />
          <span>
            I have read the{' '}
            <Link to="/privacy" className="font-medium text-accent underline">
              Privacy Policy
            </Link>{' '}
            and agree.
          </span>
        </label>

        {submitting && (
          <p role="status" className="flex items-center gap-2 text-sm font-medium text-accent">
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            Creating account…
          </p>
        )}

        <button type="submit" disabled={submitting || !agreed} className={`${primaryButton} w-full`}>
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>

        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent underline">
            Log In
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

export default Signup