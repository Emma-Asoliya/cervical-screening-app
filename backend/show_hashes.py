import sqlite3

c = sqlite3.connect("app.db")
for row in c.execute(
    "SELECT clinician_id, substr(email,1,3)||'***', password_hash "
    "FROM clinicians WHERE email LIKE 'e2e%' LIMIT 5"
):
    print(row)