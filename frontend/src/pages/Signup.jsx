import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../auth/AuthContext'

const inputClass =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3  py-2 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600'

function Signup() {
    const { clinician, register } = useAuth()
    const navigate = useNavigate()

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)


    async function handleSubmit(event) {
        event.preventDefault()
        setError('')

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.')
            return
        }
        if (new TextEncoder().encode(password).length > 72) {
            setError('Password is too long. (maximum 32 characters).')
            return
        }
        if (password !== confirm) {
            setError('Passwords do not match.')
            return
        }
        setSubmitting(true)
        try {
            await register(fullName.trim(), email.trim(), password)
            navigate('/dashboard', { replace: true })
        } catch (err) {
            if (err.accountCreated) {
                navigate('/login', { replace: true, state: { notice: err.message } })
                return
            } 
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }
    if (clinician) return <Navigate to="/dashboard" replace />

    return (
        <div className="mx-auto max-w-md">
            <h1 className="text-2xl font-bold text-teal-700"> Create an account</h1>

            <form 
              onSubmit={handleSubmit}
              className="mt-6 space-y-4 rounded-xl border border-teal-100 bg-white p-6 shadow-sm"
              >
                {error && (
                    <p
                      role="alert"
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
                    >
                        {error}
                    </p>
                )}
                <div>
                    <label htmlFor="full-name" className="block text-sm font-medium text-slate-700">
                        Full Name
                        </label>
                        <input
                            id="full-name"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            autoComplete="name"
                            required
                            minLength={2}
                            maxLength={120}
                            className={inputClass}
                        />
                        <p className="mt-1 text-xs text-slate-600">
                            Clinician name Only. Do not enter Patient details
                        </p>
                    </div>
                
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
                            label="Password (at least 8 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                        />

                        <PasswordInput
                            id="confirm-password"
                            label="Confirm Password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            autoComplete="new-password"
                        />

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-lg bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                        >
                            {submitting ? 'Creating account…' : 'Create Account'}
                            </button>
                        </form>

                        <p className="mt-4 text-center text-sm text-slate-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-teal-700 underline">
                                Log In
                            </Link>
                        </p>
        </div>
    )
}

export default Signup