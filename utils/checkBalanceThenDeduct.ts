import { checkOrCreateBalance } from "./checkOrCreateBalance";
import prisma from "./prisma";

export async function checkBalanceThenDeduct(userId: string, amount: number) {
    try {
        const balance = await checkOrCreateBalance(userId);
        await prisma.$connect();
        if (balance.amount < amount) {
            throw new Error("Insufficient balance");
        }
        const updatedBalance = await prisma.balance.update({
            where: {
                user_id: userId,
            },
            data: {
                amount: {
                    decrement: amount,
                },
            },
        });
        return updatedBalance;
    } catch (error) {
    }
    finally {
        await prisma.$disconnect();
    }
}