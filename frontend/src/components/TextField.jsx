import { CircleAlert } from 'lucide-react'

function TextField({ id, label, hint, error, ...inputProps }) {
    const describedBy = 
        [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-800">
                {label}
            </label>
            <input 
            id={id}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            className={`mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                error
                ? 'border-red-400 bg-red-50 focus:ring-red-500'
                : 'border-slate-300 bg-white focus:border-teal-600 focus:ring-teal-600'
            }`}
            {...inputProps}
            />
            {hint && (
                <p id={`${id}-hint`} className="mt-1 text-xs text-slate-600">
                    {hint}
                </p>
            )}
            {error && (
                <p id={`${id}-error`} className="mt-1 flex items-center gap-1 text-xs text-red-800">
                    <CircleAlert aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    {error}
                </p>
            )}
        </div>
    )
}

export default TextField