import { Router } from 'express';
import { getAllCategories } from '../repositories/category.repository.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const categories = await getAllCategories();
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

export default router;