import { Router } from "express";
import cartRoutes from "./cart.routes.js";

// Every route in the system mounts here, under /api/v1, matching the API
// Design section from Milestone 1. Each member adds their own router file
// the same way cart.routes.js is added, then mounts it below, one line.

const router = Router();

router.use("/cart", cartRoutes);

// D: router.use("/auth", authRoutes);
// C: router.use("/products", productRoutes);
// C: router.use("/categories", categoryRoutes);
// C: router.use("/orders", orderRoutes);
// A: router.use("/products/:productId/reviews", reviewRoutes);  // or nested inside product routes
// A: router.use("/reviews", reviewRoutes);                       // for PATCH/DELETE /reviews/:id

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
