import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /api/acquisitions
// Manager: all non-completed acquisitions. Soldier: their own.
router.get('/', async (req: AuthRequest, res) => {
  const isManager = req.user!.role === 'manager';
  const acquisitions = await prisma.acquisition.findMany({
    where: {
      ...(isManager ? {} : { userId: req.user!.id }),
      status: { not: 'completed' },
    },
    include: { item: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(acquisitions);
});

// POST /api/acquisitions — soldier submits a request
router.post('/', async (req: AuthRequest, res) => {
  const { itemId, amount, loanType, missionName, returnDate } = req.body as {
    itemId: number;
    amount: number;
    loanType: string;
    missionName?: string;
    returnDate?: string;
  };

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.available < amount) {
    res.status(400).json({ error: 'אין מספיק מלאי זמין' });
    return;
  }

  const acquisition = await prisma.$transaction(async (tx) => {
    await tx.item.update({ where: { id: itemId }, data: { available: { decrement: amount } } });
    return tx.acquisition.create({
      data: {
        userId: req.user!.id,
        itemId,
        amount,
        loanType,
        missionName: missionName ?? null,
        returnDate: returnDate ? new Date(returnDate) : null,
        status: 'pending',
      },
      include: { item: { select: { name: true } } },
    });
  });

  res.status(201).json(acquisition);
});

// PATCH /api/acquisitions/:id — update status
router.patch('/:id', async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body as { status: string };
  const isManager = req.user!.role === 'manager';

  if (status === 'approved' && !isManager) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (status === 'return_pending' && isManager) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (status === 'completed' && !isManager) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (status === 'completed') {
    const acq = await prisma.acquisition.findUnique({ where: { id } });
    if (!acq) {
      res.status(404).json({ error: 'לא נמצא' });
      return;
    }
    const result = await prisma.$transaction(async (tx) => {
      await tx.item.update({ where: { id: acq.itemId }, data: { available: { increment: acq.amount } } });
      return tx.acquisition.update({ where: { id }, data: { status: 'completed' } });
    });
    res.json(result);
    return;
  }

  const acq = await prisma.acquisition.update({ where: { id }, data: { status } });
  res.json(acq);
});

export default router;
