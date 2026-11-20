"""Sends the verification email. Without SMTP settings the message is printed instead."""
import logging
import smtplib
from email.message import EmailMessage

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
    if not settings.smtp_host:
        logger.error(
            "SMTP is not configured, so the verification email to %s was not sent. "
            "Set SMTP_HOST and the other SMTP_* values in .env.",
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