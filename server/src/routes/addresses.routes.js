import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import * as addressController from "../controllers/address.controller.js";
import { validate, createAddressSchema } from "../middleware/validate.js";

const router = Router();

router.use(authenticate);
router.use(authorize("customer", "admin"));

router.get("/", addressController.getAddresses);
router.post("/", validate({ body: createAddressSchema }), addressController.createAddress);

export default router;
