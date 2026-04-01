import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireManager } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken, requireManager);

// GET /api/users — active soldiers with their active acquisitions
router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: 'soldier', status: 'active' },
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

// GET /api/users/pending — pending registration requests
router.get('/pending', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { status: 'pending' },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

// PATCH /api/users/:id/approve — approve a pending registration
router.patch('/:id/approve', async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await prisma.user.update({
    where: { id },
    data: { status: 'active' },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json(user);
});

// DELETE /api/users/:id — reject and remove a pending registration
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  await prisma.user.delete({ where: { id } });
  res.status(204).send();
});

export default router;
