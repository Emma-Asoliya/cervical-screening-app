import { useEffect, useState } from 'react'
import { apiBlob } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function useProtectedImage(imageId, kind) {
    const { token } = useAuth()
    const [state, setState] = useState({ url: null, status: 'loading' })

    useEffect(() => {
        const controller = new AbortController()
        let cancelled = false
        let objectUrl = null

        setState({ url: null, status: 'loading' })

        apiBlob(`/images/${imageId}/${kind}`, { token, signal: controller.signal })
            .then((blob) => {
                if (cancelled) return
                objectUrl = URL.createObjectURL(blob)
                setState({ url: objectUrl, status: 'ready' })
            })
            .catch((error) => {
                if (cancelled || error.name === 'AbortError') return
                console.error('Image failed to load:', error)
                setState({ url: null, status: 'error' })
            })
        return () => {
            cancelled = true
            controller.abort()
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [imageId, kind, token])

    return state
}