import { Link, Outlet } from 'react-router-dom'
import Navbar from './Navbar'

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-line px-4 py-4 text-center text-sm text-muted print:hidden">
        <p>Decision support only. Not a diagnosis.</p>
        <p className="mt-1">
          <Link to="/privacy" className="font-medium text-accent underline">
            Privacy Policy
          </Link>
        </p>
      </footer>
    </div>
  )
}

export default Layout