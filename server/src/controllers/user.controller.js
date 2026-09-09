import * as userService from "../services/user.service.js";

export async function getMe(req, res, next) {
  try {
    const user = await userService.getUserProfile(req.user.id);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const user = await userService.updateUserProfile(req.user.id, req.body);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function listUsers(req, res, next) {
  try {
    const users = await userService.listUsers();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserByIdAsAdmin(Number(req.params.id));
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}
