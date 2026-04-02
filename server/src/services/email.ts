import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'onboarding@resend.dev';

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const link = `${FRONTEND_URL}?verifyToken=${token}`;
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'אמת את כתובת האימייל שלך — מחסן ציוד',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e3a5f;">שלום ${name},</h2>
        <p>לחץ על הכפתור כדי לאמת את כתובת האימייל שלך ולהשלים את ההרשמה למחסן הציוד.</p>
        <a href="${link}"
           style="display: inline-block; margin-top: 12px; padding: 12px 28px;
                  background: #1e40af; color: white; text-decoration: none;
                  border-radius: 6px; font-size: 1rem;">
          אמת אימייל
        </a>
        <p style="color: #6b7280; font-size: 0.85rem; margin-top: 20px;">
          אם לא נרשמת למחסן הציוד, ניתן להתעלם מהודעה זו.
        </p>
      </div>
    `,
  });
}
