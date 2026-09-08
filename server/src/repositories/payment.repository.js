import { prisma } from '../lib/prismaClient.js';
import ConflictError from '../errors/conflict-error.js';

export async function createPayment({ orderId, method }) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const existingPayment = await tx.payment.findUnique({ where: { orderId } });
    if (existingPayment) {
      throw new ConflictError(`Payment already exists for order ${orderId}`);
    }

    const payment = await tx.payment.create({
      data: {
        orderId,
        method,
        status: 'completed',
        paidAt: new Date(),
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'paid' },
    });

    return payment;
  }, { timeout: 15000 });
}

export async function getPaymentByOrderId(orderId) {
  return prisma.payment.findUnique({
    where: { orderId },
  });
}