import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '.AuthContext'

function RequireAuth() {
    const { clinician, loading } = useAuth()
    const location = useLocation()

    if (loading) {
        return <p role="status" className="text-slate-600">Loading...</p>
    }

    if (!clinician) {
        return (
            <Navigate to="/login" replace state={{ from: location.pathname, notice: 'Please log in to continue.'}}
            />
        )
    }
    return <Outlet />
}

export default RequireAuth