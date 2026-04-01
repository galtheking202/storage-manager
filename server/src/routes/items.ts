import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireManager } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /api/items
router.get('/', async (_req, res) => {
  const items = await prisma.item.findMany({ orderBy: { name: 'asc' } });
  res.json(items);
});

// POST /api/items
router.post('/', requireManager, async (req, res) => {
  const { name, category, totalAmount, notes } = req.body as {
    name: string;
    category: string;
    totalAmount: number;
    notes?: string;
  };
  if (!name || !category || !totalAmount) {
    res.status(400).json({ error: 'נדרשים שם, קטגוריה וכמות' });
    return;
  }
  const item = await prisma.item.create({
    data: { name, category, totalAmount, available: totalAmount, notes: notes ?? '' },
  });
  res.status(201).json(item);
});

// PATCH /api/items/:id
router.patch('/:id', requireManager, async (req, res) => {
  const id = parseInt(req.params.id);
  const item = await prisma.item.update({ where: { id }, data: req.body });
  res.json(item);
});

// DELETE /api/items/:id
router.delete('/:id', requireManager, async (req, res) => {
  const id = parseInt(req.params.id);
  await prisma.item.delete({ where: { id } });
  res.status(204).send();
});

export default router;
