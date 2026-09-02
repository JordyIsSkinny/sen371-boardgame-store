import * as cartService from "../services/cart.service.js";

// Controller: parses the request, calls the service, shapes the response.
// No business logic, no direct Prisma access, that's what makes it easy
// for the other three members to copy this file's structure for their
// own endpoints without also copying cart-specific rules.
//
// Response shape: bare, resource-named object (e.g. { cart: {...} }),
// matching D's published auth contracts ({ user: {...}, accessToken })
// rather than a generic { data: ... } envelope.

export async function getCart(req, res, next) {
  try {
    const cart = await cartService.getCart(req.user.id);
    res.json({ cart });
  } catch (err) {
    next(err);
  }
}

export async function addItem(req, res, next) {
  try {
    const { productId, quantity } = req.body;
    const item = await cartService.addItem(req.user.id, { productId, quantity });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
}

export async function updateItem(req, res, next) {
  try {
    const itemId = Number(req.params.id);
    const { quantity } = req.body;
    const item = await cartService.updateItemQuantity(req.user.id, itemId, quantity);
    res.json({ item });
  } catch (err) {
    next(err);
  }
}

export async function removeItem(req, res, next) {
  try {
    const itemId = Number(req.params.id);
    await cartService.removeItem(req.user.id, itemId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
