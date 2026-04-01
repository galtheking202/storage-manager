import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireManager } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, requireManager);

// GET /api/users — manager only, returns soldiers with their active acquisitions
router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: 'soldier' },
    select: {
      id: true,
      name: true,
      email: true,
      acquisitions: {
        where: { status: { not: 'completed' } },
        include: { item: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });
  res.json(users);
});

export default router;
