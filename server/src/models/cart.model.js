// Domain model / presentation layer. Distinct job from the repository
// (raw data access) and the service (business rules): this shapes what a
// cart item looks like once it leaves the system, specifically converting
// Prisma's Decimal type for price into a plain number. Decimal serialises
// to JSON as a string by default, silently breaking any client-side math
// on price if this conversion happens somewhere inconsistent instead of
// in one place.

export function toCartItemView(item) {
  return {
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    addedAt: item.addedAt,
    product: {
      id: item.product.id,
      title: item.product.title,
      slug: item.product.slug,
      price: Number(item.product.price),
    },
    lineTotal: Number(item.product.price) * item.quantity,
  };
}

export function toCartView(items) {
  const viewItems = items.map(toCartItemView);
  const subtotal = viewItems.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items: viewItems, subtotal };
}
