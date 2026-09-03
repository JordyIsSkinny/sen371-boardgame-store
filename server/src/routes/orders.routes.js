import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.stub.js';
import ForbiddenError from '../errors/forbidden-error.js';
import { createOrder, getOrdersByUser, getOrderById } from '../repositories/order.repository.js';

const router = Router();

router.post('/', authenticate, async (req, res, next) => {
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

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await getOrderById(Number(req.params.id));
    if (!order) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }
    if (order.userId !== req.user.id) {
      return next(new ForbiddenError('You do not have access to this order.'));
    }
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
});

export default router;