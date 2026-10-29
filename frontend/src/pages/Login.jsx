import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../auth/AuthContext'

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600'

function Login() {
  const { login } = useAuth()
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

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-teal-700">Log in</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-xl border border-teal-100 bg-white p-6 shadow-sm"
      >
        {notice && (
          <p
            role="status"
            className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-sm text-teal-900"
          >
            {notice}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className={inputClass}
          />
        </div>

        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        No account yet?{' '}
        <Link to="/signup" className="font-medium text-teal-700 underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default Login