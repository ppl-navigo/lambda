-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}';
