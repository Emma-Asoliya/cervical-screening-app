import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

function HomeRedirect() {
    const { clinician, loading } = useAuth()

    if (loading) {
        return (
            <p role="status" className="text-slate-600">
                Loading...
            </p>
        )
    }

    return <Navigate to={clinician ? '/dashboard' : '/about'} replace />

}

export default HomeRedirect