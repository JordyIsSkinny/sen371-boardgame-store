import { Router } from "express";
import { authenticate } from "../middleware/authenticate.stub.js";
import { authorize } from "../middleware/authorize.stub.js";
import * as cartController from "../controllers/cart.controller.js";

// Endpoint ownership (Milestone 2, Section 2): B owns all four cart routes.
// Per D's RBAC application table: authenticate -> authorize('customer',
// 'admin'). Both middleware are stubs owned by D, replace ASAP; the import
// paths here are the only thing that should need to change.

const router = Router();

router.use(authenticate);
router.use(authorize("customer", "admin"));

router.get("/", cartController.getCart);
router.post("/items", cartController.addItem);
router.patch("/items/:id", cartController.updateItem);
router.delete("/items/:id", cartController.removeItem);

export default router;
