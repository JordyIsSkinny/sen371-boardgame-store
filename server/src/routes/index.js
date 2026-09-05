import { Router } from "express";
import cartRoutes from "./cart.routes.js";
import productRoutes from "./products.routes.js";
import categoryRoutes from "./categories.routes.js";
import orderRoutes from "./orders.routes.js";
import authRoutes from "./auth.routes.js";

const router = Router();

router.use("/cart", cartRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/orders", orderRoutes);
router.use("/auth", authRoutes);
// A: router.use("/products/:productId/reviews", reviewRoutes);
// A: router.use("/reviews", reviewRoutes);

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;