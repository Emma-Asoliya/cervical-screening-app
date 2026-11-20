import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'


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
        `${baseLink} ${block ? 'block' : ''} ${isActive ? 'bg-brand-soft text-accent' : 'text-muted hover:bg-brand-soft hover:text-ink'
        }`
}

function initials(name) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
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
                        className={`${baseLink} inline-flex items-center gap-1.5 text-muted hover:bg-brand-soft hover:text-ink ${block ? 'flex w-full' : ''
                            }`}
                    >
                        <LogOut aria-hidden="true" className="h-4 w-4" />
                        Log out
                    </button>
                )}
            </>
        )
    }

    const brand = (
        <span className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-ink">
            <Logo className="h-8 w-8" />
            Cervical Screening Support
        </span>
    )

    return (
        <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur print:hidden">
            <nav aria-label="Main" className="mx-auto max-w-5xl px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                    {clinician ? (
                        <Link to="/dashboard" className={`rounded-lg ${focusRing}`}>
                            {brand}
                        </Link>
                    ) : (
                        brand
                    )}

                    <div className="flex items-center gap-2">
                        {ready && (
                            <div className="hidden items-center gap-1 md:flex">
                                {renderItems(false)}
                                {clinician && (
                                    <span
                                        className="ml-2 flex max-w-48 items-center gap-2 truncate text-sm text-ink"
                                        title={clinician.full_name}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-brand"
                                        >
                                            {initials(clinician.full_name)}
                                        </span>
                                        <span className="truncate">{clinician.full_name}</span>
                                    </span>
                                )}
                            </div>
                        )}
                        <ThemeToggle />
                        {ready && (
                            <button
                                ref={menuButton}
                                type="button"
                                onClick={() => setOpen(!open)}
                                aria-expanded={open}
                                aria-controls="mobile-menu"
                                className={`inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-brand-soft md:hidden ${focusRing}`}
                            >
                                {open ? (
                                    <X aria-hidden="true" className="h-4 w-4" />
                                ) : (
                                    <Menu aria-hidden="true" className="h-4 w-4" />
                                )}
                                Menu
                            </button>
                        )}
                    </div>
                </div>

                {ready && open && (
                    <div id="mobile-menu" className="mt-3 space-y-1 border-t border-line pt-3 md:hidden">
                        {clinician && (
                            <p className="px-3 pb-1 text-sm text-ink">
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