-- Added for #165: every address now records who it's for and how to reach
-- them, since a delivery address without a recipient name or phone number
-- is functionally incomplete.
--
-- Backfilled with a temporary default rather than failing outright if this
-- table already has rows (the dev database almost certainly does, from
-- earlier manual testing) - then the default is dropped immediately after,
-- so the columns end up exactly as declared in schema.prisma (required,
-- no @default): every future insert must supply both explicitly, which the
-- application already guarantees via createAddressSchema.
ALTER TABLE "addresses" ADD COLUMN "full_name" VARCHAR(255) NOT NULL DEFAULT 'Unknown';
ALTER TABLE "addresses" ADD COLUMN "phone" VARCHAR(20) NOT NULL DEFAULT '0000000000';

ALTER TABLE "addresses" ALTER COLUMN "full_name" DROP DEFAULT;
ALTER TABLE "addresses" ALTER COLUMN "phone" DROP DEFAULT;