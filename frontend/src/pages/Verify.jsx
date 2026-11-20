import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { LoaderCircle, MailCheck } from 'lucide-react'
import Alert from '../components/Alert'
import AuthShell from '../components/AuthShell'
import TextField from '../components/TextField'
import { cardClass, eyebrow, ghostButton, primaryButton } from '../components/ui'
import { apiRequest } from '../api/client'
import { useAuth } from '../auth/AuthContext'

const RESEND_WAIT = 60


function Verify() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const {acceptToken} = useAuth()

  const email = location.state?.email ?? params.get('email') ?? ''
  const linkCode = params.get('code') ?? ''

  const [code, setCode] = useState(linkCode)
  const [error, setError] = useState('')
  const [info, setInfo] = useState(
    location.state?.fresh ? 'Account created. We sent a 6-digit code to your email.' : location.state?.notice ?? '',
  )
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [wait, setWait] = useState(location.state?.fresh ? RESEND_WAIT : 0)
  const autoTried = useRef(false)

  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

   async function submit(value) {
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      const data = await apiRequest('/auth/verify', {
        method: 'POST',
        body: { email, code: value },
      })
      if (data.access_token) {
        acceptToken(data.access_token)
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/login', {
          replace: true,
          state: { notice: 'Email confirmed. You can log in now.' },
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Opening the link from the email fills in the code and submits it once.
  useEffect(() => {
    if (!autoTried.current && email && /^\d{6}$/.test(linkCode)) {
      autoTried.current = true
      submit(linkCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(event) {
    event.preventDefault()
    submit(code)
  }

  async function resend() {
    setError('')
    setInfo('')
    setResending(true)
    try {
      await apiRequest('/auth/resend', { method: 'POST', body: { email } })
      setInfo('A new code has been sent. Check your inbox and spam folder.')
      setWait(RESEND_WAIT)
    } catch (err) {
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  if (!email) {
    return (
      <AuthShell>
        <section className={cardClass}>
          <h1 className="text-2xl font-bold">Confirm your email</h1>
          <p className="mt-2 text-muted">
            Sign up or log in first, and we will take you here to enter your code.
          </p>
          <div className="mt-4 flex gap-2">
            <Link to="/signup" className={primaryButton}>Sign up</Link>
            <Link to="/login" className={ghostButton}>Log in</Link>
          </div>
        </section>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <p className={eyebrow}>One last step</p>
      <h1 className="mt-1 text-3xl font-bold">Confirm your email</h1>
      <p className="mt-1 text-muted">
        Enter the 6-digit code sent to <span className="font-semibold text-ink">{email}</span>. It
        expires in 15 minutes.
      </p>

      <form onSubmit={handleSubmit} className={`${cardClass} mt-6 space-y-4`}>
        {info && <Alert variant="info" title={info} />}
        {error && <Alert variant="error" title={error} />}

        <TextField
          id="code"
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
        />

        <button type="submit" disabled={submitting || code.length !== 6} className={`${primaryButton} w-full`}>
          {submitting ? (
            <>
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              Checking…
            </>
          ) : (
            <>
              <MailCheck aria-hidden="true" className="h-4 w-4" />
              Confirm email
            </>
          )}
        </button>

        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={resend}
            disabled={resending || wait > 0}
            className={ghostButton}
          >
            {wait > 0 ? `Resend code in ${wait}s` : resending ? 'Sending…' : 'Resend code'}
          </button>
          <Link to="/signup" className="text-muted underline">
            Wrong address?
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}

export default Verify