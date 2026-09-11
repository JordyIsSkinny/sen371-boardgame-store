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
    it("returns the repository's paginated result", async () => {
      const paginated = { items: [mockUser], total: 1, page: 1, pageSize: 20 };
      userProfileRepository.getAllUsers.mockResolvedValue(paginated);

      const result = await userService.listUsers({ page: 1, pageSize: 20 });

      expect(result).toBe(paginated);
    });

    it("passes page and pageSize through to the repository", async () => {
      userProfileRepository.getAllUsers.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        pageSize: 10,
      });

      await userService.listUsers({ page: 2, pageSize: 10 });

      expect(userProfileRepository.getAllUsers).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
      });
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
