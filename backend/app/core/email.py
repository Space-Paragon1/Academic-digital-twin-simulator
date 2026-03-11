"""
Email utility — sends password-reset emails via Gmail SMTP (TLS on port 587).

Required environment variables (set in .env or Railway):
    SMTP_USER     = youremail@gmail.com
    SMTP_PASSWORD = 16-character Google App Password
    FRONTEND_URL  = https://academic-digital-twin-simulator.vercel.app
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Send a password-reset link to *to_email*.

    Raises RuntimeError if SMTP credentials are not configured.
    Raises smtplib.SMTPException on delivery failure.
    """
    settings = get_settings()
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise RuntimeError(
            "Email is not configured. Set SMTP_USER and SMTP_PASSWORD in your environment."
        )

    subject = "Reset your Academic Digital Twin password"

    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:32px 40px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;
                          display:flex;align-items:center;justify-content:center;font-size:20px;">🎓</div>
              <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
                Academic<span style="color:#c7d2fe;">Twin</span>
              </span>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
              Password Reset Request
            </h1>
            <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
              We received a request to reset the password for your account.
              Click the button below — this link expires in <strong>15 minutes</strong>.
            </p>

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="border-radius:10px;background:linear-gradient(135deg,#6366f1,#4f46e5);">
                  <a href="{reset_url}"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;
                            font-size:15px;font-weight:600;text-decoration:none;
                            border-radius:10px;letter-spacing:0.1px;">
                    Reset My Password
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;line-height:1.5;">
              Or copy this link into your browser:
            </p>
            <p style="margin:0 0 28px;word-break:break-all;">
              <a href="{reset_url}" style="color:#6366f1;font-size:13px;">{reset_url}</a>
            </p>

            <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;">

            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
              If you did not request a password reset, you can safely ignore this email.
              Your password will not change.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #f1f5f9;text-align:center;">
            <p style="margin:0;color:#cbd5e1;font-size:12px;">
              © 2026 Academic Digital Twin · MIT License
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    text_body = (
        f"Reset your Academic Digital Twin password\n\n"
        f"Click the link below (expires in 15 minutes):\n{reset_url}\n\n"
        f"If you did not request this, ignore this email."
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Academic Digital Twin <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
