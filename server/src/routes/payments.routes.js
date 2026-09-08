import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { validate, createPaymentSchema, paymentOrderIdSchema } from "../middleware/validate.js";
import { requireOwnershipOrAdmin } from "../middleware/require-ownership.js";
import { getOrderById } from "../repositories/order.repository.js";
import * as paymentController from "../controllers/payment.controller.js";

const router = Router();

// requireOwnershipOrAdmin also covers POST: the order to pay for is named in
// the body rather than the URL, but the same 404-not-403 enumeration rule
// applies (security-addendum.md "Payments" section / section 2), so it
// reuses the same middleware orders.routes.js already established for
// GET /orders/:id.
router.post(
  "/",
  authenticate,
  validate({ body: createPaymentSchema }),
  requireOwnershipOrAdmin({
    load: (req) => getOrderById(Number(req.body.orderId)),
    resourceName: "Order",
    attachAs: "order",
  }),
  paymentController.createPayment,
);

router.get(
  "/:orderId",
  authenticate,
  validate({ params: paymentOrderIdSchema }),
  requireOwnershipOrAdmin({
    load: (req) => getOrderById(Number(req.params.orderId)),
    resourceName: "Order",
    attachAs: "order",
  }),
  paymentController.getPayment,
);

export default router;
