import { describe, it, expect, vi, beforeEach } from "vitest";

import { getMe, updateMe, listUsers, getUserById } from "./user.controller.js";
import * as userService from "../services/user.service.js";

describe("user.controller", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { params: {}, body: {}, user: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe("getMe", () => {
    it("returns the caller's profile", async () => {
      const user = { id: 1, firstName: "Jane" };
      req.user.id = 1;
      vi.spyOn(userService, "getUserProfile").mockResolvedValue(user);

      await getMe(req, res, next);

      expect(userService.getUserProfile).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ data: user });
      expect(next).not.toHaveBeenCalled();
    });

    it("passes service errors to next", async () => {
      const error = new Error("boom");
      req.user.id = 1;
      vi.spyOn(userService, "getUserProfile").mockRejectedValue(error);

      await getMe(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("updateMe", () => {
    it("updates the caller's profile with the request body", async () => {
      const user = { id: 1, firstName: "Janet" };
      req.user.id = 1;
      req.body = { firstName: "Janet" };
      vi.spyOn(userService, "updateUserProfile").mockResolvedValue(user);

      await updateMe(req, res, next);

      expect(userService.updateUserProfile).toHaveBeenCalledWith(1, { firstName: "Janet" });
      expect(res.json).toHaveBeenCalledWith({ data: user });
    });

    it("passes service errors to next", async () => {
      const error = new Error("boom");
      req.user.id = 1;
      vi.spyOn(userService, "updateUserProfile").mockRejectedValue(error);

      await updateMe(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("listUsers", () => {
    it("returns every user", async () => {
      const users = [{ id: 1 }, { id: 2 }];
      vi.spyOn(userService, "listUsers").mockResolvedValue(users);

      await listUsers(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ data: users });
    });

    it("passes service errors to next", async () => {
      const error = new Error("boom");
      vi.spyOn(userService, "listUsers").mockRejectedValue(error);

      await listUsers(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getUserById", () => {
    it("returns the requested user", async () => {
      const user = { id: 2 };
      req.params.id = "2";
      vi.spyOn(userService, "getUserByIdAsAdmin").mockResolvedValue(user);

      await getUserById(req, res, next);

      expect(userService.getUserByIdAsAdmin).toHaveBeenCalledWith(2);
      expect(res.json).toHaveBeenCalledWith({ data: user });
    });

    it("passes service errors to next", async () => {
      const error = new Error("boom");
      req.params.id = "2";
      vi.spyOn(userService, "getUserByIdAsAdmin").mockRejectedValue(error);

      await getUserById(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
