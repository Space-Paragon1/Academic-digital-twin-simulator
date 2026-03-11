"""
Email utility — sends password-reset emails via Resend (https://resend.com).

Uses HTTPS (port 443) so it works on Railway, Render, and any cloud host that
blocks outbound SMTP ports (587 / 465).

Required environment variable (set in .env or Railway):
    RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxx

Optional:
    RESEND_FROM    = noreply@yourdomain.com   (default: onboarding@resend.dev — works
                     without a custom domain on the free plan, sends from Resend's domain)
    FRONTEND_URL   = https://academic-digital-twin-simulator.vercel.app
"""

import resend

from app.core.config import get_settings


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Send a password-reset link to *to_email* via Resend.

    Raises RuntimeError if RESEND_API_KEY is not configured.
    Raises resend.exceptions.ResendError on delivery failure.
    """
    settings = get_settings()
    if not settings.RESEND_API_KEY:
        raise RuntimeError(
            "Email is not configured. Set RESEND_API_KEY in your environment."
        )

    resend.api_key = settings.RESEND_API_KEY

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
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
              Academic<span style="color:#c7d2fe;">Twin</span>
            </span>
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
                            border-radius:10px;">
                    Reset My Password
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;">
              Or copy this link into your browser:
            </p>
            <p style="margin:0 0 28px;word-break:break-all;">
              <a href="{reset_url}" style="color:#6366f1;font-size:13px;">{reset_url}</a>
            </p>

            <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 24px;">
            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
              If you did not request a password reset, you can safely ignore this email.
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

    resend.Emails.send({
        "from": settings.RESEND_FROM,
        "to": [to_email],
        "subject": "Reset your Academic Digital Twin password",
        "html": html_body,
    })
