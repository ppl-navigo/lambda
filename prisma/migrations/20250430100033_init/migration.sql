-- CreateTable
CREATE TABLE "payments" (
    "payment_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_time" TIMESTAMP(3) NOT NULL,
    "order_id" TEXT NOT NULL,
    "gross_amount" DOUBLE PRECISION NOT NULL,
    "payment_type" TEXT NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);
