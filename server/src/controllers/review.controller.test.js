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
     const result = { 
      items: [ 
        { id: 1, 
          productId: 10, 
          rating: 5, 
          comment: 'Great game!', 
        },
       ],
        total: 1, 
        page: 1, 
        pageSize: 10, }; 
        
        req.params.productId = '10'; 
        req.query = {}; 
        
        vi.spyOn(reviewService, 'listProductReviews')
         .mockResolvedValue(result); 
         
         await getProductReviews(req, res, next); 
         
         expect(reviewService.listProductReviews) 
         .toHaveBeenCalledWith(10, { 
          page: 1, 
          pageSize: 10, }); 
          
          expect(res.status).toHaveBeenCalledWith(200); 
          expect(res.json).toHaveBeenCalledWith({ 
            data: result.items, 
            meta: { 
              page: 1, 
              limit: 10, 
              total: 1, 
              totalPages: 1, 
            },
           }); 
           expect(next).not.toHaveBeenCalled(); 
          });

    it('passes service errors to next', async () => {
      const error = new Error('Product not found');

      req.params.productId = '10';
      req.query = {};

      vi.spyOn(reviewService, 'listProductReviews')
        .mockRejectedValue(error);

      await getProductReviews(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('createReview', () => {
    it('passes service errors to next', async () => {
  const error = new Error('Product not found');

  req.params.productId = '10';
  req.query = {};

  vi.spyOn(reviewService, 'listProductReviews')
    .mockRejectedValue(error);

  await getProductReviews(req, res, next);

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
      expect(res.json).toHaveBeenCalledWith({
  data: review,
});
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