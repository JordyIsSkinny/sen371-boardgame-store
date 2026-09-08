import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { validate, createPaymentSchema, orderIdParamSchema } from '../middleware/validate.js';
import { createPayment, getPaymentByOrderId } from '../repositories/payment.repository.js';
import { getOrderById } from '../repositories/order.repository.js';
import ForbiddenError from '../errors/forbidden-error.js';

const router = Router();

router.post('/', authenticate, validate({ body: createPaymentSchema }), async (req, res, next) => {
  try {
    const { orderId, method } = req.body;

    const order = await getOrderById(Number(orderId));
    if (!order) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }
    if (order.userId !== req.user.id) {
      return next(new ForbiddenError('You do not have access to this order.'));
    }

    const payment = await createPayment({ orderId: Number(orderId), method });
    res.status(201).json({ data: payment });
  } catch (err) {
    next(err);
  }
});

router.get('/:orderId', authenticate, validate({ params: orderIdParamSchema }), async (req, res, next) => {
  try {
    const order = await getOrderById(Number(req.params.orderId));
    if (!order) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }
    if (order.userId !== req.user.id) {
      return next(new ForbiddenError('You do not have access to this order.'));
    }

    const payment = await getPaymentByOrderId(Number(req.params.orderId));
    if (!payment) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Payment not found for this order' });
    }
    res.json({ data: payment });
  } catch (err) {
    next(err);
  }
});

export default router;