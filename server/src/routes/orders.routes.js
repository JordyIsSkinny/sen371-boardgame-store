import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  validate,
  createOrderSchema,
  orderIdSchema,
} from '../middleware/validate.js';
import { requireOwnershipOrAdmin } from '../middleware/require-ownership.js';
import { createOrder, getOrdersByUser, getOrderById } from '../repositories/order.repository.js';

const router = Router();

router.post('/', authenticate, validate({ body: createOrderSchema }), async (req, res, next) => {
  try {
    const { addressId, items } = req.body;
    const order = await createOrder({ userId: req.user.id, addressId, items });
    res.status(201).json({ data: order });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const orders = await getOrdersByUser(req.user.id);
    res.json({ data: orders });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/:id',
  authenticate,
  validate({ params: orderIdSchema }),
  requireOwnershipOrAdmin({
    load: (req) => getOrderById(Number(req.params.id)),
    resourceName: 'Order',
    attachAs: 'order',
  }),
  (req, res, next) => {
    try {
      res.json({ data: req.order });
    } catch (err) {
      next(err);
    }
  }
);

export default router;