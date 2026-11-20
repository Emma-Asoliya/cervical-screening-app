import { useState } from 'react'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { inputClass } from './ui'

function PasswordInput({ id, label, hint, error, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`${inputClass} pr-24 ${
            error
              ? 'border-danger-line bg-danger-soft focus:ring-danger'
              : 'border-line focus:border-brand focus:ring-brand/40'
          }`}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 mt-1 flex items-center gap-1 rounded-r-xl px-3 text-sm font-medium text-accent hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 flex items-center gap-1 text-xs text-danger">
          <CircleAlert aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

export default PasswordInput