-- AlterTable
ALTER TABLE "products" ADD COLUMN     "average_rating" DECIMAL(2,1),
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;

-- Backfill: without this, any product with reviews that already existed
-- before this migration stays averageRating: null / reviewCount: 0 until
-- its next review write happens to trigger a fresh recompute in
-- review.repository.js - the app only ever *maintains* the aggregate going
-- forward, it never *computes* it retroactively. The seed script creates
-- no reviews, so this gap wasn't caught by any test, but a shared
-- environment (this dev database, Render) with real pre-existing reviews
-- would show those products as unrated indefinitely.
UPDATE "products" p
SET
  "average_rating" = sub.avg_rating,
  "review_count" = sub.review_count
FROM (
  SELECT "product_id", AVG("rating") AS avg_rating, COUNT(*) AS review_count
  FROM "reviews"
  GROUP BY "product_id"
) AS sub
WHERE p."id" = sub."product_id";