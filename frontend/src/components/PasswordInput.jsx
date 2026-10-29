import { useState } from 'react'
import {CircleAlert, Eye, EyeOff } from 'lucide-react'

function PasswordInput({ id, label, hint, error, ...inputProps }) {
    const [visible, setVisible] = useState(false)
    const Icon = visible ? EyeOff : Eye
    const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                {label}
            </label>
            <div className=" relative mt-1">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    required
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={describedBy}
                    className={`w-full rounded-l-lg border py-2 pl-3 pr-24 focus:outline-none focus:ring-2 ${
                            error
                            ? 'border-red-400 bg-red-50 focus:ring-red-500'
                            : 'border-slate-300 bg-white focus:border-tea-600 focus:ring-teal-600'
                        }`}
                        {...inputProps}

                    />
                        <button
                            type="button"
                            onClick={() => setVisible(!visible)}
                            aria-label={visible ? 'Hide password' : 'Show password'}
                            className="absolute inset-y-0 right-0 flex items-center gap-1 rounded-r-lg px-3 text-sm font-medium text-teal-700 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                            >
                                <Icon aria-hidden="true" className="h-4 w-4"/>
                                {visible ? 'Hide' : 'Show'}
                                </button>
                </div>
                {hint && (
                    <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">
                        {hint}
                    </p>
                )}
                {error && (
                    <p id={`${id}-error`} className="mt-1 flex items-center gap-1 text-xs text-red-800">
                        <CircleAlert aria-hidden="true" className="h-3.5 w.3.5 shrink-0" />
                        {error}
                    </p>
                )}
        </div>
    )
}

export default PasswordInput