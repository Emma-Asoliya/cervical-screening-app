import { CircleCheck, TriangleAlert } from 'lucide-react'

const styles = {
  Normal: { box: 'border-line bg-brand-soft text-accent', Icon: CircleCheck },
  Abnormal: { box: 'border-warn-line bg-warn-soft text-warn', Icon: TriangleAlert },
}

function ResultBadge({ result, size = 'sm' }) {
  const style = styles[result]
  if (!style) return null

  const { box, Icon } = style
  const sizing =
    size === 'lg' ? 'gap-2 px-4 py-2 text-xl font-bold' : 'gap-1 px-2.5 py-0.5 text-xs font-semibold'
  const iconSize = size === 'lg' ? 'h-6 w-6' : 'h-3.5 w-3.5'

  return (
    <span className={`inline-flex items-center rounded-full border ${box} ${sizing}`}>
      <Icon aria-hidden="true" className={iconSize} />
      {result}
    </span>
  )
}

export default ResultBadge