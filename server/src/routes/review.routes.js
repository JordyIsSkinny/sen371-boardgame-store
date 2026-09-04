import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";

import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";

const productReviewRouter = Router({ mergeParams: true });

productReviewRouter.get("/", getProductReviews);

productReviewRouter.post("/", authenticate, createReview);

const reviewRouter = Router();

reviewRouter.put("/:id", authenticate, updateReview);

reviewRouter.delete("/:id", authenticate, deleteReview);

export { productReviewRouter, reviewRouter };