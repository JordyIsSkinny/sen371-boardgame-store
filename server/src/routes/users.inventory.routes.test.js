import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import { signAccessToken } from "../services/token.service.js";

// Both controllers call straight into their service module (no repository
// loaded ahead of the controller the way payments/orders load one for
// ownership), so this file mocks at the service layer only — same
// convention as cart.routes.test.js and auth.routes.test.js.
const userService = await import("../services/user.service.js");
const inventoryService = await import("../services/inventory.service.js");

vi.mock("../services/user.service.js", () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  listUsers: vi.fn(),
  getUserByIdAsAdmin: vi.fn(),
}));

vi.mock("../services/inventory.service.js", () => ({
  getInventory: vi.fn(),
  updateInventory: vi.fn(),
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

describe("GET /api/v1/users/me", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/users/me");

    expect(res.status).toBe(401);
    expect(userService.getUserProfile).not.toHaveBeenCalled();
  });

  it("returns the caller's own profile", async () => {
    const profile = { id: 1, firstName: "Jane", lastName: "Doe", email: "jane@example.com" };
    userService.getUserProfile.mockResolvedValue(profile);

    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", authHeader(CUSTOMER));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: profile });
    expect(userService.getUserProfile).toHaveBeenCalledWith(1);
  });
});

describe("PUT /api/v1/users/me", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .put("/api/v1/users/me")
      .send({ firstName: "Jane" });

    expect(res.status).toBe(401);
    expect(userService.updateUserProfile).not.toHaveBeenCalled();
  });

  it("rejects a field outside firstName/lastName/email", async () => {
    const res = await request(app)
      .put("/api/v1/users/me")
      .set("Authorization", authHeader(CUSTOMER))
      .send({ role: "admin" });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: "VALIDATION_ERROR" });
    expect(userService.updateUserProfile).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const res = await request(app)
      .put("/api/v1/users/me")
      .set("Authorization", authHeader(CUSTOMER))
      .send({ email: "not-an-email" });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: "VALIDATION_ERROR" });
    expect(userService.updateUserProfile).not.toHaveBeenCalled();
  });

  it("updates the caller's own profile", async () => {
    const updated = { id: 1, firstName: "Janet", lastName: "Doe", email: "jane@example.com" };
    userService.updateUserProfile.mockResolvedValue(updated);

    const res = await request(app)
      .put("/api/v1/users/me")
      .set("Authorization", authHeader(CUSTOMER))
      .send({ firstName: "Janet" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: updated });
    expect(userService.updateUserProfile).toHaveBeenCalledWith(1, { firstName: "Janet" });
  });
});

describe("GET /api/v1/users", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/users");

    expect(res.status).toBe(401);
    expect(userService.listUsers).not.toHaveBeenCalled();
  });

  it("rejects a non-admin caller", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", authHeader(CUSTOMER));

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: "FORBIDDEN" });
    expect(userService.listUsers).not.toHaveBeenCalled();
  });

  it("rejects invalid pagination query params", async () => {
    const res = await request(app)
      .get("/api/v1/users?page=0&pageSize=-5")
      .set("Authorization", authHeader(ADMIN));

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: "VALIDATION_ERROR" });
    expect(userService.listUsers).not.toHaveBeenCalled();
  });

  it("lists users for an admin caller", async () => {
    userService.listUsers.mockResolvedValue({
      items: [
        { id: 1, firstName: "Jane" },
        { id: 2, firstName: "Admin" },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    });

    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", authHeader(ADMIN));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [
        { id: 1, firstName: "Jane" },
        { id: 2, firstName: "Admin" },
      ],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });
  });
});

