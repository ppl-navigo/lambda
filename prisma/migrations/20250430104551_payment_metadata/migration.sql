/*
  Warnings:

  - Added the required column `signature_key` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transaction_status` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "signature_key" TEXT NOT NULL,
ADD COLUMN     "transaction_status" TEXT NOT NULL;
