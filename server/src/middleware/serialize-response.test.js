import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { serializeResponse } from "./serialize-response.js";

function createMockRes() {
  const res = {};
  res.jsonCalls = [];
  res.json = (body) => {
    res.jsonCalls.push(body);
    return res;
  };
  return res;
}

describe("serializeResponse middleware", () => {
  it("converts a top-level Decimal to a number before sending", () => {
    const res = createMockRes();
    serializeResponse({}, res, () => {});

    res.json({ price: new Prisma.Decimal("19.99") });

    expect(res.jsonCalls[0]).toEqual({ price: 19.99 });
  });

  it("converts Decimal fields inside a nested data envelope", () => {
    const res = createMockRes();
    serializeResponse({}, res, () => {});

    res.json({ data: { id: 1, price: new Prisma.Decimal("599.99") } });

    expect(res.jsonCalls[0]).toEqual({ data: { id: 1, price: 599.99 } });
  });

  it("converts Decimal fields inside arrays", () => {
    const res = createMockRes();
    serializeResponse({}, res, () => {});

    res.json({
      data: [
        { id: 1, price: new Prisma.Decimal("5.00") },
        { id: 2, price: new Prisma.Decimal("7.50") },
      ],
    });

    expect(res.jsonCalls[0]).toEqual({
      data: [
        { id: 1, price: 5 },
        { id: 2, price: 7.5 },
      ],
    });
  });

  it("leaves Date instances untouched", () => {
    const res = createMockRes();
    const date = new Date("2026-01-01T00:00:00.000Z");
    serializeResponse({}, res, () => {});

    res.json({ createdAt: date });

    expect(res.jsonCalls[0].createdAt).toBe(date);
  });

  it("calls next()", () => {
    const res = createMockRes();
    let nextCalled = false;

    serializeResponse({}, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });
});