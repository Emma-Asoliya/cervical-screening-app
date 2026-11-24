from sqlalchemy import text

from app.database import engine

with engine.connect() as c:
    for row in c.execute(
        text(
            "SELECT clinician_id, substr(email,1,3)||'***', password_hash "
            "FROM clinicians WHERE email LIKE 'e2e%' LIMIT 5"
        )
    ):
        print(tuple(row))
