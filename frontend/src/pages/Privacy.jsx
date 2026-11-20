import { cardClass, eyebrow, pageTitle } from '../components/ui'

const sections = [
  {
    title: 'Who runs this',
    body: [
      'This is a research prototype built by Emmanuella Briggs for an African Leadership University capstone project. It has not been validated for clinical use.',
      'Questions or requests: e.briggs@alustudent.com',
    ],
  },
  {
    title: 'What we collect',
    body: [
      'Your full name and email address.',
      'Your password. We never store it. We store only a salted bcrypt hash of it.',
      'The 6-digit code we email you. It is stored hashed and expires after 15 minutes.',
      'The images you upload and their results: the Normal or Abnormal label, the certainty level, the explanation, the heatmap and the time.',
    ],
  },
  {
    title: 'What we do not collect',
    body: [
      'No patient names, ages, IDs or any other patient details. Please use only the sample images you were given. Do not upload real patient images.',
      'No advertising, no analytics and no third-party trackers.',
    ],
  },
  {
    title: 'Why we use it',
    body: [
      'To log you in, run the analysis, and show your own history. Nothing else.',
    ],
  },
  {
    title: 'Who can see it',
    body: [
      'You see your own images and results. Other users cannot see them.',
      'The developer can reach the database for maintenance and testing.',
      'Your email provider sends the verification code. It sees your email address and the code message.',
    ],
  },
  {
    title: 'How long we keep it',
    body: [
      'Images and results stay until you delete them. Account details stay until your account is deleted.',
      'All prototype data will be deleted by March 2027.',
    ],
  },
  {
    title: 'Your choices',
    body: [
      'Delete any image and its result yourself, using the Delete button on the result page.',
      'Email us to see, correct or delete your account details.',
    ],
  },
  {
    title: 'How we protect it',
    body: [
      'Passwords and codes are hashed. Your session ends after 60 minutes. Only JPEG or PNG images up to 5 MB are accepted. Your login token is kept in your browser until you log out or it expires.',
    ],
  },
  {
    title: 'Not a diagnosis',
    body: [
      'The result is decision support only. It does not replace a clinician. The clinician decides the next step.',
    ],
  },
]

function Privacy() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className={eyebrow}>Your data</p>
      <h1 className={pageTitle}>Privacy Policy</h1>
      <p className="mt-1 text-muted">In plain English. Last updated: 20 November 2026.</p>

      <div className="mt-6 space-y-4">
        {sections.map((s) => (
          <section key={s.title} className={cardClass}>
            <h2 className="text-lg font-semibold text-ink">{s.title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink">
              {s.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

export default Privacy
