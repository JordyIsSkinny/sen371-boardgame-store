import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { signAccessToken } from "../services/token.service.js";

const productRepository = await import("../repositories/product.repository.js");
const orderRepository = await import("../repositories/order.repository.js");

vi.mock("../repositories/product.repository.js", () => ({
  getAllProducts: vi.fn(),
  getProductById: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  filterProducts: vi.fn(),
}));

vi.mock("../repositories/order.repository.js", () => ({
  createOrder: vi.fn(),
  getOrdersByUser: vi.fn(),
  getOrderById: vi.fn(),
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

describe("Product routes", () => {
  it("GET /api/v1/products uses the list-products handler", async () => {
    productRepository.getAllProducts.mockResolvedValue([
      { id: 1, title: "Catan" },
      { id: 2, title: "Ticket to Ride" },
    ]);

    const res = await request(app).get("/api/v1/products");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [
        { id: 1, title: "Catan" },
        { id: 2, title: "Ticket to Ride" },
      ],
    });
    expect(productRepository.getAllProducts).toHaveBeenCalledTimes(1);
    expect(productRepository.getProductById).not.toHaveBeenCalled();
  });

  it("GET /api/v1/products/:id uses the single-product handler", async () => {
    productRepository.getProductById.mockResolvedValue({
      id: 5,
      title: "Catan",
    });

    const res = await request(app).get("/api/v1/products/5");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        id: 5,
        title: "Catan",
      },
    });
    expect(productRepository.getProductById).toHaveBeenCalledWith(5);
    expect(productRepository.getAllProducts).not.toHaveBeenCalled();
  });

  it("GET /api/v1/products/:id rejects an invalid product ID", async () => {
    const res = await request(app).get("/api/v1/products/abc");

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      error: "VALIDATION_ERROR",
      message: "Request validation failed.",
    });
    expect(productRepository.getProductById).not.toHaveBeenCalled();
  });

  it("GET /api/v1/products validates query parameters", async () => {
    const res = await request(app).get(
      "/api/v1/products?page=0&pageSize=-5",
    );

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      error: "VALIDATION_ERROR",
      message: "Request validation failed.",
    });
    expect(productRepository.getAllProducts).not.toHaveBeenCalled();
    expect(productRepository.filterProducts).not.toHaveBeenCalled();
  });
});

describe("Order routes", () => {
  it("GET /api/v1/orders uses the list-orders handler", async () => {
    orderRepository.getOrdersByUser.mockResolvedValue([
      { id: 10, userId: 1 },
      { id: 11, userId: 1 },
    ]);

    const res = await request(app)
      .get("/api/v1/orders")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [
        { id: 10, userId: 1 },
        { id: 11, userId: 1 },
      ],
    });
    expect(orderRepository.getOrdersByUser).toHaveBeenCalledWith(1);
    expect(orderRepository.getOrderById).not.toHaveBeenCalled();
  });

  it("GET /api/v1/orders/:id uses the single-order handler", async () => {
    orderRepository.getOrderById.mockResolvedValue({
      id: 10,
      userId: 1,
    });

    const res = await request(app)
      .get("/api/v1/orders/10")
      .set("Authorization", authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        id: 10,
        userId: 1,
      },
    });
    expect(orderRepository.getOrderById).toHaveBeenCalledWith(10);
    expect(orderRepository.getOrdersByUser).not.toHaveBeenCalled();
  });

  it("GET /api/v1/orders/:id rejects an invalid order ID", async () => {
    const res = await request(app)
      .get("/api/v1/orders/abc")
      .set("Authorization", authHeader());

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      error: "VALIDATION_ERROR",
      message: "Request validation failed.",
    });
    expect(orderRepository.getOrderById).not.toHaveBeenCalled();
  });

  it("GET /api/v1/orders/:id rejects access to another user's order", async () => {
    orderRepository.getOrderById.mockResolvedValue({
      id: 10,
      userId: 999,
    });

    const res = await request(app)
      .get("/api/v1/orders/10")
      .set("Authorization", authHeader());

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      error: "FORBIDDEN",
    });
  });
});