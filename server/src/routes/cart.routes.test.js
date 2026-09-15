import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { signAccessToken } from "../services/token.service.js";

const cartService = await import("../services/cart.service.js");

vi.mock("../services/cart.service.js", () => ({
  getCart: vi.fn(),
  addItem: vi.fn(),
  updateItemQuantity: vi.fn(),
  removeItem: vi.fn(),
}));

let app;

const USER = {
  id: 1,
  role: "customer",
  email: "jane@example.com",
};

const authHeader = () => `Bearer ${signAccessToken(USER)}`;

beforeAll(async () => {
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  process.env.JWT_SECRET ??= "test-access-secret";
  process.env.REFRESH_TOKEN_SECRET ??= "test-refresh-secret";
  process.env.CLIENT_ORIGIN ??= "http://localhost:5173";

  const { createApp } = await import("../app.js");
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Cart routes", () => {
  it("GET /api/v1/cart requires authentication", async () => {
    const res = await request(app).get("/api/v1/cart");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/cart returns the caller's cart", async () => {
    cartService.getCart.mockResolvedValue({
      items: [{ id: 1, productId: 5, quantity: 2, lineTotal: 100 }],
      subtotal: 100,
    });

    const res = await request(app)
      .get("/api/v1/cart")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        items: [{ id: 1, productId: 5, quantity: 2, lineTotal: 100 }],
        subtotal: 100,
      },
    });
    expect(cartService.getCart).toHaveBeenCalledWith(1);
  });

  it("POST /api/v1/cart/items adds an item and returns 201", async () => {
    cartService.addItem.mockResolvedValue({
      id: 1,
      productId: 5,
      quantity: 2,
    });

    const res = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", authHeader())
      .send({ productId: 5, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      data: { id: 1, productId: 5, quantity: 2 },
    });
    expect(cartService.addItem).toHaveBeenCalledWith(1, { productId: 5, quantity: 2 });
  });

  it("POST /api/v1/cart/items rejects a non-positive quantity", async () => {
    const res = await request(app)
      .post("/api/v1/cart/items")
      .set("Authorization", authHeader())
      .send({ productId: 5, quantity: 0 });

    expect(res.status).toBe(422);
    expect(cartService.addItem).not.toHaveBeenCalled();
  });

  it("PATCH /api/v1/cart/items/:id updates the item quantity", async () => {
    cartService.updateItemQuantity.mockResolvedValue({
      id: 1,
      productId: 5,
      quantity: 4,
    });

    const res = await request(app)
      .patch("/api/v1/cart/items/1")
      .set("Authorization", authHeader())
      .send({ quantity: 4 });

    expect(res.status).toBe(200);
    expect(cartService.updateItemQuantity).toHaveBeenCalledWith(1, 1, 4);
  });

  it("DELETE /api/v1/cart/items/:id removes the item and returns 204", async () => {
    cartService.removeItem.mockResolvedValue(undefined);

    const res = await request(app)
      .delete("/api/v1/cart/items/1")
      .set("Authorization", authHeader());

    expect(res.status).toBe(204);
    expect(cartService.removeItem).toHaveBeenCalledWith(1, 1);
  });

  it("DELETE /api/v1/cart/items/:id rejects an invalid item ID", async () => {
    const res = await request(app)
      .delete("/api/v1/cart/items/abc")
      .set("Authorization", authHeader());

    expect(res.status).toBe(422);
    expect(cartService.removeItem).not.toHaveBeenCalled();
  });
});