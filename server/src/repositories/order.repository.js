import prisma from '../config/prismaClient.js';

export async function createOrder({ userId, addressId, items }) {
  return prisma.$transaction(async (tx) => {
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { inventory: true },
      });

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (!product.inventory || product.inventory.quantityOnHand < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }

      const unitPrice = product.price;
      subtotal += Number(unitPrice) * item.quantity;

      orderItemsData.push({
        productId: product.id,
        productTitle: product.title,
        unitPrice,
        quantity: item.quantity,
      });

      await tx.inventory.update({
        where: { productId: product.id },
        data: { quantityOnHand: { decrement: item.quantity } },
      });
    }

    const shippingFee = 0;
    const total = subtotal + shippingFee;

    const order = await tx.order.create({
      data: {
        userId,
        addressId,
        subtotal,
        shippingFee,
        total,
        items: {
          create: orderItemsData,
        },
      },
      include: { items: true },
    });

     return order;
  }, { timeout: 15000 });
}

export async function getOrdersByUser(userId) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
}

export async function getOrderById(id) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
}