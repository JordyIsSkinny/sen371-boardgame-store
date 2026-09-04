import {
  getReviewsByProduct,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  hasPurchasedProduct,
} from '../repositories/review.repository.js';

import { getProductById } from '../repositories/product.repository.js';

import ValidationError from '../errors/validation-error.js';
import NotFoundError from '../errors/not-found-error.js';
import ForbiddenError from '../errors/forbidden-error.js';

export async function listProductReviews(productId) {
  const product = await getProductById(productId);

  if (!product) {
    throw new NotFoundError('Product not found.');
  }

  return getReviewsByProduct(productId);
}
export async function submitReview(userId, productId, rating, comment) {
  const product = await getProductById(productId);

  if (!product) {
    throw new NotFoundError('Product not found.');
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be an integer between 1 and 5.');
  }

  const purchased = await hasPurchasedProduct(userId, productId);

  if (!purchased) {
    throw new ForbiddenError(
      'You can only review products you have purchased.'
    );
  }

  return createReview({
    userId,
    productId,
    rating,
    comment,
  });
}
export async function editReview(reviewId, userId, data) {
  const review = await getReviewById(reviewId);

  if (!review) {
    throw new NotFoundError('Review not found.');
  }

  if (review.userId !== userId) {
    throw new ForbiddenError(
      'You can only update your own reviews.'
    );
  }

  if (data.rating !== undefined) {
    if (
      !Number.isInteger(data.rating) ||
      data.rating < 1 ||
      data.rating > 5
    ) {
      throw new ValidationError(
        'Rating must be an integer between 1 and 5.'
      );
    }
  }

  return updateReview(reviewId, userId, data);
}

export async function removeReview(reviewId, userId) {
  const review = await getReviewById(reviewId);

  if (!review) {
    throw new NotFoundError('Review not found.');
  }

  if (review.userId !== userId) {
    throw new ForbiddenError(
      'You can only delete your own reviews.'
    );
  }

  return deleteReview(reviewId, userId);
}