import { CircleCheck, TriangleAlert } from 'lucide-react'

const styles = {
    Normal: { box: 'border-teal-300 bg-teal-50 text-teal-800', Icon: CircleCheck },
    Abnormal: { box: 'border-amber-300 bg-amber-50 text-amber-900', Icon: TriangleAlert },
}

function ResultBadge({ result, size = 'sm' }) {
    const style = styles[result]
    if (!style) return null

    const { box, Icon} = style
    const sizing =
        size === 'lg' ? 'gap-2 px-4 py-2 text-xl font-bold' : 'gap-1 px-2 py-0.5 text-xs font-semibold'
    const iconSize = size === 'lg' ? 'h-6 w-6' : 'h3.5 w-3.5'

    return (
        <span className={`inline-flex items-center rounded-lg border ${box} ${sizing}`}>
            <Icon aria-hidden="true" className={iconSize} />
            {result}
        </span>
    )
}

export default ResultBadge