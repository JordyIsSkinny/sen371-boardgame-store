import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
} from './review.controller.js';

import * as reviewService from '../services/review.service.js';

describe('review.controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
    };

    next = vi.fn();

    vi.clearAllMocks();
  });

  describe('getProductReviews', () => {
    it('returns reviews for a product', async () => {
      const reviews = [
        {
          id: 1,
          productId: 10,
          rating: 5,
          comment: 'Great game!',
        },
      ];

      req.params.productId = '10';

      vi.spyOn(reviewService, 'listProductReviews')
        .mockResolvedValue(reviews);

      await getProductReviews(req, res, next);

      expect(reviewService.listProductReviews)
        .toHaveBeenCalledWith(10);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(reviews);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes service errors to next', async () => {
      const error = new Error('Product not found');

      req.params.productId = '10';

      vi.spyOn(reviewService, 'listProductReviews')
        .mockRejectedValue(error);

      await getProductReviews(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createReview', () => {
    it('creates a review for the authenticated user', async () => {
      const review = {
        id: 1,
        userId: 5,
        productId: 10,
        rating: 5,
        comment: 'Excellent game!',
      };

      req.user.id = 5;
      req.params.productId = '10';
      req.body = {
        rating: 5,
        comment: 'Excellent game!',
      };

      vi.spyOn(reviewService, 'submitReview')
        .mockResolvedValue(review);

      await createReview(req, res, next);

      expect(reviewService.submitReview)
        .toHaveBeenCalledWith(
          5,
          10,
          5,
          'Excellent game!'
        );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(review);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes service errors to next', async () => {
      const error = new Error('Review creation failed');

      req.user.id = 5;
      req.params.productId = '10';
      req.body = {
        rating: 5,
        comment: 'Excellent game!',
      };

      vi.spyOn(reviewService, 'submitReview')
        .mockRejectedValue(error);

      await createReview(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateReview', () => {
    it('updates the authenticated user’s review', async () => {
      const review = {
        id: 1,
        userId: 5,
        productId: 10,
        rating: 4,
        comment: 'Updated review.',
      };

      req.user.id = 5;
      req.user.role = 'customer';
      req.params.id = '1';
      req.body = {
        rating: 4,
        comment: 'Updated review.',
      };

      vi.spyOn(reviewService, 'editReview')
        .mockResolvedValue(review);

      await updateReview(req, res, next);

      expect(reviewService.editReview)
        .toHaveBeenCalledWith(
          1,
          5,
          'customer',
          {
            rating: 4,
            comment: 'Updated review.',
          }
        );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(review);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes service errors to next', async () => {
      const error = new Error('Review update failed');

      req.user.id = 5;
      req.user.role = 'customer';
      req.params.id = '1';
      req.body = {
        rating: 4,
        comment: 'Updated review.',
      };

      vi.spyOn(reviewService, 'editReview')
        .mockRejectedValue(error);

      await updateReview(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteReview', () => {
    it('deletes the authenticated user’s review', async () => {
      req.user.id = 5;
      req.user.role = 'customer';
      req.params.id = '1';

      vi.spyOn(reviewService, 'removeReview')
        .mockResolvedValue({ id: 1 });

      await deleteReview(req, res, next);

      expect(reviewService.removeReview)
        .toHaveBeenCalledWith(1, 5, 'customer');

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('passes service errors to next', async () => {
      const error = new Error('Review deletion failed');

      req.user.id = 5;
      req.user.role = 'customer';
      req.params.id = '1';

      vi.spyOn(reviewService, 'removeReview')
        .mockRejectedValue(error);

      await deleteReview(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});