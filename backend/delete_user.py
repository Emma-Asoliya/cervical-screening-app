import sys
from app.database import SessionLocal
from app.models import Clinician
from app.services import storage

db = SessionLocal()

if len(sys.argv) < 2:
    sys.exit("Usage: python delete_user.py <email-or-id-or-prefix%>")

key = sys.argv[1]
if key.isdigit():
    users = db.query(Clinician).filter(Clinician.clinician_id == int(key)).all()
else:
    users = db.query(Clinician).filter(Clinician.email.like(key)).all()

if not users:
    sys.exit("No matching user.")

for u in users:
    print(u.clinician_id, u.email, f"({len(u.images)} images)")

if input(f"Delete these {len(users)} user(s) and all their data? Type yes: ") != "yes":
    sys.exit("Cancelled.")

for u in users:
    paths = []
    for img in u.images:
        paths.append(img.file_path)
        if img.result:
            paths.append(img.result.heatmap_path)
    db.delete(u)
    db.commit()
    for p in paths:
        try:
            storage.delete(p)
        except (OSError, ValueError):
            pass

print("Done.")
