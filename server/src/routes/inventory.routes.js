import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate, productIdParamSchema, updateInventorySchema } from '../middleware/validate.js';
import { getInventoryByProductId, updateInventory } from '../repositories/inventory.repository.js';

const router = Router();

router.get(
  '/:productId',
  authenticate,
  authorize('admin'),
  validate({ params: productIdParamSchema }),
  async (req, res, next) => {
    try {
      const inventory = await getInventoryByProductId(Number(req.params.productId));
      if (!inventory) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Inventory not found for this product' });
      }
      res.json({ data: inventory });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/:productId',
  authenticate,
  authorize('admin'),
  validate({ params: productIdParamSchema, body: updateInventorySchema }),
  async (req, res, next) => {
    try {
      const inventory = await updateInventory(Number(req.params.productId), req.body);
      res.json({ data: inventory });
    } catch (err) {
      next(err);
    }
  }
);

export default router;