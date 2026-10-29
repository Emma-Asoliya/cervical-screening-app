import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'


const baseLink =  
    'rounded px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white'


    const navLinkClass = ({ isActive }) =>
        `${baseLink} ${isActive ? 'bg-teal-800 underline underline-offset-4' : 'hover:bg-teal-600'}`


function Navbar() {
    const { clinician, loading, logout } = useAuth()
    const navigate = useNavigate()

    function handleLogout() {
        logout()
        navigate('/login', { replace: true })
    }
 
    let links = null
    if (!loading && clinician) {
        links = (
            <>
                <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/history" className={navLinkClass}>History</NavLink>
                <NavLink to="/about" className={navLinkClass}>About</NavLink>
                <button type="button" onClick={handleLogout} className={`${baseLink} hover:bg-teal-600`}>
                    Log Out
                </button>
                <span className="max-w-40 truncate px-2 text-sm" title={clinician.full_name}>
                    {clinician.full_name}
                </span>
            </>
        )
    } else if (!loading) {
        links = (
            <>
            <NavLink to="/about" className={navLinkClass}>About</NavLink>
            <NavLink to="/login" className={navLinkClass}>Log In</NavLink>
            <NavLink to="/signup" className={navLinkClass}>Sign Up</NavLink>
            </>
        )
    }

    return (
        <header className="bg-teal-700 text-white">
            <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
                <Link to={clinician ? '/dashboard' : '/login'} className="text-lg font-bold">
                    Cervical Screening App
                </Link>
                <div className="flex flex-wrap items-center gap-1">{links}</div>
            </nav>
        </header>
    )
}
export default Navbar