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
    res.status(409).json({ error: 'אימייל כבר קיים במערכת' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = generateVerifyToken();
  await prisma.user.create({
    data: { name, email, passwordHash, role: 'soldier', status: 'pending', verifyToken },
  });
  try {
    await sendVerificationEmail(email, name, verifyToken);
  } catch (err) {
    console.error('Failed to send verification email:', err);
  }
  res.status(201).json({ message: 'הבקשה נשלחה. בדוק את תיבת הדואר שלך לאימות האימייל.' });
});

// GET /api/auth/verify-email?token=xxx — public: verify email address
router.get('/verify-email', async (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) {
    res.status(400).json({ error: 'טוקן חסר' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { verifyToken: token } });
  if (!user) {
    res.status(400).json({ error: 'קישור לא תקין או שכבר נוצל' });
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null },
  });
  res.json({ message: 'האימייל אומת בהצלחה' });
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
    res.status(401).json({ error: 'פרטים שגויים' });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'פרטים שגויים' });
    return;
  }
  if (!user.emailVerified) {
    res.status(403).json({ error: 'יש לאמת את כתובת האימייל תחילה. בדוק את תיבת הדואר שלך.' });
    return;
  }
  if (user.status !== 'active') {
    res.status(403).json({ error: 'חשבונך ממתין לאישור מנהל' });
    return;
  }
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
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
    res.status(409).json({ error: 'אימייל כבר קיים במערכת' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = generateVerifyToken();
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role === 'manager' ? 'manager' : 'soldier',
      status: 'active',
      verifyToken,
    },
  });
  try {
    await sendVerificationEmail(email, name, verifyToken);
  } catch (err) {
    console.error('Failed to send verification email:', err);
  }
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

export default router;
