import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireOwnershipOrAdmin } from '../middleware/require-ownership.js';
import { validate, createPaymentSchema, orderIdParamSchema } from '../middleware/validate.js';
import { createPayment, getPaymentByOrderId, } from '../repositories/payment.repository.js';
import { getOrderById } from '../repositories/order.repository.js';

const router = Router();

router.post(
  '/',
  authenticate,
  validate({ body: createPaymentSchema }),
  requireOwnershipOrAdmin({
    load: (req) => getOrderById(Number(req.body.orderId)),
    resourceName: 'Order',
    attachAs: 'order',
  }),
  async (req, res, next) => {
    try {
      const { method } = req.body;
      const payment = await createPayment({ orderId: req.order.id, method });
      res.status(201).json({ data: payment });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:orderId',
  authenticate,
  validate({ params: orderIdParamSchema }),
  requireOwnershipOrAdmin({
    load: (req) => getOrderById(Number(req.params.orderId)),
    resourceName: 'Order',
    attachAs: 'order',
  }),
  async (req, res, next) => {
    try {
      const payment = await getPaymentByOrderId(req.order.id);
      if (!payment) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Payment not found for this order' });
      }
      res.json({ data: payment });
    } catch (err) {
      next(err);
    }
  }
);

export default router;