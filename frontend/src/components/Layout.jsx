import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

function Layout() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
                <Outlet />
            </main>
            <footer className="border-t border-teal-200 bg-white px-4 py-3 text-center text-sm text-slate-600">
                Decision support Only. Not a Diagnosis
            </footer>
        </div>
    )
}

export default Layout