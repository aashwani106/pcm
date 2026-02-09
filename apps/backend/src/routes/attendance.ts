import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireStudent } from '../middleware/role';

const router = Router();

router.post(
  '/mark',
  requireAuth,
  requireStudent,
  async (req, res) => {
    res.json({ ok: true });
  }
);

export default router;
