import { Router } from "express";
import cartRoutes from "./cart.routes.js";
import addressRoutes from "./addresses.routes.js";
import productRoutes from "./products.routes.js";
import categoryRoutes from "./categories.routes.js";
import orderRoutes from "./orders.routes.js";
import {
  productReviewRouter,
  reviewRouter,
} from "./review.routes.js";
import authRoutes from "./auth.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import userRoutes from "./users.routes.js";
import paymentRoutes from "./payments.routes.js";
import healthRoutes from "./health.routes.js";

const router = Router();

router.use("/cart", cartRoutes);
router.use("/addresses", addressRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/orders", orderRoutes);
router.use("/auth", authRoutes);
router.use("/products/:productId/reviews", productReviewRouter);
router.use("/reviews", reviewRouter);
router.use("/inventory", inventoryRoutes);
router.use("/users", userRoutes);
router.use("/payments", paymentRoutes);
router.use("/health", healthRoutes);

export default router;