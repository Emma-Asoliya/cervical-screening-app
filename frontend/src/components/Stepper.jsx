import { Check } from 'lucide-react'

function Stepper({ steps, current }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
      {steps.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? 'bg-brand text-on-brand'
                  : active
                    ? 'border-2 border-brand text-accent'
                    : 'border border-line text-muted'
              }`}
            >
              {done ? <Check aria-hidden="true" className="h-4 w-4" /> : index + 1}
            </span>
            <span className={active ? 'font-semibold text-ink' : 'text-muted'}>{label}</span>
            {index < steps.length - 1 && <span aria-hidden="true" className="mx-1 h-px w-6 bg-line sm:w-10" />}
          </li>
        )
      })}
    </ol>
  )
}

export default Stepper