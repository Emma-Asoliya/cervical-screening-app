import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { CircleUser, Menu, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visble:ring-white'
const baseLink = `rounded px-3 py-2 text-sm font-medium ${focusRing}`

const loggedInLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/history', label: 'History' },
    { to: '/about', label: 'About' },
]
const loggedOutLinks = [
    { to: '/about', label: 'About' },
    { to: '/login', label: 'Log in' },
    { to: '/signup', label: 'Sign up' },
]

function linkClass(block) {
    return ({ isActive }) =>
        `${baseLink} ${block ? 'block' : ''} ${isActive ? 'bg-teal-800 underline underline-offset-4' : 'hover:bg-teal-600'
        }`
}

function Navbar() {
    const { clinician, loading, logout } = useAuth()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const menuButton = useRef(null)

    useEffect(() => {
        if (!open) return
        function onKeyDown(event) {
            if (event.key === 'Escape') {
                setOpen(false)
                menuButton.current?.focus()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [open])

    function handleLogout() {
        setOpen(false)
        logout()
        navigate('/login', { replace: true })
    }

    const ready = !loading
    const links = clinician ? loggedInLinks : loggedOutLinks

    function renderItems(block) {
        return (
            <>
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setOpen(false)}
                        className={linkClass(block)}
                    >
                        {link.label}
                    </NavLink>
                ))}
                {clinician && (
                    <button
                        type="button"
                        onClick={handleLogout}
                        className={`${baseLink} hover:bg-teal-600 ${block ? 'block w-full text-left' : ''}`}
                    >
                        Log out
                    </button>
                )}
            </>
        )
    }

    return (
        <header className="bg-teal-700 text-white">
            <nav aria-label="Main" className="mx-auto max-w-5xl px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                    {clinician ? (
                        <Link to="/dashboard" className={`rounded text-lg font-bold ${focusRing}`}>
                            Cervical Screening Support
                        </Link>
                    ) : (
                        <span className="text-lg font-bold">Cervical Screening Support</span>
                    )}

                    {ready && (
                        <>
                            <div className="hidden items-center gap-1 md:flex">
                                {renderItems(false)}
                                {clinician && (
                                    <span
                                        className="ml-2 flex max-w-48 items-center gap-1 truncate text-sm"
                                        title={clinician.full_name}
                                    >
                                        <CircleUser aria-hidden="true" className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{clinician.full_name}</span>
                                    </span>
                                )}
                            </div>

                            <button
                                ref={menuButton}
                                type="button"
                                onClick={() => setOpen(!open)}
                                aria-expanded={open}
                                aria-controls="mobile-menu"
                                className={`inline-flex items-center gap-2 rounded border border-white/40 px-3 py-2 text-sm font-medium hover:bg-teal-600 md:hidden ${focusRing}`}
                            >
                                {open ? (
                                    <X aria-hidden="true" className="h-4 w-4" />
                                ) : (
                                    <Menu aria-hidden="true" className="h-4 w-4" />
                                )}
                                Menu
                            </button>
                        </>
                    )}
                </div>

                {ready && open && (
                    <div id="mobile-menu" className="mt-3 space-y-1 border-t border-teal-600 pt-3 md:hidden">
                        {clinician && (
                            <p className="px-3 pb-1 text-sm">
                                Signed in as <span className="font-semibold">{clinician.full_name}</span>
                            </p>
                        )}
                        {renderItems(true)}
                    </div>
                )}
            </nav>
        </header>
    )
}

export default Navbar