import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { signAccessToken } from "../services/token.service.js";

// payments.routes.js loads the order for ownership checks by calling
// getOrderById straight from the repository (same pattern as orders.routes.js
// in products.orders.routes.test.js), while the controller itself calls
// through payment.service.js. Both layers need mocking for this file.
const orderRepository = await import("../repositories/order.repository.js");
const paymentService = await import("../services/payment.service.js");

vi.mock("../repositories/order.repository.js", () => ({
  createOrder: vi.fn(),
  getOrdersByUser: vi.fn(),
  getOrderById: vi.fn(),
  getAllOrders: vi.fn(),
}));

vi.mock("../services/payment.service.js", () => ({
  pay: vi.fn(),
  getPaymentForOrder: vi.fn(),
}));

let app;

const CUSTOMER = {
  id: 1,
  role: "customer",
  email: "jane@example.com",
};

const ADMIN = {
  id: 2,
  role: "admin",
  email: "admin@example.com",
};

const authHeader = (user) => `Bearer ${signAccessToken(user)}`;

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

describe("POST /api/v1/payments", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post("/api/v1/payments")
      .send({ orderId: 1, method: "card" });

    expect(res.status).toBe(401);
    expect(orderRepository.getOrderById).not.toHaveBeenCalled();
    expect(paymentService.pay).not.toHaveBeenCalled();
  });

  it("rejects a body missing orderId or method", async () => {
    const res = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", authHeader(CUSTOMER))
      .send({});

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: "VALIDATION_ERROR" });
    expect(orderRepository.getOrderById).not.toHaveBeenCalled();
    expect(paymentService.pay).not.toHaveBeenCalled();
  });

  it("rejects a payment method outside card/eft", async () => {
    const res = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", authHeader(CUSTOMER))
      .send({ orderId: 1, method: "bitcoin" });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: "VALIDATION_ERROR" });
    expect(paymentService.pay).not.toHaveBeenCalled();
  });

  it("returns 404 for an order that does not exist", async () => {
    orderRepository.getOrderById.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", authHeader(CUSTOMER))
      .send({ orderId: 999, method: "card" });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, error: "NOT_FOUND" });
    expect(paymentService.pay).not.toHaveBeenCalled();
  });

  it("hides another user's order behind a 404 rather than paying for it", async () => {
    orderRepository.getOrderById.mockResolvedValue({
      id: 1,
      userId: 999,
      status: "pending",
    });

    const res = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", authHeader(CUSTOMER))
      .send({ orderId: 1, method: "card" });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, error: "NOT_FOUND" });
    expect(paymentService.pay).not.toHaveBeenCalled();
  });

  it("creates a payment for the caller's own pending order", async () => {
    const order = { id: 1, userId: CUSTOMER.id, status: "pending", total: 450 };
    const payment = { id: 10, orderId: 1, method: "card", status: "completed" };

    orderRepository.getOrderById.mockResolvedValue(order);
    paymentService.pay.mockResolvedValue(payment);

    const res = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", authHeader(CUSTOMER))
      .send({ orderId: 1, method: "card" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: payment });
    expect(orderRepository.getOrderById).toHaveBeenCalledWith(1);
    expect(paymentService.pay).toHaveBeenCalledWith(order, "card");
  });

  it("allows an admin to pay for another user's order", async () => {
    const order = { id: 1, userId: 999, status: "pending", total: 450 };
    const payment = { id: 10, orderId: 1, method: "eft", status: "completed" };

    orderRepository.getOrderById.mockResolvedValue(order);
    paymentService.pay.mockResolvedValue(payment);

    const res = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", authHeader(ADMIN))
      .send({ orderId: 1, method: "eft" });

    expect(res.status).toBe(201);
    expect(paymentService.pay).toHaveBeenCalledWith(order, "eft");
  });

  // The named business rule (M5 work division doc): payment amount comes
  // from the order, never the request. There is nowhere in the schema for a
  // client-supplied amount to land — createPaymentSchema only validates
  // orderId and method, and the controller destructures just `method` off
  // the body — but an attacker doesn't know that, so this pins down that an
  // injected amount is silently dropped rather than trusted.
  it("ignores a client-supplied amount and takes it from the order instead", async () => {
    const order = { id: 1, userId: CUSTOMER.id, status: "pending", total: 450 };
    const payment = { id: 10, orderId: 1, method: "card", status: "completed" };

    orderRepository.getOrderById.mockResolvedValue(order);
    paymentService.pay.mockResolvedValue(payment);

    const res = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", authHeader(CUSTOMER))
      .send({ orderId: 1, method: "card", amount: 1 });

    expect(res.status).toBe(201);
    // Only ever the loaded order and the method reach the service — the
    // attacker's amount field never makes it past the controller.
    expect(paymentService.pay).toHaveBeenCalledWith(order, "card");
    expect(paymentService.pay).toHaveBeenCalledTimes(1);
    expect(paymentService.pay.mock.calls[0]).toHaveLength(2);
    expect(res.body).toEqual({ data: payment });
  });

  it("passes through a 409 when the order is not pending", async () => {
    const order = { id: 1, userId: CUSTOMER.id, status: "paid" };

    orderRepository.getOrderById.mockResolvedValue(order);
    const ConflictError = (await import("../errors/conflict-error.js")).default;
    paymentService.pay.mockRejectedValue(
      new ConflictError("Order is paid; payment can only be made for a pending order."),
    );

    const res = await request(app)
      .post("/api/v1/payments")
      .set("Authorization", authHeader(CUSTOMER))
      .send({ orderId: 1, method: "card" });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ status: 409, error: "CONFLICT" });
  });
});

