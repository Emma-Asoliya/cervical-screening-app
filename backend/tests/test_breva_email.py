import httpx
import pytest

from app.config import settings
from app.services import email as email_service


@pytest.fixture
def brevo(monkeypatch):
    monkeypatch.setattr(settings, "brevo_api_key", "test-key")
    monkeypatch.setattr(settings, "brevo_sender_email", "sender@example.com")
    monkeypatch.setattr(settings, "smtp_host", "")
    calls = []
    return calls


def test_brevo_api_is_used_when_a_key_is_set(brevo, monkeypatch):
    def fake_post(url, json, headers, timeout):
        brevo.append((url, json, headers))
        return httpx.Response(201, request=httpx.Request("POST", url))

    monkeypatch.setattr(email_service.httpx, "post", fake_post)
    email_service.send_verification_email("a@example.com", "Ada", "123456")

    url, payload, headers = brevo[0]
    assert url == "https://api.brevo.com/v3/smtp/email"
    assert headers["api-key"] == "test-key"
    assert payload["to"] == [{"email": "a@example.com", "name": "Ada"}]
    assert payload["sender"]["email"] == "sender@example.com"
    assert "123456" in payload["textContent"]


def test_a_brevo_failure_does_not_raise(brevo, monkeypatch):
    def failing_post(url, json, headers, timeout):
        raise httpx.ConnectError("network down")

    monkeypatch.setattr(email_service.httpx, "post", failing_post)
    email_service.send_verification_email("a@example.com", "Ada", "123456")


def test_a_brevo_error_status_does_not_raise(brevo, monkeypatch):
    def rejected(url, json, headers, timeout):
        return httpx.Response(401, request=httpx.Request("POST", url))

    monkeypatch.setattr(email_service.httpx, "post", rejected)
    email_service.send_verification_email("a@example.com", "Ada", "123456")