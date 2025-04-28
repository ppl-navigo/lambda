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
    console.log(
        `verifying signature with orderId: ${orderId}, statusCode: ${statusCode}, grossAmount: ${grossAmount}, serverKey: ${serverKey}`
    )
    if (!serverKey) {
        throw new Error("Server key is not defined")
    }
    console.log(
        `signatureKey: ${signatureKey}`
    )
    console.log(
        `sha512(${orderId}${statusCode}${grossAmount}${serverKey})=`
    )
    console.log(
        sha512(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    )
    return (
        sha512(`${orderId}${statusCode}${grossAmount}${serverKey}`) === signatureKey
    )
}

export async function POST(request: Request) {
    const body = await request.json()
    if (!body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 })
    }
    if (body.gross_amount <= 0) {
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
    if (
        (body.transaction_status === "capture"
            && body.fraud_status === "accept")
        || body.transaction_status == 'settlement'
    ) {
        const { data, error } = await supabase.from("payments").insert({
            order_id: body.order_id,
            gross_amount: +body?.gross_amount || 0,
            transaction_status: body.transaction_status,
            transaction_time: body.transaction_time,
            signature_key: body.signature_key,
            payment_type: body.payment_type,
        }).select("*")

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500 })
        }
        // const { data: userBalance, error: userBalanceError } = await supabase
        //     .from("balance")
        //     .select("*")
        //     .eq("user_email", body.email)
        // if (userBalance && userBalance.length > 0) {
        //     // increase balance
        //     const { error: balanceError } = await supabase
        //         .from("balance")
        //         .update({
        //             balance: userBalance[0].balance + body.gross_amount,
        //         })
        //         .eq("user_email", body.email)
        //     if (balanceError) {
        //         return new Response(JSON.stringify({ error: balanceError.message }), { status: 500 })
        //     }
        // }
        // if (error || userBalanceError) {
        //     return new Response(JSON.stringify({ error: error?.message ?? userBalanceError?.message }), { status: 500 })
        // }
        // if (!data || !userBalance) {
        //     return new Response(JSON.stringify({ error: "Failed to insert payment" }), { status: 500 })
        // }
        return new Response(JSON.stringify({
            message: "Payment success",
            data: {
                ...(data?.[0] ? data[0] : {}),
                // balance: userBalance[0].balance + body.gross_amount,
            },
        }), { status: 200 })
    }
}