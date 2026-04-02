import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import itemsRoutes from './routes/items';
import acquisitionsRoutes from './routes/acquisitions';
import usersRoutes from './routes/users';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/acquisitions', acquisitionsRoutes);
app.use('/api/users', usersRoutes);

async function seedManagerIfNeeded() {
  // Ensure all existing managers are active and email-verified after schema changes
  await prisma.user.updateMany({
    where: { role: 'manager' },
    data: { status: 'active', emailVerified: true, verifyToken: null },
  });

  const { SEED_EMAIL, SEED_PASSWORD, SEED_NAME } = process.env;
  if (!SEED_EMAIL || !SEED_PASSWORD) return;
  const existing = await prisma.user.findUnique({ where: { email: SEED_EMAIL } });
  if (existing) return;
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  await prisma.user.create({
    data: { name: SEED_NAME ?? 'מנהל', email: SEED_EMAIL, passwordHash, role: 'manager', status: 'active', emailVerified: true },
  });
  console.log(`Manager account seeded: ${SEED_EMAIL}`);
}

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedManagerIfNeeded();
});
