import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireManager, AuthRequest } from '../middleware/auth';
import { sendVerificationEmail } from '../services/email';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

function log(tag: string, msg: string) {
  console.log(`[${new Date().toISOString()}] [${tag}] ${msg}`);
}

function generateVerifyToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/signup — public: soldier self-registration, requires manager approval
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };
  if (!name || !email || !password) {
    res.status(400).json({ error: 'נדרשים שם, אימייל וסיסמה' });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    log('SIGNUP', `Rejected — email already exists: ${email}`);
    res.status(409).json({ error: 'אימייל כבר קיים במערכת' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = generateVerifyToken();
  await prisma.user.create({
    data: { name, email, passwordHash, role: 'soldier', status: 'pending', verifyToken },
  });
  log('SIGNUP', `New soldier registered, awaiting email verification: ${email} (${name})`);
  try {
    await sendVerificationEmail(email, name, verifyToken);
    log('EMAIL', `Verification email sent to: ${email}`);
  } catch (err) {
    log('EMAIL', `Failed to send verification email to ${email}: ${err}`);
  }
  res.status(201).json({ message: 'הבקשה נשלחה. בדוק את תיבת הדואר שלך לאימות האימייל.' });
});

// GET /api/auth/verify-email?token=xxx — public: verify email address
router.get('/verify-email', async (req, res) => {
  const { token } = req.query as { token?: string };

  const html = (title: string, msg: string, ok: boolean) => `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head><meta charset="UTF-8"><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; display: flex; justify-content: center;
             align-items: center; height: 100vh; margin: 0; background: #f3f4f6; }
      .card { background: white; border-radius: 12px; padding: 2.5rem 3rem;
              text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px; }
      .icon { font-size: 3rem; }
      h2 { margin: 1rem 0 0.5rem; color: ${ok ? '#15803d' : '#dc2626'}; }
      p { color: #6b7280; font-size: 0.95rem; }
    </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${ok ? '✓' : '✗'}</div>
        <h2>${title}</h2>
        <p>${msg}</p>
      </div>
    </body>
    </html>
  `;

  if (!token) {
    log('VERIFY', 'Verification attempt with missing token');
    res.status(400).send(html('שגיאה', 'קישור לא תקין.', false));
    return;
  }
  const user = await prisma.user.findUnique({ where: { verifyToken: token } });
  if (!user) {
    log('VERIFY', 'Verification attempt with invalid or already-used token');
    res.status(400).send(html('קישור לא תקין', 'הקישור כבר נוצל או שאינו תקין.', false));
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null },
  });
  log('VERIFY', `Email verified for: ${user.email} (${user.name})`);
  res.send(html('האימייל אומת בהצלחה', 'כתובת האימייל שלך אומתה. תוכל להתחבר לאחר אישור המנהל.', true));
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: 'נדרשים אימייל וסיסמה' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    log('LOGIN', `Failed — unknown email: ${email}`);
    res.status(401).json({ error: 'פרטים שגויים' });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    log('LOGIN', `Failed — wrong password for: ${email}`);
    res.status(401).json({ error: 'פרטים שגויים' });
    return;
  }
  if (!user.emailVerified) {
    log('LOGIN', `Failed — email not verified: ${email}`);
    res.status(403).json({ error: 'יש לאמת את כתובת האימייל תחילה. בדוק את תיבת הדואר שלך.' });
    return;
  }
  if (user.status !== 'active') {
    log('LOGIN', `Failed — account pending approval: ${email}`);
    res.status(403).json({ error: 'חשבונך ממתין לאישור מנהל' });
    return;
  }
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  log('LOGIN', `Success: ${email} (${user.role})`);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: 'משתמש לא נמצא' });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

// POST /api/auth/register — manager only: create accounts (active immediately)
router.post('/register', authenticateToken, requireManager, async (req: AuthRequest, res) => {
  const { name, email, password, role } = req.body as {
    name: string;
    email: string;
    password: string;
    role?: string;
  };
  if (!name || !email || !password) {
    res.status(400).json({ error: 'נדרשים שם, אימייל וסיסמה' });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    log('REGISTER', `Rejected — email already exists: ${email}`);
    res.status(409).json({ error: 'אימייל כבר קיים במערכת' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = generateVerifyToken();
  const assignedRole = role === 'manager' ? 'manager' : 'soldier';
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: assignedRole, status: 'active', verifyToken },
  });
  log('REGISTER', `Account created by manager: ${email} (${assignedRole})`);
  try {
    await sendVerificationEmail(email, name, verifyToken);
    log('EMAIL', `Verification email sent to: ${email}`);
  } catch (err) {
    log('EMAIL', `Failed to send verification email to ${email}: ${err}`);
  }
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

export default router;