describe("GET /api/v1/users/:id", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/users/1");

    expect(res.status).toBe(401);
    expect(userService.getUserByIdAsAdmin).not.toHaveBeenCalled();
  });

  it("rejects a non-admin caller", async () => {
    const res = await request(app)
      .get("/api/v1/users/1")
      .set("Authorization", authHeader(CUSTOMER));

    expect(res.status).toBe(403);
    expect(userService.getUserByIdAsAdmin).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric ID", async () => {
    const res = await request(app)
      .get("/api/v1/users/abc")
      .set("Authorization", authHeader(ADMIN));

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: "VALIDATION_ERROR" });
    expect(userService.getUserByIdAsAdmin).not.toHaveBeenCalled();
  });

  it("returns the requested user for an admin caller", async () => {
    const user = { id: 5, firstName: "Someone" };
    userService.getUserByIdAsAdmin.mockResolvedValue(user);

    const res = await request(app)
      .get("/api/v1/users/5")
      .set("Authorization", authHeader(ADMIN));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: user });
    expect(userService.getUserByIdAsAdmin).toHaveBeenCalledWith(5);
  });

  it("passes through a 404 for a user that does not exist", async () => {
    const NotFoundError = (await import("../errors/not-found-error.js")).default;
    userService.getUserByIdAsAdmin.mockRejectedValue(new NotFoundError("User not found."));

    const res = await request(app)
      .get("/api/v1/users/999")
      .set("Authorization", authHeader(ADMIN));

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, error: "NOT_FOUND" });
  });
});

describe("GET /api/v1/inventory/:productId", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/inventory/1");

    expect(res.status).toBe(401);
    expect(inventoryService.getInventory).not.toHaveBeenCalled();
  });

  it("rejects a non-admin caller", async () => {
    const res = await request(app)
      .get("/api/v1/inventory/1")
      .set("Authorization", authHeader(CUSTOMER));

    expect(res.status).toBe(403);
    expect(inventoryService.getInventory).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric product ID", async () => {
    const res = await request(app)
      .get("/api/v1/inventory/abc")
      .set("Authorization", authHeader(ADMIN));

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: "VALIDATION_ERROR" });
    expect(inventoryService.getInventory).not.toHaveBeenCalled();
  });

  it("returns the inventory row for an admin caller", async () => {
    const inventory = { productId: 1, quantityOnHand: 10, reorderThreshold: 3 };
    inventoryService.getInventory.mockResolvedValue(inventory);

    const res = await request(app)
      .get("/api/v1/inventory/1")
      .set("Authorization", authHeader(ADMIN));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: inventory });
    expect(inventoryService.getInventory).toHaveBeenCalledWith(1);
  });

  it("passes through a 404 when the product has no inventory row", async () => {
    const NotFoundError = (await import("../errors/not-found-error.js")).default;
    inventoryService.getInventory.mockRejectedValue(
      new NotFoundError("Inventory not found for this product."),
    );

    const res = await request(app)
      .get("/api/v1/inventory/1")
      .set("Authorization", authHeader(ADMIN));

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, error: "NOT_FOUND" });
  });
});

describe("PUT /api/v1/inventory/:productId", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .put("/api/v1/inventory/1")
      .send({ quantityOnHand: 5 });

    expect(res.status).toBe(401);
    expect(inventoryService.updateInventory).not.toHaveBeenCalled();
  });

  it("rejects a non-admin caller", async () => {
    const res = await request(app)
      .put("/api/v1/inventory/1")
      .set("Authorization", authHeader(CUSTOMER))
      .send({ quantityOnHand: 5 });

    expect(res.status).toBe(403);
    expect(inventoryService.updateInventory).not.toHaveBeenCalled();
  });

  it("rejects a negative quantityOnHand", async () => {
    const res = await request(app)
      .put("/api/v1/inventory/1")
      .set("Authorization", authHeader(ADMIN))
      .send({ quantityOnHand: -5 });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: "VALIDATION_ERROR" });
    expect(inventoryService.updateInventory).not.toHaveBeenCalled();
  });

  it("rejects a field outside quantityOnHand/reorderThreshold", async () => {
    const res = await request(app)
      .put("/api/v1/inventory/1")
      .set("Authorization", authHeader(ADMIN))
      .send({ productId: 999 });

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ error: "VALIDATION_ERROR" });
    expect(inventoryService.updateInventory).not.toHaveBeenCalled();
  });

  it("updates inventory for an admin caller", async () => {
    const updated = { productId: 1, quantityOnHand: 25, reorderThreshold: 5 };
    inventoryService.updateInventory.mockResolvedValue(updated);

    const res = await request(app)
      .put("/api/v1/inventory/1")
      .set("Authorization", authHeader(ADMIN))
      .send({ quantityOnHand: 25 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: updated });
    expect(inventoryService.updateInventory).toHaveBeenCalledWith(1, { quantityOnHand: 25 });
  });
});