import * as paymentService from "../services/payment.service.js";

// req.order is attached by requireOwnershipOrAdmin at the route layer for
// both handlers below, so ownership is already settled by the time we get here.

export async function createPayment(req, res, next) {
  try {
    const { method } = req.body;
    const payment = await paymentService.pay(req.order, method);
    res.status(201).json({ data: payment });
  } catch (err) {
    next(err);
  }
}

export async function getPayment(req, res, next) {
  try {
    const payment = await paymentService.getPaymentForOrder(req.order.id);
    res.json({ data: payment });
  } catch (err) {
    next(err);
  }
}
