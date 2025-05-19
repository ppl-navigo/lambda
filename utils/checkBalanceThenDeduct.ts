import { checkOrCreateBalance } from "./checkOrCreateBalance";
import prisma from "./prisma";
import { v4 as uuidv4 } from 'uuid';

export async function checkBalanceThenDeduct(userId: string, amount: number) {
    try {
        const balance = await checkOrCreateBalance(userId);
        await prisma.$connect();
        if (balance.amount < amount) {
            throw new Error("Insufficient balance");
        }
        console.log(userId, amount);
        console.log("Balance is sufficient, proceeding with deduction");
        const orderId = `deduction_${userId}_${uuidv4()}`;
        const result = await prisma.$transaction([
            prisma.balance.update({
                where: {
                    user_id: userId,
                },
                data: {
                    amount: {
                        decrement: amount,
                    },
                },
            }),
            prisma.payment.create({
                data: {
                    currency: "IDR",
                    gross_amount: amount,
                    status: "settlement",
                    payment_type: "deduction",
                    transaction_time: new Date(),
                    transaction_status: "settlement",
                    signature_key: "",
                    order_id: orderId,
                    order: {
                        create: {
                            order_id: orderId,
                            amount: amount,
                            user_id: userId,
                            payment_link: "",
                        },
                    },
                }
            })
        ])
        console.log("Deduction successful:", result);
        return result;
    } catch (error) {
        console.error("Error checking balance or deducting amount:", error);
        throw new Error(`Error checking balance: ${error}`);
    }
    finally {
        await prisma.$disconnect();
    }
}