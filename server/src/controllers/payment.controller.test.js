import { describe, it, expect, vi, beforeEach } from "vitest";

import { createPayment, getPayment } from "./payment.controller.js";
import * as paymentService from "../services/payment.service.js";

describe("payment.controller", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { params: {}, body: {}, user: {}, order: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe("createPayment", () => {
    it("pays for the order attached by requireOwnershipOrAdmin", async () => {
      const payment = { id: 1, orderId: 1, method: "card" };
      req.order = { id: 1, status: "pending" };
      req.body = { orderId: 1, method: "card" };
      vi.spyOn(paymentService, "pay").mockResolvedValue(payment);

      await createPayment(req, res, next);

      expect(paymentService.pay).toHaveBeenCalledWith(req.order, "card");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: payment });
      expect(next).not.toHaveBeenCalled();
    });

    it("passes service errors to next", async () => {
      const error = new Error("boom");
      req.order = { id: 1, status: "pending" };
      req.body = { method: "card" };
      vi.spyOn(paymentService, "pay").mockRejectedValue(error);

      await createPayment(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getPayment", () => {
    it("returns the payment for the order attached by requireOwnershipOrAdmin", async () => {
      const payment = { id: 1, orderId: 1 };
      req.order = { id: 1 };
      vi.spyOn(paymentService, "getPaymentForOrder").mockResolvedValue(payment);

      await getPayment(req, res, next);

      expect(paymentService.getPaymentForOrder).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ data: payment });
    });

    it("passes service errors to next", async () => {
      const error = new Error("boom");
      req.order = { id: 1 };
      vi.spyOn(paymentService, "getPaymentForOrder").mockRejectedValue(error);

      await getPayment(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
