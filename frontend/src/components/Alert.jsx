import { CircleAlert, Info, TriangleAlert } from 'lucide-react'

const variants = {
  info: { box: 'border-line bg-brand-soft text-ink', icon: 'text-accent', Icon: Info, role: 'status' },
  warning: { box: 'border-warn-line bg-warn-soft text-warn', icon: 'text-warn', Icon: TriangleAlert, role: 'status' },
  error: { box: 'border-danger-line bg-danger-soft text-danger', icon: 'text-danger', Icon: CircleAlert, role: 'alert' },
}

function Alert({ variant = 'info', title, children }) {
  const { box, icon, Icon, role } = variants[variant]

  return (
    <div role={role} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${box}`}>
      <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${icon}`} />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="mt-0.5">{children}</div>}
      </div>
    </div>
  )
}

export default Alert