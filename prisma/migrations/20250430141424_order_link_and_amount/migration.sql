/*
  Warnings:

  - Added the required column `amount` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_link` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "payment_link" TEXT NOT NULL;
