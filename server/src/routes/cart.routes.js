import { Router } from "express";
import { authenticateStub } from "../middleware/auth.stub.js";
import * as cartController from "../controllers/cart.controller.js";

// Endpoint ownership (Milestone 2, Section 2): B owns all four cart routes.
// authenticateStub occupies the auth slot until D's real middleware lands
// Tuesday; swapping it out should be a one-line import change here, that's
// the whole point of keeping auth behind a single middleware boundary.

const router = Router();

router.use(authenticateStub);

router.get("/", cartController.getCart);
router.post("/items", cartController.addItem);
router.patch("/items/:id", cartController.updateItem);
router.delete("/items/:id", cartController.removeItem);

export default router;
