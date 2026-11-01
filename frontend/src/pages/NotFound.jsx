import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { cardClass, primaryButton } from '../components/ui'
import { useAuth } from '../auth/AuthContext'

function NotFound() {
    const { clinician } = useAuth()

    return (
        <div className="mx-auto max-w-md text-center">
            <p aria-hidden="true" className="text-6xl font-bold text-teal-700">
                404
            </p>
            <section className={`${cardClass} mt-4`}>
                <Compass aria-hidden="true" className="mx-auto h-6 w-6 text-teal-700" />
                <h1 className="mt-3 text-xl font-bold text-slate-800">Page not found</h1>
                <p className="mt-2 text-slate-600">
                    The page you are looking for does not exist.
                    {clinician ? 'Return to your image workspace.' : ''}
                </p>
                <Link
                    to={clinician ? '/dashboard' : '/about'}
                    className={`${primaryButton} mt-5 w-full`}
                >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    {clinician ? 'Back to Dashboard' : 'Back to About'}
                </Link>
            </section>
        </div>

    )
}

export default NotFound