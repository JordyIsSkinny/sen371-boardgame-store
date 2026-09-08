import * as userProfileRepository from "../repositories/user-profile.repository.js";
import NotFoundError from "../errors/not-found-error.js";

export async function getUserProfile(userId) {
  const user = await userProfileRepository.getUserById(userId);
  if (!user) {
    throw new NotFoundError("User not found.");
  }
  return user;
}

export async function updateUserProfile(userId, data) {
  return userProfileRepository.updateUser(userId, data);
}

export async function listUsers() {
  return userProfileRepository.getAllUsers();
}

export async function getUserByIdAsAdmin(id) {
  const user = await userProfileRepository.getUserById(id);
  if (!user) {
    throw new NotFoundError("User not found.");
  }
  return user;
}
