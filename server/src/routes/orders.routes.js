import { Router } from 'express';
import { createOrder, getOrdersByUser, getOrderById } from '../repositories/order.repository.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { userId, addressId, items } = req.body;
    const order = await createOrder({ userId, addressId, items });
    res.status(201).json({ data: order });
  } catch (err) {
    res.status(400).json({ error: { code: 'ORDER_FAILED', message: err.message } });
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    const orders = await getOrdersByUser(userId);
    res.json({ data: orders });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await getOrderById(Number(req.params.id));
    if (!order) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }
    res.json({ data: order });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

export default router;