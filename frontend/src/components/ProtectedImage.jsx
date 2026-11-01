import { CircleAlert, LoaderCircle } from 'lucide-react'
import { useProtectedImage } from '../hooks/useProtectedImage'

function ProtectedImage({ imageId, kind = 'file', alt, className = '', compact = false }) {
    const { url, status } = useProtectedImage(imageId, kind)

    return (
        <div
            className={`flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-slate-100 ${className}`}
        >
            {status === 'ready' && <img src={url} alt={alt} className="h-full w-full object-contain" />}

            {status === 'loading' && (
                <span role="status" className="flex items-center gap-2 text-sm text-slate-600">
                    <LoaderCircle
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    />
                    <span className={compact ? 'sr-only' : ''}>Loading image…</span>
                </span>
            )}

            {status === 'error' && (
                <span className="flex items-center gap-2 px-3 text-center text-sm text-red-800">
                    <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className={compact ? 'sr-only' : ''}>Image could not be loaded.</span>
                </span>
            )}
        </div>
    )
}
export default ProtectedImage