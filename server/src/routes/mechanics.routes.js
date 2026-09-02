import { Router } from 'express';
import { getAllMechanics } from '../repositories/mechanic.repository.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const mechanics = await getAllMechanics();
    res.json({ data: mechanics });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;