import aiosmtplib
from email.message import EmailMessage
from app.core.config import settings

class EmailService:
    async def send_email(self, to_email: str, subject: str, body: str, from_name: str = None):
        """
        Sends an email using the configured SMTP server.
        """
        if not settings.ZOHO_SMTP_USER or not settings.ZOHO_SMTP_PASS:
            raise ValueError("SMTP credentials not configured")

        message = EmailMessage()
        from_header = f"{from_name} <{settings.ZOHO_FROM}>" if from_name else settings.ZOHO_FROM
        
        message["From"] = from_header
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(body)

        await aiosmtplib.send(
            message,
            hostname=settings.ZOHO_SMTP_HOST,
            port=settings.ZOHO_SMTP_PORT,
            username=settings.ZOHO_SMTP_USER,
            password=settings.ZOHO_SMTP_PASS,
            use_tls=True
        )
        return {"message": "Email sent successfully"}

email_service = EmailService()
