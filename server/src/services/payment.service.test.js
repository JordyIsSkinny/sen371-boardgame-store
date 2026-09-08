import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/payment.repository.js", () => ({
  createPayment: vi.fn(),
  getPaymentByOrderId: vi.fn(),
}));

const paymentRepository = await import("../repositories/payment.repository.js");
const paymentService = await import("./payment.service.js");

const pendingOrder = { id: 1, userId: 5, status: "pending" };

describe("payment.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("pay", () => {
    it("rejects an order that is not pending", async () => {
      await expect(
        paymentService.pay({ ...pendingOrder, status: "paid" }, "card"),
      ).rejects.toMatchObject({ status: 409, error: "CONFLICT" });

      expect(paymentRepository.createPayment).not.toHaveBeenCalled();
    });

    it("creates the payment for a pending order, deriving orderId from the order itself", async () => {
      const payment = { id: 1, orderId: 1, method: "card", status: "completed" };
      paymentRepository.createPayment.mockResolvedValue(payment);

      const result = await paymentService.pay(pendingOrder, "card");

      expect(result).toBe(payment);
      expect(paymentRepository.createPayment).toHaveBeenCalledWith({ orderId: 1, method: "card" });
    });

    it("translates a duplicate-payment repository error into ConflictError", async () => {
      paymentRepository.createPayment.mockRejectedValue(
        new Error("Payment already exists for order 1"),
      );

      await expect(paymentService.pay(pendingOrder, "card")).rejects.toMatchObject({
        status: 409,
        error: "CONFLICT",
      });
    });

    it("rethrows unrelated repository errors unchanged", async () => {
      const unexpected = new Error("connection lost");
      paymentRepository.createPayment.mockRejectedValue(unexpected);

      await expect(paymentService.pay(pendingOrder, "card")).rejects.toBe(unexpected);
    });
  });

  describe("getPaymentForOrder", () => {
    it("returns the payment when found", async () => {
      const payment = { id: 1, orderId: 1 };
      paymentRepository.getPaymentByOrderId.mockResolvedValue(payment);

      const result = await paymentService.getPaymentForOrder(1);

      expect(result).toBe(payment);
    });

    it("throws NotFoundError when no payment exists for the order", async () => {
      paymentRepository.getPaymentByOrderId.mockResolvedValue(null);

      await expect(paymentService.getPaymentForOrder(1)).rejects.toMatchObject({
        status: 404,
        error: "NOT_FOUND",
      });
    });
  });
});
