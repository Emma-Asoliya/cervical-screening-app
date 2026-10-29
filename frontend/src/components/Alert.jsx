import { CircleAlert, Info, TriangleAlert } from 'lucide-react'

const variants = {
    info: { box: 'border-teal-300 bg-teal-50 text-teal-900', Icon: Info, role: 'status'},
    warning: { box: 'border-amber-300 bg-amber-50 text-amber-900', Icon: TriangleAlert, role: 'status'},
    error: { box: 'border-red-300 bg-red-50 text-red-900', Icon: CircleAlert, role: 'alert'},
}

function Alert({ variant = 'info', title, children }) {
    const { box, Icon, role } = variants[variant]

    return (
        <div role={role} className={`flex gap-2 rounded-lg border px-3 py-2 text-sm ${box}`}>
            <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
                {title && <p className="font-semibold">{title}</p>}
                {children && <div>{children}</div>}
            </div>
        </div>
    )
}

export default Alert