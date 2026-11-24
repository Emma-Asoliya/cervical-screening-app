"""Sends the verification email, through the Brevo HTTP API if a key is set, otherwise SMTP."""
import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def send_verification_email(to_address: str, full_name: str, code: str) -> None:
    link = f"{settings.frontend_url}/verify?email={to_address}&code={code}"
    body = (
        f"Hello {full_name},\n\n"
        f"Your verification code is {code}. It expires in "
        f"{settings.verification_code_minutes} minutes.\n\n"
        f"You can also confirm your email by opening this link:\n{link}\n\n"
        "If you did not create an account, you can ignore this message.\n"
    )
    if settings.brevo_api_key:
        _send_with_brevo(to_address, full_name, body)
        return
    if not settings.smtp_host:
        logger.error(
            "No email service is configured, so the verification email to %s was not sent. "
            "Set BREVO_API_KEY (or SMTP_HOST and the other SMTP_* values) in .env.",
            to_address,
        )
        return

    message = EmailMessage()
    message["Subject"] = "Confirm your email address"
    message["From"] = settings.smtp_from or settings.smtp_username
    message["To"] = to_address
    message.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException):
        # The account exists; the user can ask for a new code with "resend".
        logger.exception("Could not send the verification email")


def _send_with_brevo(to_address: str, full_name: str, body: str) -> None:
    """Send through Brevo's HTTPS API. Many hosts block SMTP ports but allow HTTPS."""
    payload = {
        "sender": {
            "name": settings.brevo_sender_name,
            "email": settings.brevo_sender_email or settings.smtp_from,
        },
        "to": [{"email": to_address, "name": full_name}],
        "subject": "Confirm your email address",
        "textContent": body,
    }
    try:
        response = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={"api-key": settings.brevo_api_key, "accept": "application/json"},
            timeout=15,
        )
        response.raise_for_status()
    except httpx.HTTPError:
        # The account exists; the user can ask for a new code with "resend".
        logger.exception("Could not send the verification email through Brevo")