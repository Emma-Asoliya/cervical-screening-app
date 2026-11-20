const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg'

const button =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed'

export const primaryButton = `${button} bg-brand text-on-brand shadow-sm hover:bg-brand-strong disabled:bg-line disabled:text-muted ${focusRing}`
export const secondaryButton = `${button} border border-line bg-surface text-ink hover:bg-brand-soft disabled:text-muted ${focusRing}`
export const ghostButton = `${button} text-accent hover:bg-brand-soft disabled:text-muted ${focusRing}`
export const dangerButton = `${button} bg-danger-soft border border-danger-line text-danger hover:brightness-95 disabled:opacity-60 ${focusRing}`

export const cardClass = 'rounded-2xl border border-line bg-surface p-6 shadow-card'

export const inputClass =
  'mt-1 w-full rounded-xl border bg-surface px-3.5 py-2.5 text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2'

export const eyebrow = 'text-xs font-semibold uppercase tracking-widest text-accent'
export const pageTitle = 'mt-1 text-3xl font-bold text-ink'