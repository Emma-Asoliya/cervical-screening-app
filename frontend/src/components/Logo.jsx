function Logo({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="var(--brand)" />
      <circle cx="20" cy="20" r="9" fill="none" stroke="var(--on-brand)" strokeWidth="2.4" />
      <circle cx="20" cy="20" r="3.6" fill="var(--on-brand)" />
      <path d="M20 5v5M20 30v5M5 20h5M30 20h5" stroke="var(--on-brand)" strokeWidth="2" strokeLinecap="round" opacity=".7" />
    </svg>
  )
}

export default Logo