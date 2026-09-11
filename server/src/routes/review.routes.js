import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  getReviewCount,
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";

const productReviewRouter = Router({ mergeParams: true });

productReviewRouter.get("/", getProductReviews);

productReviewRouter.post("/", authenticate, createReview);

const reviewRouter = Router();

// Admin-only, site-wide — S9 dashboard's "Total reviews" stat (#125).
// Ahead of the /:id routes below on principle (same reasoning as
// orders.routes.js's /all before /:id), though there's currently no
// GET /:id to collide with.
reviewRouter.get("/count", authenticate, authorize("admin"), getReviewCount);

reviewRouter.put("/:id", authenticate, updateReview);

reviewRouter.delete("/:id", authenticate, deleteReview);

export { productReviewRouter, reviewRouter };