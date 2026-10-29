import { useState } from 'react'

function PasswordInput({ id, label, value, onChange, autoComplete }) {
    const [visible, setVisible] = useState(false)

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                {label}
                </label>
                <div className="mt-1 flex">
                    <input
                        id={id}
                        type={visible ? 'text' : 'password'}
                        value={value}
                        onChange={onChange}
                        autoComplete={autoComplete}
                        required
                        className="w-full rounded-l-lg border border-slate-300 bg-white px-3 py-2 focus:border-teal-600 focus:outline-none focus:ring-2 -teal-600"
                        />
                        <button
                            type="button"
                            onClick={() => setVisible(!visible)}
                            aria-label={visible ? 'Hide password' : 'Show password'}
                            className="rounded-r-lg border border-l-0 border-slate-300 hg-white px-3 text-sm font-medium text-teal-700 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
                            >
                                {visible ? 'Hide' : 'Show'}
                                </button>
                </div>
        </div>
    )
}

export default PasswordInput