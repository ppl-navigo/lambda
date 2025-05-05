import prisma from '@/utils/prisma'
import { supabase } from '@/utils/supabase'
import { createHash } from 'node:crypto'

function sha512(content: string) {
    return createHash('sha512').update(content).digest('hex')
}

function verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signatureKey: string,
): boolean {
    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) {
        throw new Error("Server key is not defined")
    }
    return (
        sha512(`${orderId}${statusCode}${grossAmount}${serverKey}`) === signatureKey
    )
}

interface PaymentWebhookPayload {
    order_id: string
    status_code: string
    gross_amount: string
    signature_key: string
    transaction_status: string
    transaction_time: string
    fraud_status: string
    payment_type: string
}

export async function POST(request: Request) {
    const body = await request.json() as PaymentWebhookPayload
    if (!body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
    }
    if (+body.gross_amount <= 0) {
        return new Response(JSON.stringify({ error: "Gross amount must be greater than 0" }), { status: 400 })
    }
    const isValid = verifySignature(
        body.order_id,
        body.status_code,
        body.gross_amount,
        body.signature_key,
    )
    if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 })
    }

    try {
        await prisma.$connect()
        const {
            fraud_status,
            gross_amount,
            order_id,
            payment_type,
            signature_key,
            status_code,
            transaction_status,
            transaction_time,
            ...metadata
        } = body
        const payment = await prisma.payment.create({
            data: {
                currency: "IDR",
                order_id: order_id,
                gross_amount: parseFloat(gross_amount),
                transaction_status: transaction_status,
                transaction_time: new Date(transaction_time).toISOString(),
                signature_key: signature_key,
                payment_type: payment_type,
                metadata: {
                    ...metadata,
                },
                status: transaction_status, // Add required status field
                order: {
                    connect: { order_id: order_id } // Connect to an existing order
                }
            }
        })


        if (
            (body.transaction_status === "capture"
                && body.fraud_status === "accept")
            || body.transaction_status == 'settlement'
        ) {
            const orderId = body.order_id
            const order = await prisma.order.findUnique({
                where: {
                    order_id: orderId
                }
            })
            if (!order) {
                return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 })
            }

            const userId = order.user_id
            await prisma.balance.update({
                where: {
                    user_id: userId
                },
                data: {
                    amount: {
                        increment: parseFloat(gross_amount)
                    },
                }
            })
        }

        return new Response(JSON.stringify({
            message: "Payment success",
            data: {
                ...payment,
            },
        }), { status: 200 })
    }
    catch (error: any) {
        return new Response(JSON.stringify({ error: error.toString() }), { status: 500 })
    }
    finally {
        await prisma.$disconnect()
    }
}