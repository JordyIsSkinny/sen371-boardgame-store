import {
  listProductReviews,
  submitReview,
  editReview,
  removeReview,
} from '../services/review.service.js';

export async function getProductReviews(req, res, next) {
  try {
    const productId = Number(req.params.productId);

    const reviews = await listProductReviews(productId);

    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
}

export async function createReview(req, res, next) {
  try {
    const userId = req.user.id;
    const productId = Number(req.params.productId);
    const { rating, comment } = req.body;

    const review = await submitReview(
      userId,
      productId,
      rating,
      comment
    );

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
}

export async function updateReview(req, res, next) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const reviewId = Number(req.params.id);
    const { rating, comment } = req.body;

    const review = await editReview(
      reviewId,
      userId,
      role,
      {
        rating,
        comment,
      }
    );

    res.status(200).json(review);
  } catch (error) {
    next(error);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const reviewId = Number(req.params.id);

    await removeReview(reviewId, userId, role);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}