-- AlterTable
ALTER TABLE "products" ADD COLUMN     "average_rating" DECIMAL(2,1),
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;