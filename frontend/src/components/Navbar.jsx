import { Link, NavLink } from 'react-router-dom'

const linkClass = ({ isActive }) =>
    `rounded px-3 py-2 text-smfont-medium ${
        isActive ? 'bg-teal-800 underline-offset-4' : 'hover:bg-teal-600'
    }`

function Navbar() {
    return (
        <header className="bg-teal-700 text-white">
            <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
                <Link to="/" className="text-lg font-bold">
                Cervical Screening Support
                </Link>
                <div className="flex flex-wrap gap-1">
                    <NavLink to="/about" className={linkClass}>About</NavLink>
                    <NavLink to="/login" className={linkClass}>Log In</NavLink>
                    <NavLink to="signup" className={linkClass}>Sign Up</NavLink>
                </div>
            </nav>
        </header>
    )
}
export default Navbar