import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import Alert from '../components/Alert'
import PasswordInput from '../components/PasswordInput'
import TextField from '../components/TextField'
import { useAuth } from '../auth/AuthContext'


function Signup() {
    const { clinician, register } = useAuth()
    const navigate = useNavigate()

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setErrors] = useState('')
    const [formError, setFormError] = useState('')
    const [submitting, setSubmitting] = useState(false)

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
            next.password = 'Password must be atleast 8 characters long.'
        } else if (new TextEncoder().encode(password).length > 72) {
            next.password = 'Password is too long (maximum 32 characters).'
        }
        if (password !== confirm) {
            next.confirm = 'Passwords do not match.'
        }
        setErrors(next)
        if (Object.keys(next).length > 0) return


        setSubmitting(true)
        try {
            await register(fullName.trim(), email.trim(), password)
            navigate('/dashboard', { replace: true })
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
        <div className="mx-auto max-w-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Clinician workspace
            </p>
            <h1 className="text-2xl font-bold text-teal-700"> Create an account</h1>
            <p className="mt-1 text-slate-600">
                For Doctors and Nurses using screening Decision Support Tool.
            </p>

            <form
                onSubmit={handleSubmit}
                className="mt-6 space-y-4 rounded-xl border border-teal-100 bg-white p-6 shadow-sm"
            >
                {formError && <Alert variant="error" title={formError} />}

                <TextField
                    label="Full Name"
                    id="full-name"
                    hint="Clinician name Only. Do not enter Patient details"
                    value={fullName}
                    onChange={change(setFullName, 'fullName')}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                />

                <TextField
                    id="email"
                    label="Email"
                    type="email"
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

                {submitting && (
                    <p role="status" className="flex items-center gap-2 text-sm font-medium text-teal-700">
                        <LoaderCircle
                            aria-hidden="true"
                            className="h-4 w-4 animate-spin motion-reduce:animate-none"
                        />
                        Creating account…
                    </p>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className={`${primaryButton} w-full`}
                >
                    {submitting ? 'Creating account…' : 'Create Account'}
                </button>

                <p className="mt-4 text-center text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-teal-700 underline">
                        Log In
                    </Link>
                </p>
            </form>
        </div>
    )
}

export default Signup