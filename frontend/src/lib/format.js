export function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes /1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function mimeLabel(mimeType) {
    return mimeType === 'image/png' ? 'PNG' : 'JPEG'
}

export function formatDateTime(isoString) {
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) return ''

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Lagos',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date)
    
    const get = (type) => parts.find((part) => part.type === type)?.value ?? ''
    return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} WAT`
}