describe("GET /api/v1/payments/:orderId", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/payments/1");

    expect(res.status).toBe(401);
    expect(paymentService.getPaymentForOrder).not.toHaveBeenCalled();
  });

  it("rejects an invalid order ID", async () => {
    const res = await request(app)
      .get("/api/v1/payments/abc")
      .set("Authorization", authHeader(CUSTOMER));

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: "VALIDATION_ERROR" });
    expect(orderRepository.getOrderById).not.toHaveBeenCalled();
  });

  it("hides another user's payment behind a 404", async () => {
    orderRepository.getOrderById.mockResolvedValue({ id: 1, userId: 999 });

    const res = await request(app)
      .get("/api/v1/payments/1")
      .set("Authorization", authHeader(CUSTOMER));

    expect(res.status).toBe(404);
    expect(paymentService.getPaymentForOrder).not.toHaveBeenCalled();
  });

  it("returns the payment for the caller's own order", async () => {
    const payment = { id: 10, orderId: 1, method: "card", status: "completed" };

    orderRepository.getOrderById.mockResolvedValue({ id: 1, userId: CUSTOMER.id });
    paymentService.getPaymentForOrder.mockResolvedValue(payment);

    const res = await request(app)
      .get("/api/v1/payments/1")
      .set("Authorization", authHeader(CUSTOMER));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: payment });
    expect(paymentService.getPaymentForOrder).toHaveBeenCalledWith(1);
  });

  it("allows an admin to view another user's payment", async () => {
    const payment = { id: 10, orderId: 1, method: "card", status: "completed" };

    orderRepository.getOrderById.mockResolvedValue({ id: 1, userId: 999 });
    paymentService.getPaymentForOrder.mockResolvedValue(payment);

    const res = await request(app)
      .get("/api/v1/payments/1")
      .set("Authorization", authHeader(ADMIN));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: payment });
  });

  it("passes through a 404 when no payment exists yet for the order", async () => {
    orderRepository.getOrderById.mockResolvedValue({ id: 1, userId: CUSTOMER.id });
    const NotFoundError = (await import("../errors/not-found-error.js")).default;
    paymentService.getPaymentForOrder.mockRejectedValue(
      new NotFoundError("Payment not found for this order."),
    );

    const res = await request(app)
      .get("/api/v1/payments/1")
      .set("Authorization", authHeader(CUSTOMER));

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, error: "NOT_FOUND" });
  });
});