import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import {
  validate,
  productIdParamSchema,
  updateInventorySchema,
} from "../middleware/validate.js";
import * as inventoryController from "../controllers/inventory.controller.js";

const router = Router();

router.get(
  "/:productId",
  authenticate,
  authorize("admin"),
  validate({ params: productIdParamSchema }),
  inventoryController.getInventory,
);

router.put(
  "/:productId",
  authenticate,
  authorize("admin"),
  validate({ params: productIdParamSchema, body: updateInventorySchema }),
  inventoryController.updateInventory,
);

export default router;
