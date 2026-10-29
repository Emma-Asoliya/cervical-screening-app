import { Link } from 'react-router-dom'
import {
ArrowRight,
  FileImage,
  Focus,
  Gauge,
  Layers,
  ShieldAlert,
  Stethoscope,
  Sun,
  Crosshair,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import Alert from '../components/Alert'
import ResultBadge from '../components/ResultBadge'
import { cardClass, secondaryButton } from '../components/ui'

const MODEL_IS_PLACEHOLDER = true

function InfoItem({ icon: Icon, title, children }) {
    return (
        <li className="flex gap-3">
            <Icon aria-hidden="true" className="mt=0.5 h-5 w-5 shrink-0 text-teal-700" />
            <div>
                <p className="font-semibold text-slate-800">{title}</p>
                <p className="text-sm text-slate-600">{children}</p>
            </div>
        </li>
    )
}

function About() {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
        Clinician guide
      </p>
      <h1 className="mt-1 text-2xl font-bold text-teal-700">About / How it works</h1>
      <p className="mt-1 text-slate-600">
        A practical guide to image-based decision support for doctors and nurses.
      </p>

      <div className="mt-6">
        <Alert
          variant="info"
          title="Decision support only. Not a diagnosis. The clinician's judgement decides the next step."
        />
      </div>

      <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
        <section className={cardClass}>
          <h2 className="text-lg font-bold text-teal-700">What this tool does</h2>
          <p className="mt-3 text-slate-800">
            Review one colposcopy image of the cervix at a time. The tool shows a Normal or
            Abnormal classification, a certainty level and a Grad-CAM heatmap.
          </p>
          <p className="mt-3 text-slate-800">
            Use the result to support your own review, not to determine a diagnosis or a care
            plan.
          </p>
          <ul className="mt-4 space-y-4">
            <InfoItem icon={FileImage} title="An image workspace, not a patient record">
              Do not upload patient details or images containing identifying labels.
            </InfoItem>
          </ul>
          {MODEL_IS_PLACEHOLDER && (
            <div className="mt-4">
              <Alert variant="warning" title="Placeholder outputs only">
                The model is not connected yet. Example results must not be used for patient
                care.
              </Alert>
            </div>
          )}
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-bold text-teal-700">How to get a usable image</h2>
          <ul className="mt-4 space-y-4">
            <InfoItem icon={Sun} title="Use even lighting">
              Avoid deep shadows, glare and images that are too dark or too bright.
            </InfoItem>
            <InfoItem icon={Focus} title="Check focus">
              Keep the camera steady. Retake the image if details look blurred.
            </InfoItem>
            <InfoItem icon={Crosshair} title="Centre the cervix">
              Keep the relevant area clearly visible in the frame.
            </InfoItem>
            <InfoItem icon={FileImage} title="Choose one image">
              Upload a JPEG or PNG up to 5 MB. Only one image can be reviewed at a time.
            </InfoItem>
          </ul>
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-bold text-teal-700">How to read the result</h2>
          <ul className="mt-4 space-y-4">
            <li>
              <ResultBadge result="Normal" />
              <p className="mt-1 text-sm text-slate-600">
                The model classified the image as Normal. Still review it alongside your
                clinical assessment.
              </p>
            </li>
            <li>
              <ResultBadge result="Abnormal" />
              <p className="mt-1 text-sm text-slate-600">
                The model classified image patterns as Abnormal. Review the image and
                highlighted areas using your clinical judgement.
              </p>
            </li>
            <InfoItem icon={Gauge} title="Certainty is not accuracy">
              The score shows how confident the model is in this classification, not how often
              it is right. The certainty levels use provisional thresholds that have not been
              validated. Low certainty calls for extra caution and an image-quality check.
            </InfoItem>
            <InfoItem icon={Layers} title="The heatmap is a review aid">
              Grad-CAM highlights areas that influenced the model's result. It does not show a
              diagnosis.
            </InfoItem>
          </ul>
        </section>

        <section className={cardClass}>
          <h2 className="text-lg font-bold text-teal-700">Limits</h2>
          <ul className="mt-4 space-y-4">
            <InfoItem icon={ShieldAlert} title="Not a diagnosis">
              The output is decision support only. It does not replace assessment by a
              qualified clinician.
            </InfoItem>
            <InfoItem icon={Wrench} title="Under development">
              The model is under development and has not been clinically validated.
            </InfoItem>
            <InfoItem icon={TriangleAlert} title="The model can be wrong">
              Image quality and image patterns can affect the output. A confident result can
              still be incorrect.
            </InfoItem>
            <InfoItem icon={Stethoscope} title="Always use clinical judgement">
              The clinician decides the next step using the image, examination findings and
              local clinical guidance.
            </InfoItem>
          </ul>
          <Link to="/dashboard" className={`${secondaryButton} mt-5`}>
            Go to Dashboard
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  )
}

export default About