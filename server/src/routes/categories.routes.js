import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate, createCategorySchema } from '../middleware/validate.js';
import { getAllCategories, createCategory } from '../repositories/category.repository.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const categories = await getAllCategories();
    res.json({ data: categories });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('admin'), validate({ body: createCategorySchema }), async (req, res, next) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ data: category });
  } catch (err) {
    next(err);
  }
});

export default router;