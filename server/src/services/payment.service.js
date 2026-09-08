import * as paymentRepository from "../repositories/payment.repository.js";
import NotFoundError from "../errors/not-found-error.js";
import ConflictError from "../errors/conflict-error.js";

// Ownership on the order is enforced by requireOwnershipOrAdmin at the route
// layer (same as orders.routes.js), so `order` here is always one the caller
// is allowed to see. This service only owns the payment-specific rules:
// status transition and duplicate-payment translation. It never reads an
// amount off the request; the repository derives it from the order.
export async function pay(order, method) {
  if (order.status !== "pending") {
    throw new ConflictError(
      `Order is ${order.status}; payment can only be made for a pending order.`,
    );
  }

  try {
    return await paymentRepository.createPayment({ orderId: order.id, method });
  } catch (err) {
    if (err.message.includes("already exists")) {
      throw new ConflictError("A payment already exists for this order.");
    }
    throw err;
  }
}

export async function getPaymentForOrder(orderId) {
  const payment = await paymentRepository.getPaymentByOrderId(orderId);
  if (!payment) {
    throw new NotFoundError("Payment not found for this order.");
  }
  return payment;
}
