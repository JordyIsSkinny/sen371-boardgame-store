import { prisma } from '../lib/prismaClient.js';
import NotFoundError from '../errors/not-found-error.js';
import ConflictError from '../errors/conflict-error.js';

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
        throw new NotFoundError(`Product ${item.productId} not found.`);
      }

      if (!product.inventory || product.inventory.quantityOnHand < item.quantity) {
        throw new ConflictError(
          `Insufficient stock for product ${item.productId}; only ${product.inventory?.quantityOnHand ?? 0} available.`,
        );
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

// TODO: shippingFee hardcoded to 0 for M2. S5 wireframes specify a delivery
// method selection step with a cost — wire that in for M3/M4.
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

    // Clear the cart items this order was placed from, inside the same
    // transaction as the order itself: without this, a successful
    // purchase left the same items sitting in the cart, so navigating
    // back to /cart or /checkout (browser back, a stale tab) and
    // resubmitting created a second order and decremented stock a
    // second time for goods already bought. Scoped to the ordered
    // productIds rather than the whole cart, since nothing here
    // guarantees the cart couldn't hold other items in a future
    // partial-checkout flow.
    await tx.cartItem.deleteMany({
      where: {
        userId,
        productId: { in: items.map((item) => item.productId) },
      },
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


const VALID_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

export async function getAllOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
}

export async function updateOrderStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid order status: ${status}`);
  }

  return prisma.order.update({
    where: { id },
    data: { status },
  });
}