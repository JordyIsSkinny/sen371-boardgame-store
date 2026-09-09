import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/user-profile.repository.js", () => ({
  getUserById: vi.fn(),
  getAllUsers: vi.fn(),
  updateUser: vi.fn(),
}));

const userProfileRepository = await import("../repositories/user-profile.repository.js");
const userService = await import("./user.service.js");

const mockUser = { id: 1, roleId: 2, email: "jane@example.com", firstName: "Jane", lastName: "Smith" };

describe("user.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserProfile", () => {
    it("returns the user when found", async () => {
      userProfileRepository.getUserById.mockResolvedValue(mockUser);

      const user = await userService.getUserProfile(1);

      expect(user).toBe(mockUser);
      expect(userProfileRepository.getUserById).toHaveBeenCalledWith(1);
    });

    it("throws NotFoundError when the user does not exist", async () => {
      userProfileRepository.getUserById.mockResolvedValue(null);

      await expect(userService.getUserProfile(999)).rejects.toMatchObject({
        status: 404,
        error: "NOT_FOUND",
      });
    });
  });

  describe("updateUserProfile", () => {
    it("delegates to the repository with the caller's id and data", async () => {
      userProfileRepository.updateUser.mockResolvedValue(mockUser);

      const user = await userService.updateUserProfile(1, { firstName: "Janet" });

      expect(user).toBe(mockUser);
      expect(userProfileRepository.updateUser).toHaveBeenCalledWith(1, { firstName: "Janet" });
    });
  });

  describe("listUsers", () => {
    it("returns every user from the repository", async () => {
      userProfileRepository.getAllUsers.mockResolvedValue([mockUser]);

      const users = await userService.listUsers();

      expect(users).toEqual([mockUser]);
    });
  });

  describe("getUserByIdAsAdmin", () => {
    it("returns the user when found", async () => {
      userProfileRepository.getUserById.mockResolvedValue(mockUser);

      const user = await userService.getUserByIdAsAdmin(1);

      expect(user).toBe(mockUser);
    });

    it("throws NotFoundError when the user does not exist", async () => {
      userProfileRepository.getUserById.mockResolvedValue(null);

      await expect(userService.getUserByIdAsAdmin(999)).rejects.toMatchObject({
        status: 404,
        error: "NOT_FOUND",
      });
    });
  });
});
