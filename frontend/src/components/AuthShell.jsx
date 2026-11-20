import { ScanSearch, ShieldCheck, Sparkles } from 'lucide-react'
import Logo from './Logo'

const points = [
  { Icon: ScanSearch, text: 'One colposcopy image in, a Normal or Abnormal classification out.' },
  { Icon: Sparkles, text: 'A Grad-CAM heatmap shows the areas that influenced the model.' },
  { Icon: ShieldCheck, text: 'Decision support only. The clinician decides the next step.' },
]

function AuthShell({ children }) {
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-2 lg:gap-14 lg:pt-6">
      <aside className="hidden lg:block">
        <Logo className="h-14 w-14" />
        <h2 className="mt-6 text-4xl font-bold leading-tight text-ink">
          A second look at every colposcopy image.
        </h2>
        <p className="mt-4 text-muted">
          A research prototype that helps doctors and nurses review images, with the reasoning
          made visible.
        </p>
        <ul className="mt-8 space-y-4">
          {points.map(({ Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm text-ink">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-accent">
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className="pt-1.5">{text}</span>
            </li>
          ))}
        </ul>
      </aside>
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  )
}

export default AuthShell