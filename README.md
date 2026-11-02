# Cervical Screening Decision Support

A web application that helps clinicians screen for cervical abnormalities. A clinician uploads a colposcopy photo taken after acetic acid. The app returns a Normal or Abnormal result, a confidence level, a Grad-CAM heatmap showing where the model looked, and a plain-language explanation.

> **Research prototype. Not validated for clinical use.** It supports a clinician's judgement and does not replace it.

**Walkthrough video:** https://drive.google.com/file/d/1W0Hsf2Nt7fGXdQC-UT6yxeDcdlsYiKBB/view?usp=sharing
**Technical report (PDF):** (https://docs.google.com/document/d/1KJ3K7myERDxkcC_M4ShHGrf7SKvR0zZDEKP1XWluX84/edit?usp=sharing)
**Author:** Emmanuella Briggs, capstone project

---

## Contents

1. [Features](#features)
2. [How it works](#how-it-works)
3. [Technical requirements](#technical-requirements)
4. [Installation](#installation)
5. [Running the app](#running-the-app)
6. [Testing](#testing)
7. [Repository structure](#repository-structure)
8. [Model details and limits](#model-details-and-limits)
9. [Security notes](#security-notes)
10. [Known limitations](#known-limitations)

---

## Features

- **Clinician accounts:** sign up, log in and log out. Passwords are hashed with bcrypt. Sessions use JWT tokens that expire after 60 minutes.
- **Image upload with checks:** accepts JPEG or PNG at exactly 640 × 480 pixels, up to 5 MB. Blurred or badly lit photos trigger a warning the clinician can override.
- **AI prediction:** an ensemble of five small CNNs (one per cross-validation fold) votes on each photo.
- **Explainability:** a Grad-CAM heatmap, a confidence score, a certainty level (High, Medium or Low) and a plain-language explanation.
- **History:** every result is stored and listed per clinician. Clinicians can only see their own results.

## How it works

```
React (Vite)  ──JSON──▶  FastAPI  ──▶  image checks  ──▶  TensorFlow ensemble + Grad-CAM
                            │                                      │
                            └────────────  SQLite + file storage  ◀┘
```

1. The browser sends the photo and the login token to `POST /images`.
2. The backend checks the token, the file type, size, pixel count and sharpness.
3. The model runs first. The database write happens afterwards, in one short transaction. (This ordering fixed a "database is locked" error found by the load test.)
4. The result, the heatmap and the explanation are returned and stored.

Certainty levels come from the probability of the predicted class: High is 0.85 or more, Medium is 0.65 or more, otherwise Low.

## Technical requirements

| Component | Version |
|---|---|
| Python | 3.13 (TensorFlow 2.21 does not support 3.14) |
| TensorFlow / Keras | 2.21.0 / Keras 3 |
| FastAPI, SQLAlchemy 2, SQLite | see `backend/requirements.txt` |
| Node.js | 20 or newer |
| React, Vite, Tailwind CSS | React 19, Vite 8, Tailwind 4 |
| Browser for the app | Any current Chrome, Edge, Firefox or Safari |
| Hardware | 4 GB free RAM or more. No GPU needed |

Operating systems used during development: Windows 11 and Linux.

## Installation

### 1. Clone

```bash
git clone https://github.com/Emma-Asoliya/cervical-screening-app
cd cervical-screening-app
```

### 2. Backend

```powershell
cd backend
py -3.13 -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (never commit this file):

```
SECRET_KEY=<at least 32 random characters>
```

Generate a key with:

```
python -c "import secrets; print(secrets.token_urlsafe(48))"
```


### 3. Model files

Copy the five trained fold models into `backend/app/ml_models/`:

```
fold0.keras  fold1.keras  fold2.keras  fold3.keras  fold4.keras
config.json   (optional: holds the decision threshold)
```

They are produced by section 12 of `Cervical_Screening_Model_v5_after_acid_only.ipynb`. See `backend/app/ml_models/README.md`.

### 4. Frontend

```powershell
cd frontend
npm install
```

## Running the app

Open two terminals.

```powershell
# Terminal 1: backend (from backend/, venv active)
uvicorn app.main:app --reload

# Terminal 2: frontend (from frontend/)
npm run dev
```

Open <http://localhost:5173>. Use `localhost`, not `127.0.0.1`, because the backend only allows that origin. Interactive API docs are at <http://127.0.0.1:8000/docs>.

To check the model against the notebook, run `python -m app.services.predictor path/to/photo.jpg` from `backend/`.

## Testing

From `backend/` with the venv active:

```powershell
pip install psutil                              # optional, adds memory figures
pytest -q                                       # unit and integration tests
pytest tests/test_performance.py -s             # shows measured timings
python scripts/benchmark.py                     # speed, memory, machine details
python scripts/load_test.py --users 20 --uploads 3   # backend running; use a throwaway database
```

End-to-end browser tests, from `frontend/` with both servers running:

```powershell
npm i -D @playwright/test
npx playwright install
npx playwright test
```

| Test type | What it covers | Where |
|---|---|---|
| Unit and integration | Authentication, upload API, predictor contract | `backend/tests/` |
| Input handling | Valid and invalid files, wrong size, EXIF rotation, oversized images, bad file names | `test_input_validation.py` |
| Model files | Shape, probabilities, five distinct models (skipped if the models are missing) | `test_model_files.py` |
| Performance | Warm prediction, full upload, login timing | `test_performance.py`, `scripts/benchmark.py` |
| Load and stress | Many simultaneous users | `scripts/load_test.py` |
| End to end and compatibility | Signup, login, upload, history across browsers and phone sizes | `frontend/e2e/` |

Results are in the technical report.

## Repository structure

```
cervical-screening-app/
├── Cervical_Screening_Model_v5_after_acid_only.ipynb   # model training and export
├── backend/
│   ├── app/
│   │   ├── main.py            # app creation, CORS, routers
│   │   ├── config.py          # settings from .env
│   │   ├── database.py        # SQLite engine and sessions
│   │   ├── models.py          # database tables
│   │   ├── schemas.py         # request and response shapes
│   │   ├── security.py        # password hashing, JWT
│   │   ├── dependencies.py    # current-user dependency
│   │   ├── routers/           # auth.py, images.py (HTTP layer)
│   │   ├── services/          # predictor, analysis, quality, images, storage
│   │   └── ml_models/         # the five .keras files go here
│   ├── tests/                 # pytest suites
│   └── scripts/               # benchmark.py, load_test.py
└── frontend/
    ├── src/
    │   ├── pages/             # Login, Signup, Dashboard, Result, History, About
    │   ├── components/        # shared UI
    │   ├── auth/              # AuthContext, route guard
    │   └── api/               # API client
    ├── e2e/                   # Playwright tests
    └── playwright.config.js
```

Each backend layer has one job: routers handle HTTP, services hold the logic, and models and schemas describe the data.

## Model details and limits

- Trained on 3,310 after-acid photos from 332 patients, with a patient-grouped 5-fold split.
- Architecture: a small CNN (about 23.6k parameters per fold). Pretrained backbones were tested and scored lower.
- Patient-level cross-validated AUC is 0.625 (95% CI 0.565–0.688). This is modest. Sensitivity 0.67 and specificity 0.53 are at a provisional threshold.
- Grad-CAM uses the last convolutional layer. The timestamp area of the photo is blanked.

## Security notes

- `.env` and the database are excluded by `.gitignore`.
- Passwords: bcrypt, 8–72 characters. Login runs a dummy hash for unknown emails, so timing does not reveal which emails exist.
- Uploads are re-encoded, stored under random names and served only to their owner with `no-store` caching.

## Known limitations

- Modest model accuracy. Not for clinical use.
- Email addresses are checked for format only. There is no email confirmation or password reset.
- Only 640 × 480 after-acid photos are accepted.
- Runs locally. No hosted deployment.
- Binary output only. No severity grading.
