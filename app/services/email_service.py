"""
Simple SMTP email service for sending invitations and notifications.

Environment variables:
  SMTP_HOST     - SMTP server (e.g. smtp.yandex.ru)
  SMTP_PORT     - port (587 for TLS)
  SMTP_USER     - email login
  SMTP_PASSWORD  - email password
  SMTP_FROM     - sender address (e.g. noreply@myopora.ru)
  APP_URL       - base URL of the app (e.g. https://myopora.ru)
"""

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.config import Settings as settings

logger = logging.getLogger(__name__)


def _is_smtp_configured() -> bool:
    """Check if SMTP settings are present."""
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


async def _send_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """
    Low-level helper: build a MIME message and send it via aiosmtplib.
    Returns True on success, False on failure (never raises).
    """
    if not _is_smtp_configured():
        logger.warning(
            "SMTP is not configured (SMTP_HOST is empty). Skipping email to %s", to_email
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject

    # Plain text fallback first, then HTML (preferred by mail clients)
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=False,
            start_tls=True,
        )
        logger.info("Email sent successfully to %s (subject: %s)", to_email, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return False


# ---------------------------------------------------------------------------
# HTML templates
# ---------------------------------------------------------------------------

_BASE_STYLE = """
body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
.container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
.header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 40px; text-align: center; }
.header h1 { margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 2px; }
.header .subtitle { color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 4px; letter-spacing: 1px; }
.body { padding: 40px; }
.body h2 { color: #1e293b; font-size: 22px; margin: 0 0 16px; }
.body p { color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
.btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 24px 0; }
.btn:hover { background: #1d4ed8; }
.link-fallback { color: #64748b; font-size: 13px; word-break: break-all; }
.footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
.footer p { color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.6; }
""".strip()


def _wrap_html(inner_html: str) -> str:
    return f"""\
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>{_BASE_STYLE}</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>OPORA</h1>
    <div class="subtitle">ПЛАТФОРМА ДЛЯ БИЗНЕСА</div>
  </div>
  {inner_html}
  <div class="footer">
    <p>Это письмо отправлено автоматически. Не отвечайте на него.</p>
    <p>&copy; ОПОРА &mdash; myopora.ru</p>
  </div>
</div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def send_invitation_email(
    to_email: str,
    invite_token: str,
    org_name: str,
    inviter_name: str,
) -> bool:
    """
    Send an HTML invitation email.
    Returns True on success, False on failure (never crashes the caller).
    """
    app_url = settings.APP_URL.rstrip("/")
    invite_url = f"{app_url}/invite/{invite_token}"

    subject = f"Приглашение в {org_name} \u2014 ОПОРА"

    inner_html = f"""\
  <div class="body">
    <h2>Вас пригласили в {org_name}</h2>
    <p>
      <strong>{inviter_name}</strong> приглашает вас присоединиться
      к организации <strong>{org_name}</strong> в ОПОРА.
    </p>
    <p>
      Нажмите на кнопку ниже, чтобы принять приглашение и создать аккаунт.
    </p>
    <p style="text-align:center;">
      <a class="btn" href="{invite_url}">Принять приглашение</a>
    </p>
    <p class="link-fallback">
      Если кнопка не работает, скопируйте ссылку:<br>
      <a href="{invite_url}">{invite_url}</a>
    </p>
    <p style="color:#94a3b8; font-size:13px;">
      Приглашение действительно в течение 7 дней.
    </p>
  </div>"""

    html_body = _wrap_html(inner_html)

    text_body = (
        f"{inviter_name} приглашает вас в организацию {org_name} в ОПОРА.\n\n"
        f"Перейдите по ссылке, чтобы принять приглашение:\n{invite_url}\n\n"
        f"Приглашение действительно в течение 7 дней.\n\n"
        f"---\nЭто письмо отправлено автоматически. Не отвечайте на него."
    )

    return await _send_email(to_email, subject, html_body, text_body)


async def send_welcome_email(to_email: str, org_name: str) -> bool:
    """
    Send a welcome email after successful registration.
    Returns True on success, False on failure (never crashes the caller).
    """
    app_url = settings.APP_URL.rstrip("/")
    login_url = f"{app_url}/login"

    subject = "Добро пожаловать в ОПОРА"

    inner_html = f"""\
  <div class="body">
    <h2>Добро пожаловать!</h2>
    <p>
      Вы успешно зарегистрировали организацию <strong>{org_name}</strong> в ОПОРА.
    </p>
    <p>
      Теперь вы можете войти в систему и начать работу: управлять клиентами,
      визитами, сотрудниками и аналитикой &mdash; всё в одном месте.
    </p>
    <p style="text-align:center;">
      <a class="btn" href="{login_url}">Войти в ОПОРА</a>
    </p>
    <p class="link-fallback">
      Если кнопка не работает, скопируйте ссылку:<br>
      <a href="{login_url}">{login_url}</a>
    </p>
  </div>"""

    html_body = _wrap_html(inner_html)

    text_body = (
        f"Добро пожаловать в ОПОРА!\n\n"
        f"Вы успешно зарегистрировали организацию {org_name}.\n\n"
        f"Войдите в систему: {login_url}\n\n"
        f"---\nЭто письмо отправлено автоматически. Не отвечайте на него."
    )

    return await _send_email(to_email, subject, html_body, text_body)
