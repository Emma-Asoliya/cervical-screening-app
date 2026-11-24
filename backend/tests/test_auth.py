from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.config import settings
from app.security import create_access_token, decode_access_token

PASSWORD = "correct-horse-1"


def signup(client, email="a@example.com", password=PASSWORD, name="Test Clinician"):
    return client.post(
        "/auth/signup", json={"full_name": name, "email": email, "password": password}
    )


def login(client, email="a@example.com", password=PASSWORD):
    return client.post("/auth/login", data={"username": email, "password": password})


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def forge(payload, key=None, algorithm="HS256"):
    return jwt.encode(payload, key or settings.secret_key, algorithm=algorithm)


def future(minutes=30):
    return datetime.now(timezone.utc) + timedelta(minutes=minutes)


# ---- sign up -------------------------------------------------------------------


def test_signup_creates_an_account_without_leaking_the_password(client):
    response = signup(client)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "a@example.com"
    assert "password" not in body and "password_hash" not in body
    assert PASSWORD not in response.text


def test_signup_stores_a_salted_bcrypt_hash(client):
    from app.models import Clinician
    from app.security import verify_password

    signup(client, "one@example.com")
    signup(client, "two@example.com")
    db = next(client.app.dependency_overrides[__import__("app.database", fromlist=["get_db"]).get_db]())
    rows = db.query(Clinician).order_by(Clinician.clinician_id).all()
    assert all(r.password_hash.startswith("$2") for r in rows)
    assert rows[0].password_hash != rows[1].password_hash  # same password, different salt
    assert PASSWORD not in rows[0].password_hash
    assert verify_password(PASSWORD, rows[0].password_hash)
    db.close()


def test_duplicate_email_is_refused_even_with_different_case(client):
    assert signup(client, "a@example.com").status_code == 201
    assert signup(client, "A@Example.com").status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {"full_name": "Test", "email": "not-an-email", "password": PASSWORD},
        {"full_name": "T", "email": "a@example.com", "password": PASSWORD},
        {"full_name": "Test", "email": "a@example.com", "password": "short"},
        {"full_name": "Test", "email": "a@example.com", "password": "x" * 73},
        {"full_name": "Test", "email": "a@example.com"},
    ],
)
def test_signup_rejects_bad_input(client, payload):
    assert client.post("/auth/signup", json=payload).status_code == 422


def test_a_long_passphrase_works(client):
    passphrase = "a long passphrase is stronger than a short one 1"  # 49 bytes
    assert signup(client, password=passphrase).status_code == 201
    assert login(client, password=passphrase).status_code == 200


# ---- login ---------------------------------------------------------------------


def test_login_returns_a_bearer_token_that_works(client):
    signup(client)
    response = login(client)
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    me = client.get("/auth/me", headers=bearer(body["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "a@example.com"


def test_login_ignores_email_case(client):
    signup(client, "a@example.com")
    assert login(client, "A@EXAMPLE.COM").status_code == 200


def test_wrong_password_and_unknown_email_look_the_same(client):
    signup(client)
    wrong = login(client, password="wrong-password-1")
    unknown = login(client, email="nobody@example.com")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()  # does not reveal which emails exist


def test_login_with_an_overlong_password_is_just_a_failure(client):
    signup(client)
    assert login(client, password="x" * 200).status_code == 401


def test_token_lifetime_matches_the_setting(client):
    signup(client)
    token = login(client).json()["access_token"]
    claims = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    left = datetime.fromtimestamp(claims["exp"], timezone.utc) - datetime.now(timezone.utc)
    assert timedelta(minutes=settings.access_token_minutes - 1) < left <= timedelta(
        minutes=settings.access_token_minutes
    )


# ---- protected routes ----------------------------------------------------------

PROTECTED = [
    ("get", "/auth/me"),
    ("get", "/images"),
    ("post", "/images"),
    ("get", "/images/1"),
    ("get", "/images/1/file"),
    ("get", "/images/1/heatmap"),
]


@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_routes_need_a_token(client, method, path):
    assert getattr(client, method)(path).status_code == 401


@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_routes_reject_a_garbage_token(client, method, path):
    assert getattr(client, method)(path, headers=bearer("not.a.token")).status_code == 401


def test_an_expired_token_is_rejected(client, monkeypatch):
    signup(client)
    monkeypatch.setattr(settings, "access_token_minutes", -1)
    token = login(client).json()["access_token"]
    monkeypatch.undo()
    response = client.get("/auth/me", headers=bearer(token))
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_a_token_signed_with_another_key_is_rejected(client):
    signup(client)
    token = forge({"sub": "1", "exp": future()}, key="a-different-secret-key-of-32-bytes!!")
    assert client.get("/auth/me", headers=bearer(token)).status_code == 401


def test_an_unsigned_none_algorithm_token_is_rejected(client):
    signup(client)
    token = jwt.encode({"sub": "1", "exp": future()}, key=None, algorithm="none")
    assert client.get("/auth/me", headers=bearer(token)).status_code == 401


def test_a_token_with_no_expiry_is_rejected(client):
    signup(client)
    assert client.get("/auth/me", headers=bearer(forge({"sub": "1"}))).status_code == 401


def test_a_token_with_no_subject_or_a_bad_one_is_rejected(client):
    signup(client)
    for payload in ({"exp": future()}, {"sub": "abc", "exp": future()}):
        assert client.get("/auth/me", headers=bearer(forge(payload))).status_code == 401


def test_a_valid_token_for_a_user_that_no_longer_exists_is_rejected(client):
    signup(client)
    token = create_access_token(9999)
    assert client.get("/auth/me", headers=bearer(token)).status_code == 401


def test_a_tampered_token_is_rejected(client):
    signup(client)
    token = login(client).json()["access_token"]
    head, body, sig = token.split(".")
    tampered = f"{head}.{body}.{sig[:-2]}{'AA' if sig[-2:] != 'AA' else 'BB'}"
    assert client.get("/auth/me", headers=bearer(tampered)).status_code == 401


def test_the_wrong_auth_scheme_is_rejected(client):
    signup(client)
    token = login(client).json()["access_token"]
    response = client.get("/auth/me", headers={"Authorization": f"Basic {token}"})
    assert response.status_code == 401


def test_decode_returns_none_instead_of_raising():
    assert decode_access_token("") is None
    assert decode_access_token("garbage") is None