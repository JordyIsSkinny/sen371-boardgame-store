import { Router } from 'express';
import { getAllCategories } from '../repositories/category.repository.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.json({ data: categories });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;