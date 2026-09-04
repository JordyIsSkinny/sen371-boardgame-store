import { Router } from "express";
import cartRoutes from "./cart.routes.js";
import productRoutes from "./products.routes.js";
import categoryRoutes from "./categories.routes.js";
import orderRoutes from "./orders.routes.js";
import {
  productReviewRouter,
  reviewRouter,
} from "./review.routes.js";

const router = Router();

router.use("/cart", cartRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/orders", orderRoutes);
// D: router.use("/auth", authRoutes);
router.use("/products/:productId/reviews", productReviewRouter);
router.use("/reviews", reviewRouter);

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;