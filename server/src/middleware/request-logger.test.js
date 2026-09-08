import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import requestLogger from "./request-logger.js";

function mockRes() {
  const res = {
    statusCode: 200,
    on: vi.fn(),
  };

  return res;
}

describe("requestLogger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs structured request information when the response finishes", () => {
    const req = {
      method: "GET",
      originalUrl: "/api/v1/products",
    };

    const res = mockRes();
    const next = vi.fn();

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalled();

    const finishHandler = res.on.mock.calls.find(
      ([event]) => event === "finish"
    )?.[1];

    expect(finishHandler).toBeDefined();

    finishHandler();

    expect(console.log).toHaveBeenCalledTimes(1);

    const loggedData = JSON.parse(console.log.mock.calls[0][0]);

    expect(loggedData).toMatchObject({
      method: "GET",
      path: "/api/v1/products",
      status: 200,
    });

    expect(loggedData).toHaveProperty("timestamp");
    expect(loggedData).toHaveProperty("durationMs");
  });

  it("logs the response status code", () => {
    const req = {
      method: "POST",
      originalUrl: "/api/v1/orders",
    };

    const res = mockRes();
    res.statusCode = 201;

    const next = vi.fn();

    requestLogger(req, res, next);

    const finishHandler = res.on.mock.calls.find(
      ([event]) => event === "finish"
    )?.[1];

    finishHandler();

    const loggedData = JSON.parse(console.log.mock.calls[0][0]);

    expect(loggedData.status).toBe(201);
  });
});