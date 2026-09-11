import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate, updateUserSchema, userIdSchema, userQuerySchema } from "../middleware/validate.js";
import * as userController from "../controllers/user.controller.js";

const router = Router();

router.get("/me", authenticate, userController.getMe);

router.put(
  "/me",
  authenticate,
  validate({ body: updateUserSchema }),
  userController.updateMe,
);

router.get(
  "/",
  authenticate,
  authorize("admin"),
  validate({ query: userQuerySchema }),
  userController.listUsers,
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validate({ params: userIdSchema }),
  userController.getUserById,
);

export default router;
