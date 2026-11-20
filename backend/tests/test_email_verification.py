from datetime import datetime, timedelta, timezone

import pytest

from app.config import settings
from app.models import Clinician
from app.services import email as email_service

PASSWORD = "correct-horse-1"


@pytest.fixture
def mailbox(monkeypatch):
    """Switch verification on and capture the codes that would have been emailed."""
    sent = []
    monkeypatch.setattr(settings, "require_email_verification", True)
    monkeypatch.setattr(
        email_service, "send_verification_email", lambda to, name, code: sent.append((to, code))
    )
    return sent


def signup(client, email="v@example.com"):
    return client.post(
        "/auth/signup", json={"full_name": "Verify Me", "email": email, "password": PASSWORD}
    )


def login(client, email="v@example.com"):
    return client.post("/auth/login", data={"username": email, "password": PASSWORD})


def db_row(client, email="v@example.com"):
    from app.database import get_db

    db = next(client.app.dependency_overrides[get_db]())
    return db, db.query(Clinician).filter_by(email=email).one()


def test_signup_sends_a_code_and_account_starts_unverified(client, mailbox):
    response = signup(client)
    assert response.status_code == 201
    assert response.json()["email_verified"] is False
    assert len(mailbox) == 1 and mailbox[0][0] == "v@example.com"
    assert len(mailbox[0][1]) == 6 and mailbox[0][1].isdigit()


def test_code_is_stored_only_as_a_hash(client, mailbox):
    signup(client)
    db, row = db_row(client)
    assert row.verification_code_hash.startswith("$2")
    assert mailbox[0][1] not in row.verification_code_hash
    db.close()


def test_unverified_account_cannot_log_in(client, mailbox):
    signup(client)
    response = login(client)
    assert response.status_code == 403
    assert response.json()["detail"] == "email_not_verified"


def test_wrong_password_still_gives_the_generic_error_when_unverified(client, mailbox):
    signup(client)
    response = client.post("/auth/login", data={"username": "v@example.com", "password": "nope-nope-1"})
    assert response.status_code == 401


def test_correct_code_verifies_and_login_works(client, mailbox):
    signup(client)
    code = mailbox[0][1]
    assert client.post("/auth/verify", json={"email": "v@example.com", "code": code}).status_code == 200
    assert login(client).status_code == 200


def test_wrong_code_is_rejected(client, mailbox):
    signup(client)
    wrong = "000000" if mailbox[0][1] != "000000" else "111111"
    assert client.post("/auth/verify", json={"email": "v@example.com", "code": wrong}).status_code == 400
    assert login(client).status_code == 403


def test_code_locks_after_too_many_wrong_attempts(client, mailbox):
    signup(client)
    real = mailbox[0][1]
    wrong = "000000" if real != "000000" else "111111"
    for _ in range(settings.verification_max_attempts):
        client.post("/auth/verify", json={"email": "v@example.com", "code": wrong})
    response = client.post("/auth/verify", json={"email": "v@example.com", "code": real})
    assert response.status_code == 400
    assert login(client).status_code == 403


def test_expired_code_is_rejected(client, mailbox):
    signup(client)
    db, row = db_row(client)
    row.verification_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()
    db.close()
    response = client.post("/auth/verify", json={"email": "v@example.com", "code": mailbox[0][1]})
    assert response.status_code == 400


def test_malformed_code_is_rejected_by_validation(client, mailbox):
    signup(client)
    assert client.post("/auth/verify", json={"email": "v@example.com", "code": "12ab56"}).status_code == 422


def test_resend_is_rate_limited_then_sends_a_fresh_code(client, mailbox, monkeypatch):
    signup(client)
    assert client.post("/auth/resend", json={"email": "v@example.com"}).status_code == 429
    monkeypatch.setattr(settings, "verification_resend_seconds", 0)
    assert client.post("/auth/resend", json={"email": "v@example.com"}).status_code == 200
    assert len(mailbox) == 2


def test_resend_does_not_reveal_unknown_emails(client, mailbox):
    response = client.post("/auth/resend", json={"email": "nobody@example.com"})
    assert response.status_code == 200
    assert mailbox == []


def test_verification_can_be_switched_off(client):
    assert settings.require_email_verification is False
    assert signup(client).json()["email_verified"] is True
    assert login(client).status_code == 200